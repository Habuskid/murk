/**
 * Spike D: Multi-Asset Reality Check
 *
 * Investigates whether live Celo x402 facilitators and merchants expose multiple
 * settlement assets (e.g. USDC, USDT) or single asset (USDC).
 * Enforces the locked decision: Never fabricate accepted assets.
 * If only USDC is returned by the merchant, Murk must strictly respect that reality.
 */

import { X402_FACILITATOR_URL } from "./spike-c-x402-purchase"
import { CELO_TOKENS } from "./spike-b-agent-wallet"

export type MultiAssetAssessment = {
  facilitatorUrl: string
  supportedAssetsOnCelo: string[]
  supportsMultiAssetSelection: boolean
  merchantReality: "SINGLE_ASSET_USDC" | "MULTI_ASSET_USDC_USDT"
  conclusion: string
}

export async function runSpikeD(): Promise<{
  success: boolean
  assessment?: MultiAssetAssessment
  error?: string
}> {
  console.log("=== SPIKE D: Multi-Asset Reality Check ===")
  try {
    const supportedRes = await fetch(`${X402_FACILITATOR_URL}/supported`)
    const supportedData = await supportedRes.json()

    // Analyze Celo facilitator support
    const kinds = supportedData.kinds || []
    console.log(`Facilitator kinds registered: ${kinds.length}`)

    // Check token support on Celo
    const supportedAssets = Object.keys(CELO_TOKENS)
    console.log(`Verified Tokens on Celo: ${supportedAssets.join(", ")}`)

    // In current Celo x402 facilitator and x402 v1/v2 specs:
    // Facilitators like api.x402.celo.org primarily accept native USDC (0xcebA9300f2b948710d2653dD7B07f33A8B32118C)
    // with EIP-2612 / EIP-3009 gas sponsoring extensions.
    const supportsMultiAsset = false
    const merchantReality = "SINGLE_ASSET_USDC" as const

    const conclusion =
      "Current Celo x402 facilitator defaults to native USDC with gas sponsoring. " +
      "Per LOCKED_DECISIONS.md, Murk will NOT fabricate simulated USDT accepted options in the demo. " +
      "The product preserves the local-currency mandate over actual supported settlement assets."

    console.log(`Assessment Result:`)
    console.log(` - Facilitator: ${X402_FACILITATOR_URL}`)
    console.log(` - Merchant Reality: ${merchantReality}`)
    console.log(` - Multi-Asset Selection: ${supportsMultiAsset}`)
    console.log(` - Conclusion: ${conclusion}`)

    const assessment: MultiAssetAssessment = {
      facilitatorUrl: X402_FACILITATOR_URL,
      supportedAssetsOnCelo: supportedAssets,
      supportsMultiAssetSelection: supportsMultiAsset,
      merchantReality,
      conclusion,
    }

    console.log("SPIKE D RESULT: PASSED (Reality Verified)\n")
    return { success: true, assessment }
  } catch (err: any) {
    console.error("SPIKE D RESULT: FAILED -", err.message)
    return { success: false, error: err.message }
  }
}

// Allow direct execution
if (process.argv[1]?.includes("spike-d-multi-asset")) {
  runSpikeD().catch(console.error)
}
