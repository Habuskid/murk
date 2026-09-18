/**
 * Spike D: Live multi-asset reality check.
 *
 * Multi-asset support is a merchant property, not something Murk may infer from
 * a token registry or facilitator availability. This spike inspects the real
 * external merchant configured in X402_PROBE_RESOURCE_URL.
 */

import { requestResource } from "../src/services/x402"

export type MultiAssetAssessment = {
  resourceUrl: string
  acceptedAssetAddresses: string[]
  requirementCount: number
  supportsMultiAssetSelection: boolean
  conclusion: string
}

export async function runSpikeD(): Promise<{
  success: boolean
  assessment?: MultiAssetAssessment
  error?: string
}> {
  console.log("=== SPIKE D: Live multi-asset reality check ===")

  try {
    const probeUrl = process.env.X402_PROBE_RESOURCE_URL
    if (!probeUrl) {
      throw new Error(
        "X402_PROBE_RESOURCE_URL is required before multi-asset support can be assessed"
      )
    }

    const result = await requestResource(probeUrl)
    if (result.type !== "PAYMENT_REQUIRED") {
      throw new Error("Configured probe resource did not return HTTP 402")
    }

    const addresses = Array.from(
      new Set(result.requirements.map((item) => item.assetAddress.toLowerCase()))
    )
    const supportsMultiAsset = addresses.length > 1

    const conclusion = supportsMultiAsset
      ? "The configured external merchant exposes multiple Celo settlement assets. Murk may demonstrate deterministic selection among only these real options."
      : "The configured external merchant exposes one Celo settlement asset. Murk must not claim multi-asset selection for this merchant."

    const assessment: MultiAssetAssessment = {
      resourceUrl: probeUrl,
      acceptedAssetAddresses: addresses,
      requirementCount: result.requirements.length,
      supportsMultiAssetSelection: supportsMultiAsset,
      conclusion,
    }

    console.log(JSON.stringify(assessment, null, 2))
    console.log("SPIKE D RESULT: PASSED (merchant reality observed)\n")
    return { success: true, assessment }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("SPIKE D RESULT: FAILED -", message)
    return { success: false, error: message }
  }
}

if (process.argv[1]?.includes("spike-d-multi-asset")) {
  runSpikeD().catch(console.error)
}
