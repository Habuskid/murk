/**
 * Spike C: Live external x402 challenge verification.
 *
 * Passes only when:
 * - the Celo facilitator is reachable and declares Celo mainnet support, and
 * - an independent external resource returns a real x402 402 challenge that
 *   Murk can parse into at least one Celo payment requirement.
 *
 * No simulated merchant body is accepted as spike evidence.
 */

import { requestResource } from "../src/services/x402"

export const X402_FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://api.x402.celo.org"

export async function runSpikeC(): Promise<{
  success: boolean
  facilitatorHealth?: unknown
  supportedKinds?: unknown
  merchantRequirements?: unknown
  error?: string
}> {
  console.log("=== SPIKE C: Live external x402 verification ===")

  try {
    const probeUrl = process.env.X402_PROBE_RESOURCE_URL
    if (!probeUrl) {
      throw new Error(
        "X402_PROBE_RESOURCE_URL is required and must point to an independent x402-protected resource"
      )
    }

    const healthRes = await fetch(`${X402_FACILITATOR_URL}/health`)
    if (!healthRes.ok) {
      throw new Error(`Facilitator health check failed: HTTP ${healthRes.status}`)
    }
    const healthData = await healthRes.json()

    const supportedRes = await fetch(`${X402_FACILITATOR_URL}/supported`)
    if (!supportedRes.ok) {
      throw new Error(`Facilitator /supported failed: HTTP ${supportedRes.status}`)
    }
    const supportedData = await supportedRes.json()
    const kinds = Array.isArray(supportedData?.kinds) ? supportedData.kinds : []

    const hasCelo = kinds.some(
      (kind: { network?: string }) => kind.network === "eip155:42220"
    )
    if (!hasCelo) {
      throw new Error("Configured facilitator does not declare eip155:42220 support")
    }

    const merchant = await requestResource(probeUrl)
    if (merchant.type !== "PAYMENT_REQUIRED") {
      throw new Error("Configured probe resource did not return HTTP 402")
    }
    if (merchant.requirements.length === 0) {
      throw new Error("External merchant returned no supported Celo payment requirements")
    }

    console.log(
      `Verified external 402 with ${merchant.requirements.length} Celo requirement(s) from ${probeUrl}`
    )
    console.log("SPIKE C RESULT: PASSED\n")

    return {
      success: true,
      facilitatorHealth: healthData,
      supportedKinds: kinds,
      merchantRequirements: merchant.requirements.map((item) => ({
        scheme: item.scheme,
        network: item.network,
        assetAddress: item.assetAddress,
        amountRaw: item.amountRaw.toString(),
        payTo: item.payTo,
      })),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("SPIKE C RESULT: FAILED -", message)
    return { success: false, error: message }
  }
}

if (process.argv[1]?.includes("spike-c-x402-purchase")) {
  runSpikeC().catch(console.error)
}
