import { NextRequest, NextResponse } from "next/server"
import { WithdrawAgentSchema } from "@/lib/validation"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

/**
 * Withdrawal is intentionally fail-closed until the authenticated
 * embedded-user-wallet signing flow is wired and verified on Celo mainnet.
 *
 * Returning a synthetic success here would create false financial evidence.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ownerId = repository.getDemoUserId()
    const agent = repository.findAgentById(params.id, ownerId)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const body = await req.json()
    WithdrawAgentSchema.parse(body)

    return NextResponse.json(
      {
        error: "LIVE_USER_WALLET_WITHDRAWAL_NOT_INTEGRATED",
        message: "Withdrawal requires the verified email-authenticated embedded wallet signing flow.",
        fundsMoved: false,
      },
      { status: 501 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Withdrawal failed" }, { status: 400 })
  }
}
