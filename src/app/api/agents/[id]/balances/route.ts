import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { getAgentPortfolio } from "@/services/celo"
import { resolveAgentExecutionAddress } from "@/services/agent-wallet"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { agent } = await requireOwnedAgent(req, id)

    const liveAddress = await resolveAgentExecutionAddress(agent.id)
    if (liveAddress.toLowerCase() !== agent.walletAddress.toLowerCase()) {
      agent.walletAddress = liveAddress
      agent.updatedAt = new Date()
      await repository.saveAgent(agent)
    }

    const portfolio = await getAgentPortfolio(
      agent.walletAddress,
      agent.allowedAssets,
      agent.minimumReserves
    )

    return NextResponse.json({
      balances: portfolio.map((item) => ({
        symbol: item.symbol,
        address: item.address,
        decimals: item.decimals,
        enabled: item.enabled,
        rawBalance: item.walletBalanceRaw.toString(),
        formattedBalance: (
          Number(item.walletBalanceRaw) / 10 ** item.decimals
        ).toFixed(2),
      })),
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Balance read failed" },
      { status: 500 }
    )
  }
}
