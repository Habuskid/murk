import { NextRequest, NextResponse } from "next/server"
import { UpdateAgentSchema } from "@/lib/validation"
import { repository, MandateRecord } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ownerId = repository.getDemoUserId()
  const agent = repository.findAgentById(params.id, ownerId)

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const mandate = repository.getLatestMandate(agent.id)

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
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ownerId = repository.getDemoUserId()
    const agent = repository.findAgentById(params.id, ownerId)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const body = await req.json()
    const validated = UpdateAgentSchema.parse(body)

    if (validated.name) {
      agent.name = validated.name
    }
    if (validated.allowedAssets) {
      agent.allowedAssets = validated.allowedAssets
    }
    agent.updatedAt = new Date()
    repository.saveAgent(agent)

    // If financial policy changes, create a new mandate version per LOCKED_DECISIONS.md
    if (validated.dailyLimitMinor || validated.perPurchaseLimitMinor) {
      const current = repository.getLatestMandate(agent.id)
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
      repository.createMandate(newMandate)
    }

    return NextResponse.json({
      success: true,
      id: agent.id,
      name: agent.name,
      status: agent.status,
      accountingCurrency: agent.accountingCurrency,
      allowedAssets: agent.allowedAssets,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 400 })
  }
}
