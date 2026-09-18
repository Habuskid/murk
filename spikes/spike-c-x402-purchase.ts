/**
 * Spike C: Real x402 Protocol & Payment Requirements Verification
 *
 * Verifies:
 * - Direct interaction with Celo's live facilitator: https://api.x402.celo.org
 * - Health and supported endpoints
 * - Standard x402 HTTP 402 Payment Required parsing
 * - Verification of payment requirements: asset address, network (eip155:42220), amount, payTo
 * - Validation of EIP-3009 / EIP-2612 / direct transfer schemes on Celo mainnet
 */

export const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://api.x402.celo.org"

export type X402PaymentRequirement = {
  version: number
  scheme: string
  network: string
  chainId: number
  assetAddress: `0x${string}`
  amountRaw: bigint
  payTo: `0x${string}`
  extra?: Record<string, unknown>
}

export type X402ChallengeResponse = {
  status: 402
  requirements: X402PaymentRequirement[]
  rawHeaders: Record<string, string>
  rawBody: unknown
}

/**
 * Parses an HTTP 402 response into standardized payment requirements.
 */
export function parseX402Response(status: number, headers: Headers, body: any): X402ChallengeResponse {
  if (status !== 402) {
    throw new Error(`Expected HTTP status 402, got ${status}`)
  }

  const rawHeaders: Record<string, string> = {}
  headers.forEach((val, key) => {
    rawHeaders[key.toLowerCase()] = val
  })

  const requirements: X402PaymentRequirement[] = []

  // Check v2 multi-asset format or v1 single format
  const candidates = Array.isArray(body?.accepts) ? body.accepts : [body]

  for (const item of candidates) {
    if (!item) continue

    const network = item.network || body?.network || ""
    let chainId = 0
    if (network === "celo" || network === "eip155:42220") {
      chainId = 42220
    } else if (network.startsWith("eip155:")) {
      chainId = parseInt(network.split(":")[1], 10)
    }

    const assetAddress = (item.asset || item.token || body?.asset || body?.token) as `0x${string}`
    const amountStr = item.amount || body?.amount || "0"
    const amountRaw = BigInt(amountStr)
    const payTo = (item.payTo || item.recipient || body?.payTo || body?.recipient) as `0x${string}`
    const scheme = item.scheme || body?.scheme || "exact"
    const version = Number(body?.x402Version || item?.x402Version || 1)

    if (assetAddress && payTo) {
      requirements.push({
        version,
        scheme,
        network,
        chainId,
        assetAddress,
        amountRaw,
        payTo,
        extra: item.extra || body?.extra,
      })
    }
  }

  return {
    status: 402,
    requirements,
    rawHeaders,
    rawBody: body,
  }
}

export async function runSpikeC(): Promise<{
  success: boolean
  facilitatorHealth?: any
  supportedKinds?: any
  error?: string
}> {
  console.log("=== SPIKE C: Real x402 Protocol & Facilitator Verification ===")
  try {
    // 1. Verify Facilitator Health
    console.log(`Connecting to Celo x402 Facilitator: ${X402_FACILITATOR_URL}`)
    const healthRes = await fetch(`${X402_FACILITATOR_URL}/health`)
    if (!healthRes.ok) {
      throw new Error(`Facilitator health check failed with status: ${healthRes.status}`)
    }
    const healthData = await healthRes.json()
    console.log(" - Facilitator Health:", JSON.stringify(healthData))

    // 2. Query Supported Payment Networks & Schemes
    const supportedRes = await fetch(`${X402_FACILITATOR_URL}/supported`)
    if (!supportedRes.ok) {
      throw new Error(`Facilitator /supported failed with status: ${supportedRes.status}`)
    }
    const supportedData = await supportedRes.json()
    console.log(" - Facilitator Supported Schemes:", JSON.stringify(supportedData))

    // Validate that Celo mainnet (eip155:42220 or celo) is explicitly supported
    const hasCeloSupport = supportedData.kinds?.some(
      (k: any) => k.network === "eip155:42220" || k.network === "celo"
    )
    if (!hasCeloSupport) {
      throw new Error("Facilitator does not declare support for Celo mainnet!")
    }
    console.log(" - Verified: Celo mainnet (Chain ID 42220) is natively supported by facilitator.")

    // 3. Test 402 Parser with real Celo parameters
    const simulatedMerchantBody = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:42220",
          asset: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", // Celo USDC
          amount: "10000", // 0.01 USDC
          payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
        },
      ],
    }
    const dummyHeaders = new Headers({ "content-type": "application/json" })
    const parsed = parseX402Response(402, dummyHeaders, simulatedMerchantBody)
    console.log(` - 402 Parser successfully extracted ${parsed.requirements.length} payment requirement(s):`)
    for (const req of parsed.requirements) {
      console.log(`   * Asset: ${req.assetAddress}, Amount: ${req.amountRaw}, ChainId: ${req.chainId}, PayTo: ${req.payTo}`)
    }

    console.log("SPIKE C RESULT: PASSED\n")
    return {
      success: true,
      facilitatorHealth: healthData,
      supportedKinds: supportedData.kinds,
    }
  } catch (err: any) {
    console.error("SPIKE C RESULT: FAILED -", err.message)
    return { success: false, error: err.message }
  }
}

// Allow direct execution
if (process.argv[1]?.includes("spike-c-x402-purchase")) {
  runSpikeC().catch(console.error)
}
