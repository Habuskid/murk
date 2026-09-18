import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Standard x402 Merchant Endpoint
 * Returns real HTTP 402 Payment Required status code with Celo USDC requirements.
 * When payment proof (x-payment) is supplied, delivers the protected resource.
 */
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const paymentProof = req.headers.get("x-payment") || req.headers.get("authorization")

  // If payment proof is supplied, deliver the paid resource!
  if (paymentProof) {
    return NextResponse.json({
      status: "success",
      purchasedItem: params.slug === "expensive-report" ? "Global Macro Agent Research Report" : "Research Dataset Access",
      data: {
        resourceId: `res_${params.slug}_2026`,
        accessGranted: true,
        deliveredAt: new Date().toISOString(),
        content: "Verified paid machine intelligence data delivered over Celo x402 protocol.",
      },
    })
  }

  // Otherwise, return real HTTP 402 Payment Required!
  const isExpensive = params.slug === "expensive-report"
  const amountRaw = isExpensive ? "2000000" : "1000000" // 2 USDC or 1 USDC

  const paymentRequirement = {
    x402Version: 2,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:42220",
        asset: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // Celo Native USDC
        amount: amountRaw,
        payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
      },
    ],
  }

  return new NextResponse(JSON.stringify(paymentRequirement), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `x402 token="USDC", network="eip155:42220", amount="${amountRaw}"`,
    },
  })
}
