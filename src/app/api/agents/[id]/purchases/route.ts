import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { CreatePurchaseSchema } from "@/lib/validation"
import { repository, type PurchaseRecord } from "@/db/repository"
import { executePurchaseWorkflow } from "@/services/orchestrator"
import type { SpendingMandate } from "@/core/types"
import { executeApprovedX402Payment } from "@/services/x402-payment"
import { resolveAgentExecutionAddress } from "@/services/agent-wallet"
import { CELO_CHAIN_ID, CELO_TOKENS, getCeloClient } from "@/services/celo"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"
import { assertAllowedX402Purchase } from "@/lib/resource-policy"

export const dynamic = "force-dynamic"

function purchaseRequestHash(input: {
  agentId: string
  merchantUrl: string
  resourceUrl: string
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { agent } = await requireOwnedAgent(req, id)

    try {
      const liveAddress = await resolveAgentExecutionAddress(agent.id)
      if (liveAddress.toLowerCase() !== agent.walletAddress.toLowerCase()) {
        agent.walletAddress = liveAddress
        agent.updatedAt = new Date()
        await repository.saveAgent(agent)
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "AGENT_WALLET_UNAVAILABLE",
        },
        { status: 503 }
      )
    }

    const mandate = await repository.getLatestMandate(agent.id)
    if (!mandate) {
      return NextResponse.json(
        { error: "No mandate found for agent" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validated = CreatePurchaseSchema.parse(body)

    const approvedResource = assertAllowedX402Purchase({
      merchantUrl: validated.merchantUrl,
      resourceUrl: validated.resourceUrl,
    })

    const requestHash = purchaseRequestHash({
      agentId: agent.id,
      merchantUrl: approvedResource.merchantOrigin,
      resourceUrl: approvedResource.resourceUrl,
    })

    const purchaseId = `pur_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`

    const claim = await repository.claimIdempotencyKey({
      key: validated.idempotencyKey,
      operation: "PURCHASE",
      resourceId: agent.id,
      requestHash,
      resultReference: purchaseId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    if (claim.status === "REPLAY") {
      return NextResponse.json(claim.result)
    }
    if (claim.status === "CONFLICT") {
      return NextResponse.json(
        { error: "IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_REQUEST" },
        { status: 409 }
      )
    }
    if (claim.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "IDEMPOTENCY_REQUEST_IN_PROGRESS" },
        { status: 409 }
      )
    }
    const now = new Date()

    const purchaseRecord: PurchaseRecord = {
      id: purchaseId,
      agentId: agent.id,
      mandateId: mandate.id,
      merchantUrl: approvedResource.merchantOrigin,
      resourceUrl: approvedResource.resourceUrl,
      state: "CREATED",
      accountingCurrency: agent.accountingCurrency,
      createdAt: now,
      updatedAt: now,
    }

    await repository.savePurchase(purchaseRecord)

    const spendingMandate: SpendingMandate = {
      id: mandate.id,
      agentId: agent.id,
      version: mandate.version,
      accountingCurrency: mandate.accountingCurrency,
      dailyLimitMinor: mandate.dailyLimitMinor,
      perPurchaseLimitMinor: mandate.perPurchaseLimitMinor,
      spentTodayMinor: mandate.spentTodayMinor,
      reservedTodayMinor: mandate.reservedTodayMinor,
      status: mandate.status,
    }

    const result = await executePurchaseWorkflow({
      purchaseId,
      agentId: agent.id,
      agentName: agent.name,
      agentAddress: agent.walletAddress,
      agentStatus: agent.status,
      mandate: spendingMandate,
      allowedAssetSymbols: agent.allowedAssets,
      merchantUrl: approvedResource.merchantOrigin,
      resourceUrl: approvedResource.resourceUrl,
      reserveSpend: ({ purchaseId: reservedPurchaseId, amountMinor }) =>
        repository.reserveSpend({
          purchaseId: reservedPurchaseId,
          agentId: agent.id,
          mandateId: mandate.id,
          amountMinor,
        }),
      commitSpend: (committedPurchaseId) =>
        repository.commitSpend(committedPurchaseId),
      releaseSpend: (releasedPurchaseId) =>
        repository.releaseSpend(releasedPurchaseId),
      paymentExecutor: executeApprovedX402Payment,
    })

    purchaseRecord.state = result.finalState
    purchaseRecord.selectedAsset = result.receipt.settlementAsset
    purchaseRecord.settlementAmountRaw = BigInt(
      result.receipt.settlementAmountRaw || "0"
    )
    purchaseRecord.accountingAmountMinor = BigInt(
      result.receipt.accountingValueMinor || "0"
    )
    purchaseRecord.receipt = result.receipt
    purchaseRecord.updatedAt = new Date()

    if (result.finalState === "COMPLETED") {
      purchaseRecord.completedAt = new Date()
    }

    await repository.savePurchase(purchaseRecord)

    let auditEvidenceStatus: "PERSISTED" | "PARTIAL" = "PERSISTED"

    try {
      await repository.savePurchaseEvidence({
        purchase: purchaseRecord,
        mandate,
        evidence: result.evidence,
        deliveredResource: result.deliveredResource,
      })

      const settlementTxHash = result.evidence?.settlementTxHash
      if (settlementTxHash) {
        const celoClient = getCeloClient()
        const [transaction, transactionReceipt] = await Promise.all([
          celoClient.getTransaction({
            hash: settlementTxHash as `0x${string}`,
          }),
          celoClient.getTransactionReceipt({
            hash: settlementTxHash as `0x${string}`,
          }),
        ])

        const selectedToken = Object.values(CELO_TOKENS).find(
          (token) => token?.symbol === result.receipt.settlementAsset
        )

        await repository.saveTransaction({
          id: `tx_x402_${settlementTxHash.slice(2, 18)}`,
          purchaseId,
          walletId: agent.walletId,
          purpose: "X402_PURCHASE",
          chainId: CELO_CHAIN_ID,
          txHash: settlementTxHash,
          assetAddress: selectedToken?.address,
          amountRaw:
            purchaseRecord.settlementAmountRaw &&
            purchaseRecord.settlementAmountRaw > 0n
              ? purchaseRecord.settlementAmountRaw
              : undefined,
          fromAddress: transaction.from,
          toAddress: transaction.to || undefined,
          status:
            transactionReceipt.status === "success" ? "CONFIRMED" : "REVERTED",
          submittedAt: new Date(),
          confirmedAt: new Date(),
          blockNumber: transactionReceipt.blockNumber,
          errorCode:
            transactionReceipt.status === "success"
              ? undefined
              : "X402_SETTLEMENT_REVERTED",
        })
      }
    } catch (auditError) {
      auditEvidenceStatus = "PARTIAL"
      console.error("Purchase audit evidence persistence failed", {
        purchaseId,
        error:
          auditError instanceof Error
            ? auditError.message
            : String(auditError),
      })
    }

    const responsePayload = {
      purchaseId: result.purchaseId,
      state: result.finalState,
      receipt: result.receipt,
      deliveredResource: result.deliveredResource,
      steps: result.steps,
      auditEvidenceStatus,
    }

    await repository.saveIdempotencyResult({
      key: validated.idempotencyKey,
      operation: "PURCHASE",
      resourceId: agent.id,
      requestHash,
      resultReference: purchaseId,
      result: responsePayload,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    return NextResponse.json(responsePayload, { status: 201 })
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    const message =
      error instanceof Error ? error.message : "Purchase initiation failed"

    if (message === "IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_REQUEST") {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
