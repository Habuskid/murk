import { createHash } from "node:crypto"
import {
  decodeEventLog,
  parseAbi,
  type Hex,
} from "viem"
import { NextRequest, NextResponse } from "next/server"
import { FundAgentSchema } from "@/lib/validation"
import { repository } from "@/db/repository"
import { CELO_TOKENS, getCeloClient } from "@/services/celo"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

const TRANSFER_ABI = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
])

function requestHash(input: {
  userId: string
  agentId: string
  assetSymbol: string
  amountRaw: string
  txHash: string
}): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { owner, agent } = await requireOwnedAgent(req, id)
    const body = await req.json()
    const validated = FundAgentSchema.parse(body)

    const userWallet = await repository.findUserWallet(owner.userId)
    if (!userWallet || !owner.walletAddress) {
      return NextResponse.json(
        { error: "PORTAL_WALLET_NOT_READY" },
        { status: 409 }
      )
    }

    const token =
      CELO_TOKENS[validated.assetSymbol as keyof typeof CELO_TOKENS]

    if (!token) {
      return NextResponse.json(
        { error: "UNSUPPORTED_SETTLEMENT_ASSET" },
        { status: 400 }
      )
    }

    const hash = requestHash({
      userId: owner.userId,
      agentId: agent.id,
      assetSymbol: validated.assetSymbol,
      amountRaw: validated.amountRaw,
      txHash: validated.txHash,
    })

    const claim = await repository.claimIdempotencyKey({
      key: validated.idempotencyKey,
      operation: "FUND_AGENT",
      resourceId: agent.id,
      requestHash: hash,
      resultReference: validated.txHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    if (claim.status === "REPLAY") {
      return NextResponse.json(claim.result)
    }
    if (claim.status === "CONFLICT") {
      return NextResponse.json(
        { error: "IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_REQUEST" },
        { status: 409 }
      )
    }
    if (claim.status === "IN_PROGRESS") {
      return NextResponse.json(
        { error: "IDEMPOTENCY_REQUEST_IN_PROGRESS" },
        { status: 409 }
      )
    }

    const client = getCeloClient()

    let receipt
    try {
      receipt = await client.getTransactionReceipt({
        hash: validated.txHash as Hex,
      })
    } catch {
      return NextResponse.json(
        {
          error: "FUNDING_TX_NOT_CONFIRMED",
          txHash: validated.txHash,
          fundsMoved: false,
        },
        { status: 409 }
      )
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        {
          error: "FUNDING_TX_REVERTED",
          txHash: validated.txHash,
          fundsMoved: false,
        },
        { status: 409 }
      )
    }

    const expectedFrom = owner.walletAddress.toLowerCase()
    const expectedTo = agent.walletAddress.toLowerCase()
    const expectedAmount = BigInt(validated.amountRaw)

    let verifiedTransfer = false

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== token.address.toLowerCase()) {
        continue
      }

      try {
        const decoded = decodeEventLog({
          abi: TRANSFER_ABI,
          data: log.data,
          topics: log.topics,
        })

        if (decoded.eventName !== "Transfer") continue

        const from = decoded.args.from.toLowerCase()
        const to = decoded.args.to.toLowerCase()
        const value = decoded.args.value

        if (
          from === expectedFrom &&
          to === expectedTo &&
          value === expectedAmount
        ) {
          verifiedTransfer = true
          break
        }
      } catch {
        continue
      }
    }

    if (!verifiedTransfer) {
      return NextResponse.json(
        {
          error: "FUNDING_TRANSFER_MISMATCH",
          txHash: validated.txHash,
          fundsMoved: false,
        },
        { status: 409 }
      )
    }

    await repository.saveTransaction({
      id: `tx_fund_${validated.txHash.slice(2, 18)}`,
      walletId: userWallet.id,
      purpose: "FUND_AGENT",
      chainId: 42220,
      txHash: validated.txHash,
      assetAddress: token.address,
      amountRaw: expectedAmount,
      fromAddress: owner.walletAddress,
      toAddress: agent.walletAddress,
      status: "CONFIRMED",
      submittedAt: new Date(),
      confirmedAt: new Date(),
      blockNumber: receipt.blockNumber,
    })

    if (agent.status === "DRAFT") {
      agent.status = "ACTIVE"
      agent.updatedAt = new Date()
      await repository.saveAgent(agent)
    }

    const responsePayload = {
      confirmed: true,
      fundsMoved: true,
      txHash: validated.txHash,
      assetSymbol: validated.assetSymbol,
      amountRaw: validated.amountRaw,
      agentStatus: agent.status,
    }

    await repository.saveIdempotencyResult({
      key: validated.idempotencyKey,
      operation: "FUND_AGENT",
      resourceId: agent.id,
      requestHash: hash,
      resultReference: validated.txHash,
      result: responsePayload,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    return NextResponse.json(responsePayload)
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    const message =
      error instanceof Error ? error.message : "Funding verification failed"

    if (message === "IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_REQUEST") {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
