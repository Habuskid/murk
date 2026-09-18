/**
 * Spike A: Privy human-wallet verification.
 *
 * This spike deliberately requires manual evidence from the real browser flow.
 * A headless Node process cannot prove the embedded-wallet login/signing UX.
 *
 * Required manual evidence:
 * - Privy login completed in Murk
 * - Privy embedded EVM wallet created/reused
 * - wallet address persisted by Murk
 * - one real Celo signing/transaction flow verified
 */

import { isAddress } from "viem"
import { getCeloPublicClient } from "./spike-b-agent-wallet"
import { CELO_CHAIN_ID } from "../src/config/celo-network"

export type UserWalletSpikeResult = {
  provider: "PRIVY_EMBEDDED"
  eoaAddress: `0x${string}`
  chainId: number
  evidenceReference: string
}

export async function runSpikeA(): Promise<{
  success: boolean
  result?: UserWalletSpikeResult
  error?: string
}> {
  console.log("=== SPIKE A: Privy Human Wallet Verification ===")

  try {
    const verifiedAddress = process.env.USER_WALLET_VERIFIED_ADDRESS
    const evidenceReference = process.env.USER_WALLET_EVIDENCE_REFERENCE

    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not configured")
    }

    if (!process.env.PRIVY_APP_SECRET) {
      throw new Error("PRIVY_APP_SECRET is not configured")
    }

    if (!verifiedAddress || !isAddress(verifiedAddress)) {
      throw new Error(
        "USER_WALLET_VERIFIED_ADDRESS is missing. Complete the real Privy browser flow first."
      )
    }

    if (!evidenceReference) {
      throw new Error(
        "USER_WALLET_EVIDENCE_REFERENCE is missing. Record the real Celo signing evidence."
      )
    }

    const publicClient = getCeloPublicClient()
    const chainId = await publicClient.getChainId()

    if (chainId !== CELO_CHAIN_ID) {
      throw new Error(`Chain ID mismatch: expected ${CELO_CHAIN_ID}, got ${chainId}`)
    }

    const result: UserWalletSpikeResult = {
      provider: "PRIVY_EMBEDDED",
      eoaAddress: verifiedAddress as `0x${string}`,
      chainId,
      evidenceReference,
    }

    console.log(`Verified Privy wallet evidence for ${verifiedAddress}`)
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
