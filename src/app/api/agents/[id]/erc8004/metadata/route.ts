import { NextResponse } from "next/server"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const agent = await repository.findAgentById(id)

    if (!agent) {
      return NextResponse.json(
        { error: "Agent identity not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        type: "Agent",
        name: agent.name,
        description:
          "Autonomous spending agent operating inside a human-defined local-currency spending authority on Celo.",
        endpoints: [
          {
            type: "wallet",
            address: agent.walletAddress,
            chainId: 42220,
          },
        ],
        supportedTrust: [],
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    )
  } catch {
    return NextResponse.json(
      { error: "Agent identity metadata unavailable" },
      { status: 503 }
    )
  }
}
