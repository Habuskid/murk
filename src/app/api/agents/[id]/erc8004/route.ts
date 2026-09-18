import { z } from "zod"
import type { Hex } from "viem"
import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"
import {
  CELO_CAIP2_NETWORK,
  CELO_CHAIN_ID,
  selectStableFeeCurrency,
} from "@/services/celo"
import {
  buildBindWalletTransaction,
  buildRegisterTransaction,
  CELO_ERC8004_IDENTITY_REGISTRY,
  getErc8004Status,
  parseRegisteredAgent,
  verifyBoundWallet,
} from "@/services/erc8004"

export const dynamic = "force-dynamic"

const TxHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid Celo transaction hash")

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("PREPARE_REGISTER") }),
  z.object({
    action: z.literal("CONFIRM_REGISTER"),
    txHash: TxHashSchema,
  }),
  z.object({ action: z.literal("PREPARE_BIND") }),
  z.object({
    action: z.literal("CONFIRM_BIND"),
    txHash: TxHashSchema,
  }),
])

function getPublicAppOrigin(): string {
  const value = process.env.PUBLIC_APP_ORIGIN?.trim()
  if (!value) {
    throw new Error("PUBLIC_APP_ORIGIN_NOT_CONFIGURED")
  }

  const url = new URL(value)
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("PUBLIC_APP_ORIGIN_MUST_USE_HTTPS")
  }

  return url.origin
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { owner, agent } = await requireOwnedAgent(req, id)

    if (!owner.walletAddress) {
      return NextResponse.json(
        { error: "PORTAL_WALLET_NOT_READY" },
        { status: 409 }
      )
    }

    if (!agent.erc8004AgentId) {
      return NextResponse.json({
        registered: false,
        agentId: null,
        owner: null,
        registeredWallet: null,
        expectedOwner: owner.walletAddress,
        expectedAgentWallet: agent.walletAddress,
        ownerMatches: false,
        walletBound: false,
      })
    }

    const status = await getErc8004Status({
      agentId: BigInt(agent.erc8004AgentId),
      expectedOwner: owner.walletAddress,
      expectedAgentWallet: agent.walletAddress,
    })

    return NextResponse.json(status)
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ERC8004_STATUS_FAILED" },
      { status: 400 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { owner, agent } = await requireOwnedAgent(req, id)

    if (!owner.walletAddress) {
      return NextResponse.json(
        { error: "PORTAL_WALLET_NOT_READY" },
        { status: 409 }
      )
    }

    const userWallet = await repository.findUserWallet(owner.userId)
    if (!userWallet) {
      return NextResponse.json(
        { error: "PORTAL_WALLET_NOT_READY" },
        { status: 409 }
      )
    }

    const action = ActionSchema.parse(await req.json())

    if (action.action === "PREPARE_REGISTER") {
      if (agent.erc8004AgentId) {
        return NextResponse.json(
          {
            error: "ERC8004_ALREADY_REGISTERED",
            agentId: agent.erc8004AgentId,
          },
          { status: 409 }
        )
      }

      const origin = getPublicAppOrigin()
      const agentURI = `${origin}/api/agents/${encodeURIComponent(
        agent.id
      )}/erc8004/metadata`
      const tx = buildRegisterTransaction(agentURI)

      const feeCurrency = await selectStableFeeCurrency({
        account: owner.walletAddress,
        to: tx.to,
        data: tx.data,
      })

      return NextResponse.json({
        chainId: CELO_CAIP2_NETWORK,
        transaction: {
          from: owner.walletAddress,
          to: tx.to,
          data: tx.data,
          value: "0x0",
          ...(feeCurrency ? { feeCurrency } : {}),
        },
        agentURI,
      })
    }

    if (action.action === "CONFIRM_REGISTER") {
      const origin = getPublicAppOrigin()
      const expectedAgentURI = `${origin}/api/agents/${encodeURIComponent(
        agent.id
      )}/erc8004/metadata`

      const registration = await parseRegisteredAgent({
        txHash: action.txHash as Hex,
        expectedOwner: owner.walletAddress,
        expectedAgentURI,
      })

      const discoveredId = registration.agentId.toString()

      if (
        agent.erc8004AgentId &&
        agent.erc8004AgentId !== discoveredId
      ) {
        return NextResponse.json(
          { error: "ERC8004_AGENT_ID_CONFLICT" },
          { status: 409 }
        )
      }

      agent.erc8004AgentId = discoveredId
      agent.updatedAt = new Date()
      await repository.saveAgent(agent)

      await repository.saveTransaction({
        id: `tx_erc8004_register_${action.txHash.slice(2, 18)}`,
        walletId: userWallet.id,
        purpose: "ERC8004_REGISTER",
        chainId: CELO_CHAIN_ID,
        txHash: action.txHash,
        fromAddress: owner.walletAddress,
        toAddress: CELO_ERC8004_IDENTITY_REGISTRY,
        status: "CONFIRMED",
        submittedAt: new Date(),
        confirmedAt: new Date(),
        blockNumber: registration.blockNumber,
      })

      return NextResponse.json({
        confirmed: true,
        agentId: discoveredId,
        owner: registration.owner,
        agentURI: registration.agentURI,
        attribution: registration.attribution,
      })
    }

    if (!agent.erc8004AgentId) {
      return NextResponse.json(
        { error: "ERC8004_NOT_REGISTERED" },
        { status: 409 }
      )
    }

    const agentId = BigInt(agent.erc8004AgentId)

    if (action.action === "PREPARE_BIND") {
      const status = await getErc8004Status({
        agentId,
        expectedOwner: owner.walletAddress,
        expectedAgentWallet: agent.walletAddress,
      })

      if (!status.registered || !status.ownerMatches) {
        return NextResponse.json(
          { error: "ERC8004_OWNER_NOT_VERIFIED", status },
          { status: 409 }
        )
      }

      if (status.walletBound) {
        return NextResponse.json(
          { error: "ERC8004_AGENT_WALLET_ALREADY_BOUND", status },
          { status: 409 }
        )
      }

      const tx = await buildBindWalletTransaction({
        agentInternalId: agent.id,
        agentId,
        owner: owner.walletAddress,
      })

      const feeCurrency = await selectStableFeeCurrency({
        account: owner.walletAddress,
        to: tx.to,
        data: tx.data,
      })

      return NextResponse.json({
        chainId: CELO_CAIP2_NETWORK,
        transaction: {
          from: owner.walletAddress,
          to: tx.to,
          data: tx.data,
          value: "0x0",
          ...(feeCurrency ? { feeCurrency } : {}),
        },
        deadline: tx.deadline.toString(),
        expectedAgentWallet: agent.walletAddress,
      })
    }

    const verified = await verifyBoundWallet({
      txHash: action.txHash as Hex,
      agentId,
      expectedOwner: owner.walletAddress,
      expectedAgentWallet: agent.walletAddress,
    })

    await repository.saveTransaction({
      id: `tx_erc8004_bind_${action.txHash.slice(2, 18)}`,
      walletId: userWallet.id,
      purpose: "ERC8004_BIND_AGENT_WALLET",
      chainId: CELO_CHAIN_ID,
      txHash: action.txHash,
      fromAddress: owner.walletAddress,
      toAddress: CELO_ERC8004_IDENTITY_REGISTRY,
      status: "CONFIRMED",
      submittedAt: new Date(),
      confirmedAt: new Date(),
      blockNumber: verified.blockNumber,
    })

    return NextResponse.json({
      confirmed: true,
      status: verified.status,
      attribution: verified.attribution,
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    const message =
      error instanceof Error ? error.message : "ERC8004_ACTION_FAILED"

    if (
      message === "PUBLIC_APP_ORIGIN_NOT_CONFIGURED" ||
      message === "PUBLIC_APP_ORIGIN_MUST_USE_HTTPS"
    ) {
      return NextResponse.json({ error: message }, { status: 503 })
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
