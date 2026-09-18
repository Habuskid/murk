import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { authErrorResponse, requireOwnedAgent } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { agent } = await requireOwnedAgent(req, params.id)

    agent.status = "ACTIVE"
    agent.updatedAt = new Date()
    repository.saveAgent(agent)

    return NextResponse.json({ success: true, status: agent.status })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
