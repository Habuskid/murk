import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { authErrorResponse, requireAuthenticatedOwner } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const owner = await requireAuthenticatedOwner(req)
    const purchase = repository.getPurchaseById(id)

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const agent = repository.findAgentById(purchase.agentId, owner.userId)
    if (!agent) {
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
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
