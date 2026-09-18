import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedOwner, authErrorResponse } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    return NextResponse.json({
      authenticated: true,
      userId: owner.userId,
      providerUserId: owner.providerUserId,
      walletAddress: owner.walletAddress || null,
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(
      { authenticated: false, ...mapped.body },
      { status: mapped.status }
    )
  }
}
