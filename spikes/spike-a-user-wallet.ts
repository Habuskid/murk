/**
 * Spike A: Portal embedded user wallet verification.
 *
 * This spike deliberately fails unless the real browser flow has been completed.
 * A headless Node process cannot prove Portal's browser MPC key-share lifecycle,
 * backup UX, or Eject UX.
 *
 * Required manual evidence:
 * - Clerk email OTP sign-in completed in Murk
 * - Portal Web OTP session issued by Murk backend
 * - Portal MPC wallet created/reused in the browser
 * - EVM address registered in Murk
 * - Celo mainnet signing/transaction verified
 * - Portal backup/recovery verified
 * - Portal Eject/private-key portability verified
 */

import { isAddress } from "viem"
import { getCeloPublicClient, CELO_CHAIN_ID } from "./spike-b-agent-wallet"

export type UserWalletSpikeResult = {
  provider: "PORTAL_MPC"
  eoaAddress: `0x${string}`
  chainId: number
  evidenceReference: string
  backupVerified: true
  ejectVerified: true
}

export async function runSpikeA(): Promise<{
  success: boolean
  result?: UserWalletSpikeResult
  error?: string
}> {
  console.log("=== SPIKE A: Portal Embedded Wallet Verification ===")

  try {
    const verifiedAddress = process.env.PORTAL_USER_WALLET_VERIFIED_ADDRESS
    const evidenceReference = process.env.PORTAL_USER_WALLET_EVIDENCE_REFERENCE
    const backupVerified = process.env.PORTAL_USER_WALLET_BACKUP_VERIFIED === "true"
    const ejectVerified = process.env.PORTAL_USER_WALLET_EJECT_VERIFIED === "true"

    if (!process.env.PORTAL_CUSTODIAN_API_KEY) {
      throw new Error("PORTAL_CUSTODIAN_API_KEY is not configured")
    }

    if (!process.env.PORTAL_DEMO_CLIENT_ID) {
      throw new Error("PORTAL_DEMO_CLIENT_ID is not configured")
    }

    if (!verifiedAddress || !isAddress(verifiedAddress)) {
      throw new Error(
        "PORTAL_USER_WALLET_VERIFIED_ADDRESS is missing. Complete the real Portal browser flow first."
      )
    }

    if (!evidenceReference) {
      throw new Error(
        "PORTAL_USER_WALLET_EVIDENCE_REFERENCE is missing. Record the real Celo signing evidence."
      )
    }

    if (!backupVerified) {
      throw new Error(
        "PORTAL_USER_WALLET_BACKUP_VERIFIED must only be true after real backup/recovery verification."
      )
    }

    if (!ejectVerified) {
      throw new Error(
        "PORTAL_USER_WALLET_EJECT_VERIFIED must only be true after verifying Portal Eject/private-key portability."
      )
    }

    const publicClient = getCeloPublicClient()
    const chainId = await publicClient.getChainId()

    if (chainId !== CELO_CHAIN_ID) {
      throw new Error(`Chain ID mismatch: expected ${CELO_CHAIN_ID}, got ${chainId}`)
    }

    const result: UserWalletSpikeResult = {
      provider: "PORTAL_MPC",
      eoaAddress: verifiedAddress as `0x${string}`,
      chainId,
      evidenceReference,
      backupVerified: true,
      ejectVerified: true,
    }

    console.log(`Verified Portal wallet evidence for ${verifiedAddress}`)
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
