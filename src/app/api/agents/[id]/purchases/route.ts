import { NextRequest, NextResponse } from "next/server"
import { CreatePurchaseSchema } from "@/lib/validation"
import { repository, PurchaseRecord } from "@/db/repository"
import { executePurchaseWorkflow } from "@/services/orchestrator"
import { SpendingMandate } from "@/core/types"
import { executeApprovedX402Payment } from "@/services/x402-payment"

import { resolveAgentExecutionAddress } from "@/services/agent-wallet"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { agent } = await requireOwnedAgent(req, params.id)

    try {
      const liveAddress = await resolveAgentExecutionAddress(agent.id)
      if (liveAddress.toLowerCase() !== agent.walletAddress.toLowerCase()) {
        agent.walletAddress = liveAddress
        agent.updatedAt = new Date()
        repository.saveAgent(agent)
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "AGENT_WALLET_UNAVAILABLE",
        },
        { status: 503 }
      )
    }

    const mandate = repository.getLatestMandate(agent.id)
    if (!mandate) {
      return NextResponse.json({ error: "No mandate found for agent" }, { status: 400 })
    }

    const body = await req.json()
    const validated = CreatePurchaseSchema.parse(body)

    // Idempotency check
    const existing = repository.idempotency.get(validated.idempotencyKey)
    if (existing) {
      return NextResponse.json(existing.result)
    }

    const purchaseId = `pur_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // Initial purchase record
    const purchaseRecord: PurchaseRecord = {
      id: purchaseId,
      agentId: agent.id,
      mandateId: mandate.id,
      merchantUrl: validated.merchantUrl,
      resourceUrl: validated.resourceUrl,
      state: "CREATED",
      accountingCurrency: agent.accountingCurrency,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    repository.savePurchase(purchaseRecord)

    // Execute state machine
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
      mandate: spendingMandate,
      allowedAssetSymbols: agent.allowedAssets,
      merchantUrl: validated.merchantUrl,
      resourceUrl: validated.resourceUrl,
      paymentExecutor: executeApprovedX402Payment,
    })

    // Update purchase record with final outcome
    purchaseRecord.state = result.finalState
    purchaseRecord.selectedAsset = result.receipt.settlementAsset
    purchaseRecord.settlementAmountRaw = BigInt(result.receipt.settlementAmountRaw || 0)
    purchaseRecord.accountingAmountMinor = BigInt(result.receipt.accountingValueMinor || 0)
    purchaseRecord.receipt = result.receipt
    purchaseRecord.updatedAt = new Date()
    if (result.finalState === "COMPLETED") {
      purchaseRecord.completedAt = new Date()
      // Commit spend to mandate
      mandate.spentTodayMinor += purchaseRecord.accountingAmountMinor
    }
    repository.savePurchase(purchaseRecord)

    const responsePayload = {
      purchaseId: result.purchaseId,
      state: result.finalState,
      receipt: result.receipt,
      deliveredResource: result.deliveredResource,
      steps: result.steps,
    }

    repository.idempotency.set(validated.idempotencyKey, {
      result: responsePayload,
      createdAt: new Date(),
    })

    return NextResponse.json(responsePayload, { status: 201 })
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Purchase initiation failed" },
      { status: 400 }
    )
  }
}
