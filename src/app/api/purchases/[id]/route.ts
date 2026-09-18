import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const purchase = repository.getPurchaseById(params.id)

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
  }

  return NextResponse.json({
    id: purchase.id,
    agentId: purchase.agentId,
    mandateId: purchase.mandateId,
    merchantUrl: purchase.merchantUrl,
    resourceUrl: purchase.resourceUrl,
    state: purchase.state,
    selectedAsset: purchase.selectedAsset,
    settlementAmountRaw: purchase.settlementAmountRaw?.toString() || null,
    accountingCurrency: purchase.accountingCurrency,
    accountingAmountMinor: purchase.accountingAmountMinor?.toString() || null,
    createdAt: purchase.createdAt.toISOString(),
    completedAt: purchase.completedAt?.toISOString() || null,
  })
}
