/**
 * Spike A: Embedded user wallet verification.
 *
 * This spike cannot truthfully prove an email OTP browser flow from a headless
 * Node process. It therefore validates only recorded evidence captured from the
 * real Murk browser flow and fails closed when that evidence is absent.
 *
 * Required manual evidence:
 * - successful CDP email OTP sign-in in Murk
 * - embedded EVM EOA created by CDP
 * - address captured from the authenticated session
 * - a Celo message/transaction signature initiated through the embedded wallet
 * - wallet export/recovery flow verified to stay inside the provider-isolated UI
 *
 * Record the verified address and evidence reference in environment variables
 * only after completing the real browser flow.
 */

import { isAddress } from "viem"
import { getCeloPublicClient, CELO_CHAIN_ID } from "./spike-b-agent-wallet"

export type UserWalletSpikeResult = {
  provider: "CDP_EMBEDDED_WALLET"
  eoaAddress: `0x${string}`
  chainId: number
  evidenceReference: string
  exportSecurityVerified: true
}

export async function runSpikeA(): Promise<{
  success: boolean
  result?: UserWalletSpikeResult
  error?: string
}> {
  console.log("=== SPIKE A: Embedded User Wallet Verification ===")

  try {
    const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID
    const verifiedAddress = process.env.CDP_USER_WALLET_VERIFIED_ADDRESS
    const evidenceReference = process.env.CDP_USER_WALLET_EVIDENCE_REFERENCE
    const exportVerified = process.env.CDP_USER_WALLET_EXPORT_VERIFIED === "true"

    if (!projectId) {
      throw new Error("NEXT_PUBLIC_CDP_PROJECT_ID is not configured")
    }

    if (!verifiedAddress || !isAddress(verifiedAddress)) {
      throw new Error(
        "CDP_USER_WALLET_VERIFIED_ADDRESS is missing. Complete the real email OTP browser flow first."
      )
    }

    if (!evidenceReference) {
      throw new Error(
        "CDP_USER_WALLET_EVIDENCE_REFERENCE is missing. Record the real browser signing evidence."
      )
    }

    if (!exportVerified) {
      throw new Error(
        "CDP_USER_WALLET_EXPORT_VERIFIED must only be set to true after manually verifying the provider-isolated export/recovery flow."
      )
    }

    const publicClient = getCeloPublicClient()
    const chainId = await publicClient.getChainId()
    if (chainId !== CELO_CHAIN_ID) {
      throw new Error(`Chain ID mismatch: expected ${CELO_CHAIN_ID}, got ${chainId}`)
    }

    const result: UserWalletSpikeResult = {
      provider: "CDP_EMBEDDED_WALLET",
      eoaAddress: verifiedAddress as `0x${string}`,
      chainId,
      evidenceReference,
      exportSecurityVerified: true,
    }

    console.log(`Verified embedded wallet evidence for ${verifiedAddress}`)
    console.log("SPIKE A RESULT: PASSED\n")
    return { success: true, result }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("SPIKE A RESULT: FAILED -", message)
    return { success: false, error: message }
  }
}

if (process.argv[1]?.includes("spike-a-user-wallet")) {
  runSpikeA().catch(console.error)
}
