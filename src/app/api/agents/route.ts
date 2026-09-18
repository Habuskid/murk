import { NextRequest, NextResponse } from "next/server"
import { CreateAgentSchema } from "@/lib/validation"
import { repository, AgentRecord, MandateRecord, WalletRecord } from "@/db/repository"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const ownerId = repository.getDemoUserId()
  const agents = repository.listAgentsByOwner(ownerId)

  const items = agents.map((a) => {
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
  })

  return NextResponse.json({ agents: items })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = CreateAgentSchema.parse(body)

    const ownerId = repository.getDemoUserId()
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    // Create execution wallet for agent
    const privKey = generatePrivateKey()
    const account = privateKeyToAccount(privKey)

    const wallet: WalletRecord = {
      id: `wal_${agentId}`,
      agentId,
      type: "AGENT",
      address: account.address,
      provider: "VIEM_SERVER_EOA",
      chainId: 42220,
      createdAt: new Date(),
    }
    repository.wallets.set(wallet.id, wallet)

    const agent: AgentRecord = {
      id: agentId,
      ownerUserId: ownerId,
      name: validated.name,
      status: "DRAFT", // New agent starts as DRAFT per E2E.md
      accountingCurrency: validated.accountingCurrency,
      timezone: validated.timezone,
      walletId: wallet.id,
      walletAddress: wallet.address,
      erc8004AgentId: `8004_${agentId}`,
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

    return NextResponse.json(
      {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        accountingCurrency: agent.accountingCurrency,
        walletAddress: agent.walletAddress,
        mandate: {
          version: mandate.version,
          dailyLimitMinor: mandate.dailyLimitMinor.toString(),
          perPurchaseLimitMinor: mandate.perPurchaseLimitMinor.toString(),
        },
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request" }, { status: 400 })
  }
}
