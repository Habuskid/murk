/**
 * Server-side agent wallet resolution.
 *
 * Preferred path: Coinbase CDP Server Wallet EOA.
 * Pre-approved fallback: one explicitly configured server-side viem EOA.
 *
 * Never generates and discards signing keys.
 */

import { CdpClient } from "@coinbase/cdp-sdk"
import { toClientEvmSigner, type ClientEvmSigner } from "@x402/evm"
import { getAgentSigner } from "./celo"

let cdpClient: CdpClient | null = null

function isCdpServerWalletConfigured(): boolean {
  return Boolean(
    process.env.CDP_API_KEY_ID &&
      process.env.CDP_API_KEY_SECRET &&
      process.env.CDP_WALLET_SECRET
  )
}

function getCdpClient(): CdpClient {
  if (!isCdpServerWalletConfigured()) {
    throw new Error("CDP_SERVER_WALLET_NOT_CONFIGURED")
  }

  if (!cdpClient) {
    cdpClient = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID!,
      apiKeySecret: process.env.CDP_API_KEY_SECRET!,
      walletSecret: process.env.CDP_WALLET_SECRET!,
    })
  }

  return cdpClient
}

function accountNameForAgent(agentId: string): string {
  const safe = agentId.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  return `murk-${safe}`.slice(0, 48)
}

export async function resolveAgentExecutionWallet(agentId: string): Promise<{
  address: `0x${string}`
  provider: "CDP_SERVER_EOA" | "VIEM_SERVER_EOA"
  x402Signer: ClientEvmSigner
}> {
  if (isCdpServerWalletConfigured()) {
    const account = await getCdpClient().evm.getOrCreateAccount({
      name: accountNameForAgent(agentId),
    })

    return {
      address: account.address as `0x${string}`,
      provider: "CDP_SERVER_EOA",
      x402Signer: toClientEvmSigner(account),
    }
  }

  const signer = getAgentSigner()
  return {
    address: signer.address,
    provider: "VIEM_SERVER_EOA",
    x402Signer: signer,
  }
}

export async function resolveAgentExecutionAddress(
  agentId: string
): Promise<`0x${string}`> {
  const wallet = await resolveAgentExecutionWallet(agentId)
  return wallet.address
}
