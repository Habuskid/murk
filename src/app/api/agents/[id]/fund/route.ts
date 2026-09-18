import { NextRequest, NextResponse } from "next/server"
import { FundAgentSchema } from "@/lib/validation"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

/**
 * Funding remains fail-closed until the authenticated
 * embedded-user-wallet signing flow is verified on Celo mainnet.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await requireOwnedAgent(req, id)
    const body = await req.json()
    FundAgentSchema.parse(body)

    return NextResponse.json(
      {
        error: "LIVE_USER_WALLET_FUNDING_NOT_INTEGRATED",
        message: "Funding requires the verified email-authenticated embedded wallet signing flow.",
        fundsMoved: false,
      },
      { status: 501 }
    )
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Funding failed" },
      { status: 400 }
    )
  }
}
