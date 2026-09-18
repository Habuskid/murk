import { createHash } from "node:crypto"
import {
  createWalletClient,
  encodeFunctionData,
  http,
  parseAbi,
} from "viem"
import { celo } from "viem/chains"
import { NextRequest, NextResponse } from "next/server"
import { WithdrawAgentSchema } from "@/lib/validation"
import { repository } from "@/db/repository"
import { CELO_RPC_URL, CELO_TOKENS, getCeloClient } from "@/services/celo"
import { resolveAgentViemAccount } from "@/services/agent-wallet"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"
import {
  appendMurkAttribution,
  verifyMurkAttribution,
} from "@/services/attribution"

export const dynamic = "force-dynamic"

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
])

function requestHash(input: {
  userId: string
  agentId: string
  assetSymbol: string
  amountRaw: string
  destination: string
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
    const validated = WithdrawAgentSchema.parse(body)

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

    const amountRaw = BigInt(validated.amountRaw)
    const hash = requestHash({
      userId: owner.userId,
      agentId: agent.id,
      assetSymbol: validated.assetSymbol,
      amountRaw: validated.amountRaw,
      destination: owner.walletAddress,
    })

    const replay = await repository.getIdempotencyResult(
      validated.idempotencyKey,
      hash
    )
    if (replay) {
      return NextResponse.json(replay)
    }

    const publicClient = getCeloClient()
    const balance = await publicClient.readContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [agent.walletAddress],
    })

    if (amountRaw >= balance) {
      return NextResponse.json(
        {
          error: "WITHDRAWAL_MUST_LEAVE_FEE_BALANCE",
          message:
            "Leave a small token balance so Celo can charge the withdrawal gas in the same fee currency.",
        },
        { status: 400 }
      )
    }

    const account = resolveAgentViemAccount(agent.id)

    if (account.address.toLowerCase() !== agent.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "AGENT_WALLET_DERIVATION_MISMATCH" },
        { status: 503 }
      )
    }

    const claim = await repository.claimIdempotencyKey({
      key: validated.idempotencyKey,
      operation: "WITHDRAW_AGENT",
      resourceId: agent.id,
      requestHash: hash,
      resultReference: `withdrawal:${validated.idempotencyKey}`,
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

    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http(CELO_RPC_URL),
    })

    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [owner.walletAddress, amountRaw],
    })

    const txHash = await walletClient.sendTransaction({
      to: token.address,
      data: appendMurkAttribution(transferData),
      feeCurrency: token.address,
    })

    const transactionId = `tx_withdraw_${txHash.slice(2, 18)}`

    await repository.saveTransaction({
      id: transactionId,
      walletId: agent.walletId,
      purpose: "WITHDRAW_AGENT",
      chainId: 42220,
      txHash,
      assetAddress: token.address,
      amountRaw,
      fromAddress: agent.walletAddress,
      toAddress: owner.walletAddress,
      status: "SUBMITTED",
      submittedAt: new Date(),
    })

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 60_000,
    })

    if (receipt.status !== "success") {
      await repository.saveTransaction({
        id: transactionId,
        walletId: agent.walletId,
        purpose: "WITHDRAW_AGENT",
        chainId: 42220,
        txHash,
        assetAddress: token.address,
        amountRaw,
        fromAddress: agent.walletAddress,
        toAddress: owner.walletAddress,
        status: "REVERTED",
        submittedAt: new Date(),
        confirmedAt: new Date(),
        blockNumber: receipt.blockNumber,
        errorCode: "WITHDRAWAL_REVERTED",
      })

      return NextResponse.json(
        {
          error: "WITHDRAWAL_REVERTED",
          txHash,
          fundsMoved: false,
        },
        { status: 409 }
      )
    }

    await repository.saveTransaction({
      id: transactionId,
      walletId: agent.walletId,
      purpose: "WITHDRAW_AGENT",
      chainId: 42220,
      txHash,
      assetAddress: token.address,
      amountRaw,
      fromAddress: agent.walletAddress,
      toAddress: owner.walletAddress,
      status: "CONFIRMED",
      submittedAt: new Date(),
      confirmedAt: new Date(),
      blockNumber: receipt.blockNumber,
    })

    const attribution = await verifyMurkAttribution(txHash).catch((error) => {
      console.error("ERC-8021 attribution verification failed", {
        txHash,
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        configuredCode: process.env.CELO_ATTRIBUTION_CODE || null,
        verified: false,
        observedCodes: [] as string[],
      }
    })

    const responsePayload = {
      confirmed: true,
      fundsMoved: true,
      txHash,
      assetSymbol: validated.assetSymbol,
      amountRaw: validated.amountRaw,
      destinationAddress: owner.walletAddress,
      attribution,
    }

    await repository.saveIdempotencyResult({
      key: validated.idempotencyKey,
      operation: "WITHDRAW_AGENT",
      resourceId: agent.id,
      requestHash: hash,
      resultReference: txHash,
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
      error instanceof Error ? error.message : "Withdrawal failed"

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
