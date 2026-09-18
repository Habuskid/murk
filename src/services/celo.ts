/**
 * Celo Mainnet Integration Service
 * Manages RPC connection, token balance reads, and agent signing.
 */

import {
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
} from "viem"
import { celo } from "viem/chains"
import { privateKeyToAccount } from "viem/accounts"
import { CandidateAsset } from "../core/types"

export const CELO_CHAIN_ID = 42220
export const CELO_RPC_URL = process.env.CELO_RPC_URL || "https://forno.celo.org"

// Official verified contracts on Celo Mainnet
export const CELO_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`,
    decimals: 6,
  },
} as const

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
])

export function getCeloClient() {
  return createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  })
}

/**
 * Reads token balances for candidate assets for an agent address.
 */
export async function getAgentPortfolio(
  agentAddress: `0x${string}`,
  allowedSymbols: string[] = ["USDC", "USDT"],
  minimumReserves: Record<string, bigint> = {}
): Promise<CandidateAsset[]> {
  const client = getCeloClient()
  const portfolio: CandidateAsset[] = []

  for (const [key, token] of Object.entries(CELO_TOKENS)) {
    const isAllowed = allowedSymbols.includes(token.symbol)
    const minReserve = minimumReserves[token.symbol] ?? 0n

    try {
      const balance = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [agentAddress],
      })

      portfolio.push({
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        enabled: isAllowed,
        minimumReserveRaw: minReserve,
        walletBalanceRaw: balance,
      })
    } catch (err) {
      console.warn(`Could not read balance for ${token.symbol} at ${token.address}:`, err)
      portfolio.push({
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        enabled: isAllowed,
        minimumReserveRaw: minReserve,
        walletBalanceRaw: 0n,
      })
    }
  }

  return portfolio
}

/**
 * Resolves the server-side agent execution signer.
 * Enforces security boundary: signing material stays strictly on the server.
 */
export function getAgentSigner(privateKeyOverride?: `0x${string}`) {
  const secretKey = privateKeyOverride || (process.env.AGENT_WALLET_PRIVATE_KEY as `0x${string}`)
  if (!secretKey || !secretKey.startsWith("0x")) {
    throw new Error("AGENT_WALLET_PRIVATE_KEY is missing or invalid in server environment")
  }
  return privateKeyToAccount(secretKey)
}
