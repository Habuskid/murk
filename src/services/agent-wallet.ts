/**
 * Server-side autonomous agent execution wallet.
 *
 * Each Murk agent gets a deterministic, isolated EOA derived from one protected
 * server master secret and the immutable agent ID.
 *
 * The derivation uses HMAC-SHA256 as a keyed PRF. The master secret and derived
 * signing key never reach the browser or database.
 */

import { createHmac } from "node:crypto"
import { privateKeyToAccount } from "viem/accounts"
import type { ClientEvmSigner } from "@x402/evm"

function getMasterSecret(): Buffer {
  const value = process.env.AGENT_WALLET_MASTER_SECRET?.trim()
  if (!value) {
    throw new Error("AGENT_WALLET_MASTER_SECRET is not configured")
  }

  const normalized = value.startsWith("0x") ? value.slice(2) : value
  if (!/^[a-fA-F0-9]{64}$/.test(normalized)) {
    throw new Error(
      "AGENT_WALLET_MASTER_SECRET must be exactly 32 random bytes encoded as hex"
    )
  }

  return Buffer.from(normalized, "hex")
}

function deriveAgentPrivateKey(agentId: string): `0x${string}` {
  if (!agentId || !/^[a-zA-Z0-9_-]+$/.test(agentId)) {
    throw new Error("INVALID_AGENT_ID_FOR_WALLET_DERIVATION")
  }

  const digest = createHmac("sha256", getMasterSecret())
    .update(`murk:celo:agent:v1:${agentId}`, "utf8")
    .digest("hex")

  return `0x${digest}` as `0x${string}`
}

export async function resolveAgentExecutionWallet(agentId: string): Promise<{
  address: `0x${string}`
  provider: "VIEM_DERIVED_AGENT_EOA"
  x402Signer: ClientEvmSigner
}> {
  const account = privateKeyToAccount(deriveAgentPrivateKey(agentId))

  return {
    address: account.address,
    provider: "VIEM_DERIVED_AGENT_EOA",
    x402Signer: account,
  }
}

export async function resolveAgentExecutionAddress(
  agentId: string
): Promise<`0x${string}`> {
  const wallet = await resolveAgentExecutionWallet(agentId)
  return wallet.address
}
