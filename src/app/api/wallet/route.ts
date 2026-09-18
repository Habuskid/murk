import { isAddress } from "viem"
import { NextRequest, NextResponse } from "next/server"
import { repository, WalletRecord } from "@/db/repository"
import { authErrorResponse, requireAuthenticatedOwner } from "@/lib/server-auth"
import { CELO_CHAIN_ID } from "@/services/celo"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    const body = await req.json()
    const address = body?.address

    if (typeof address !== "string" || !isAddress(address)) {
      return NextResponse.json({ error: "INVALID_WALLET_ADDRESS" }, { status: 400 })
    }

    await repository.upsertUserWallet({
      id: `wal_user_${owner.userId}`,
      userId: owner.userId,
      type: "USER",
      address: address as `0x${string}`,
      provider: "PRIVY_EMBEDDED",
      chainId: CELO_CHAIN_ID,
      createdAt: new Date(),
    } satisfies WalletRecord)

    return NextResponse.json({
      success: true,
      address,
      provider: "PRIVY_EMBEDDED",
      chainId: CELO_CHAIN_ID,
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}

export async function GET(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    const wallet = await repository.findUserWallet(owner.userId)

    if (!wallet) {
      return NextResponse.json({ wallet: null })
    }

    return NextResponse.json({
      wallet: {
        address: wallet.address,
        provider: wallet.provider,
        chainId: wallet.chainId,
      },
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
