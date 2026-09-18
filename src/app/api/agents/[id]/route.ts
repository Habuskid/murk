import { NextRequest, NextResponse } from "next/server"
import { UpdateAgentSchema } from "@/lib/validation"
import { repository, MandateRecord } from "@/db/repository"
import { resolveAgentExecutionAddress } from "@/services/agent-wallet"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

async function syncLiveAddress(agentId: string) {
  const agent = await repository.findAgentById(agentId)
  if (!agent) throw new Error("AGENT_NOT_FOUND")

  const liveAddress = await resolveAgentExecutionAddress(agent.id)
  if (liveAddress.toLowerCase() !== agent.walletAddress.toLowerCase()) {
    agent.walletAddress = liveAddress
    agent.updatedAt = new Date()
    await repository.saveAgent(agent)
  }

  return agent
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { agent: ownedAgent } = await requireOwnedAgent(req, id)
    const agent = await syncLiveAddress(ownedAgent.id)
    const mandate = await repository.getLatestMandate(agent.id)

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      accountingCurrency: agent.accountingCurrency,
      timezone: agent.timezone,
      walletAddress: agent.walletAddress,
      erc8004AgentId: agent.erc8004AgentId,
      allowedAssets: agent.allowedAssets,
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
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { agent } = await requireOwnedAgent(req, id)
    const body = await req.json()
    const validated = UpdateAgentSchema.parse(body)

    if (validated.name) agent.name = validated.name
    if (validated.allowedAssets) agent.allowedAssets = validated.allowedAssets

    agent.updatedAt = new Date()
    await repository.saveAgent(agent)

    if (validated.dailyLimitMinor || validated.perPurchaseLimitMinor) {
      const current = await repository.getLatestMandate(agent.id)
      const nextVersion = (current?.version || 0) + 1

      const newMandate: MandateRecord = {
        id: `man_${agent.id}_v${nextVersion}`,
        agentId: agent.id,
        version: nextVersion,
        dailyLimitMinor: validated.dailyLimitMinor
          ? BigInt(validated.dailyLimitMinor)
          : current?.dailyLimitMinor || 0n,
        perPurchaseLimitMinor: validated.perPurchaseLimitMinor
          ? BigInt(validated.perPurchaseLimitMinor)
          : current?.perPurchaseLimitMinor || 0n,
        accountingCurrency: agent.accountingCurrency,
        status: current?.status || "ACTIVE",
        spentTodayMinor: current?.spentTodayMinor || 0n,
        reservedTodayMinor: current?.reservedTodayMinor || 0n,
        effectiveFrom: new Date(),
        supersededAt: null,
        createdAt: new Date(),
      }
      await repository.createMandate(newMandate)
    }

    return NextResponse.json({
      success: true,
      id: agent.id,
      name: agent.name,
      status: agent.status,
      accountingCurrency: agent.accountingCurrency,
      allowedAssets: agent.allowedAssets,
    })
  } catch (error) {
    const mapped = authErrorResponse(error)
    if (mapped.status !== 500) {
      return NextResponse.json(mapped.body, { status: mapped.status })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 }
    )
  }
}
