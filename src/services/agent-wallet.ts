/**
 * Server-side autonomous agent execution wallet.
 *
 * Murk intentionally keeps the agent wallet separate from the human Portal wallet.
 * The MVP uses one dedicated low-exposure viem EOA stored as a protected server secret.
 *
 * This module must never generate and discard private keys, and the private key must
 * never be returned to the browser.
 */

import type { ClientEvmSigner } from "@x402/evm"
import { getAgentSigner } from "./celo"

export async function resolveAgentExecutionWallet(_agentId: string): Promise<{
  address: `0x${string}`
  provider: "VIEM_SERVER_EOA"
  x402Signer: ClientEvmSigner
}> {
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
