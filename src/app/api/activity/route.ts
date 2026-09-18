import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { authErrorResponse, requireAuthenticatedOwner } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get("agentId") || undefined

    const activity = repository.listActivityByOwner(owner.userId, agentId)

    return NextResponse.json({
      activity: activity.map((act) => ({
        id: act.id,
        purchaseId: act.purchaseId,
        agentId: act.agentId,
        agentName: act.agentName,
        merchantUrl: act.merchantUrl,
        type: act.type,
        accountingCurrency: act.accountingCurrency,
        accountingAmountFormatted: act.accountingAmountFormatted,
        settlementAsset: act.settlementAsset,
        settlementAmountFormatted: act.settlementAmountFormatted,
        txHash: act.txHash,
        timestamp: act.timestamp.toISOString(),
        reasonDescription: act.reasonDescription,
      })),
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
