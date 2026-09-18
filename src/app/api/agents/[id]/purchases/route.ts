import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { CreatePurchaseSchema } from "@/lib/validation"
import { repository, type PurchaseRecord } from "@/db/repository"
import { executePurchaseWorkflow } from "@/services/orchestrator"
import type { SpendingMandate } from "@/core/types"
import { executeApprovedX402Payment } from "@/services/x402-payment"
import { resolveAgentExecutionAddress } from "@/services/agent-wallet"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

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

    const requestHash = purchaseRequestHash({
      agentId: agent.id,
      merchantUrl: validated.merchantUrl,
      resourceUrl: validated.resourceUrl,
    })

    const existing = await repository.getIdempotencyResult(
      validated.idempotencyKey,
      requestHash
    )
    if (existing) {
      return NextResponse.json(existing)
    }

    const purchaseId = `pur_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`
    const now = new Date()

    const purchaseRecord: PurchaseRecord = {
      id: purchaseId,
      agentId: agent.id,
      mandateId: mandate.id,
      merchantUrl: validated.merchantUrl,
      resourceUrl: validated.resourceUrl,
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
      merchantUrl: validated.merchantUrl,
      resourceUrl: validated.resourceUrl,
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

    const responsePayload = {
      purchaseId: result.purchaseId,
      state: result.finalState,
      receipt: result.receipt,
      deliveredResource: result.deliveredResource,
      steps: result.steps,
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
