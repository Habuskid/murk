import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { getAgentPortfolio } from "@/services/celo"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ownerId = repository.getDemoUserId()
  const agent = repository.findAgentById(params.id, ownerId)

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  try {
    const portfolio = await getAgentPortfolio(agent.walletAddress, agent.allowedAssets, agent.minimumReserves)
    const formatted = portfolio.map((p) => ({
      symbol: p.symbol,
      address: p.address,
      decimals: p.decimals,
      enabled: p.enabled,
      rawBalance: p.walletBalanceRaw.toString(),
      formattedBalance: (Number(p.walletBalanceRaw) / 10 ** p.decimals).toFixed(2),
    }))

    return NextResponse.json({ balances: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
