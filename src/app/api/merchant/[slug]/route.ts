import { NextRequest, NextResponse } from "next/server"
import { CELO_CAIP2_NETWORK, CELO_TOKENS } from "@/services/celo"

export const dynamic = "force-dynamic"

/**
 * Development-only x402-shaped fixture.
 *
 * This endpoint exists for parser/UI development only. It is not an independent
 * merchant, it does not verify a real x402 payment with a facilitator, and it
 * must never be used as golden-demo or submission evidence.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (process.env.ENABLE_LOCAL_X402_FIXTURE !== "true") {
    return NextResponse.json(
      {
        error: "Local x402 fixture disabled",
        note: "Configure an independent external x402 resource for runtime purchases.",
      },
      { status: 404 }
    )
  }

  const paymentProof = req.headers.get("x-payment") || req.headers.get("authorization")

  // If payment proof is supplied, deliver the paid resource!
  if (paymentProof) {
    return NextResponse.json({
      fixture: true,
      status: "success",
      purchasedItem: slug === "expensive-report" ? "Global Macro Agent Research Report" : "Research Dataset Access",
      data: {
        resourceId: `res_${slug}_2026`,
        accessGranted: true,
        deliveredAt: new Date().toISOString(),
        content: "Verified paid machine intelligence data delivered over Celo x402 protocol.",
      },
    })
  }

  // Otherwise, return real HTTP 402 Payment Required!
  const isExpensive = slug === "expensive-report"
  const amountRaw = isExpensive ? "2000000" : "1000000" // 2 USDC or 1 USDC

  const usdc = CELO_TOKENS.USDC
  if (!usdc) {
    return NextResponse.json(
      { error: "USDC is not configured for the active Celo network" },
      { status: 503 }
    )
  }

  const paymentRequirement = {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: CELO_CAIP2_NETWORK,
        asset: usdc.address,
        amount: amountRaw,
        payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
      },
    ],
  }

  return new NextResponse(JSON.stringify(paymentRequirement), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `x402 token="USDC", network="${CELO_CAIP2_NETWORK}", amount="${amountRaw}"`,
    },
  })
}
