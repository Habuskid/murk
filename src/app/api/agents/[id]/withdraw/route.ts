import { NextRequest, NextResponse } from "next/server"
import { WithdrawAgentSchema } from "@/lib/validation"
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
    const validated = WithdrawAgentSchema.parse(body)

    // Idempotency check
    const existing = repository.idempotency.get(validated.idempotencyKey)
    if (existing) {
      return NextResponse.json(existing.result)
    }

    const result = {
      success: true,
      agentId: agent.id,
      withdrawnAsset: validated.assetSymbol,
      amountRaw: validated.amountRaw,
      destinationAddress: validated.destinationAddress,
      timestamp: new Date().toISOString(),
    }

    repository.idempotency.set(validated.idempotencyKey, { result, createdAt: new Date() })

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Withdrawal failed" }, { status: 400 })
  }
}
