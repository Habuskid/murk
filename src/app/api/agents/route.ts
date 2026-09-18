import { NextRequest, NextResponse } from "next/server"
import { CreateAgentSchema } from "@/lib/validation"
import { repository, AgentRecord, MandateRecord, WalletRecord } from "@/db/repository"
import { resolveAgentExecutionWallet } from "@/services/agent-wallet"
import { authErrorResponse, requireAuthenticatedOwner } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

function serializeAgent(a: AgentRecord) {
  const mandate = repository.getLatestMandate(a.id)
  return {
    id: a.id,
    name: a.name,
    status: a.status,
    accountingCurrency: a.accountingCurrency,
    timezone: a.timezone,
    walletAddress: a.walletAddress,
    erc8004AgentId: a.erc8004AgentId,
    allowedAssets: a.allowedAssets,
    mandate: mandate
      ? {
          version: mandate.version,
          dailyLimitMinor: mandate.dailyLimitMinor.toString(),
          perPurchaseLimitMinor: mandate.perPurchaseLimitMinor.toString(),
          spentTodayMinor: mandate.spentTodayMinor.toString(),
          reservedTodayMinor: mandate.reservedTodayMinor.toString(),
          status: mandate.status,
        }
      : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    const agents = repository.listAgentsByOwner(owner.userId)
    return NextResponse.json({ agents: agents.map(serializeAgent) })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const owner = await requireAuthenticatedOwner(req)
    const existingAgents = repository.listAgentsByOwner(owner.userId)
    if (existingAgents.length > 0) {
      return NextResponse.json(
        {
          error: "MVP_SINGLE_AGENT_LIMIT",
          message:
            "This hackathon build supports one isolated execution agent per user.",
        },
        { status: 409 }
      )
    }

    const body = await req.json()
    const validated = CreateAgentSchema.parse(body)

    const agentId = `agent_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
    const executionWallet = await resolveAgentExecutionWallet(agentId)

    const wallet: WalletRecord = {
      id: `wal_${agentId}`,
      agentId,
      type: "AGENT",
      address: executionWallet.address,
      provider: executionWallet.provider,
      chainId: 42220,
      createdAt: new Date(),
    }
    repository.wallets.set(wallet.id, wallet)

    const agent: AgentRecord = {
      id: agentId,
      ownerUserId: owner.userId,
      name: validated.name,
      status: "DRAFT",
      accountingCurrency: validated.accountingCurrency,
      timezone: validated.timezone,
      walletId: wallet.id,
      walletAddress: wallet.address,
      erc8004AgentId: undefined,
      allowedAssets: validated.allowedAssets,
      minimumReserves: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    repository.saveAgent(agent)

    const mandate: MandateRecord = {
      id: `man_${agentId}_v1`,
      agentId,
      version: 1,
      dailyLimitMinor: BigInt(validated.dailyLimitMinor),
      perPurchaseLimitMinor: BigInt(validated.perPurchaseLimitMinor),
      accountingCurrency: validated.accountingCurrency,
      status: "ACTIVE",
      spentTodayMinor: 0n,
      reservedTodayMinor: 0n,
      effectiveFrom: new Date(),
      supersededAt: null,
      createdAt: new Date(),
    }
    repository.createMandate(mandate)

    return NextResponse.json(serializeAgent(agent), { status: 201 })
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    )
  }
}
