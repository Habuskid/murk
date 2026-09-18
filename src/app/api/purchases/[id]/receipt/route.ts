import { NextRequest, NextResponse } from "next/server"
import { repository } from "@/db/repository"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const purchase = repository.getPurchaseById(params.id)

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 })
  }

  if (!purchase.receipt) {
    return NextResponse.json({ error: "Receipt not yet generated for this purchase" }, { status: 400 })
  }

  return NextResponse.json({ receipt: purchase.receipt })
}
