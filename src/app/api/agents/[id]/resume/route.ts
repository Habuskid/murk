import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ownerId = repository.getDemoUserId()
  const agent = repository.findAgentById(params.id, ownerId)

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  agent.status = "ACTIVE"
  agent.updatedAt = new Date()
  repository.saveAgent(agent)

  return NextResponse.json({ success: true, status: agent.status })
}
