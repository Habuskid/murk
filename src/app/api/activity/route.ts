import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || undefined

  const activity = repository.listActivity(agentId)

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
}
