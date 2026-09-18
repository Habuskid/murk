import { NextRequest, NextResponse } from "next/server"
import { FundAgentSchema } from "@/lib/validation"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ownerId = repository.getDemoUserId()
    const agent = repository.findAgentById(params.id, ownerId)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const body = await req.json()
    const validated = FundAgentSchema.parse(body)

    // Idempotency check per LOCKED_DECISIONS.md & PERSIST.md
    const existing = repository.idempotency.get(validated.idempotencyKey)
    if (existing) {
      return NextResponse.json(existing.result)
    }

    // Agent transitions from DRAFT to ACTIVE upon successful initial funding per E2E.md
    if (agent.status === "DRAFT") {
      agent.status = "ACTIVE"
      agent.updatedAt = new Date()
      repository.saveAgent(agent)
    }

    const result = {
      success: true,
      agentId: agent.id,
      fundedAsset: validated.assetSymbol,
      amountRaw: validated.amountRaw,
      agentStatus: agent.status,
      timestamp: new Date().toISOString(),
    }

    repository.idempotency.set(validated.idempotencyKey, { result, createdAt: new Date() })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Funding failed" }, { status: 400 })
  }
}
