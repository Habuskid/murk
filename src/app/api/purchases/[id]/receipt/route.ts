import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"
import { authErrorResponse, requireAuthenticatedOwner } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const owner = await requireAuthenticatedOwner(req)
    const purchase = repository.getPurchaseById(id)

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    const agent = repository.findAgentById(purchase.agentId, owner.userId)
    if (!agent) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
    }

    if (!purchase.receipt) {
      return NextResponse.json(
        { error: "Receipt not yet generated for this purchase" },
        { status: 400 }
      )
    }

    return NextResponse.json({ receipt: purchase.receipt })
  } catch (error) {
    const mapped = authErrorResponse(error)
    return NextResponse.json(mapped.body, { status: mapped.status })
  }
}
