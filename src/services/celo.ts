/**
 * Celo Mainnet Integration Service
 * Manages RPC connection, token balance reads, and agent signing.
 */

import {
  createPublicClient,
  hexToBigInt,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem"
import { celo } from "viem/chains"
import { CandidateAsset } from "../core/types"

export const CELO_CHAIN_ID = 42220
export const CELO_RPC_URL = process.env.CELO_RPC_URL || "https://forno.celo.org"

// Official verified contracts on Celo Mainnet
export const CELO_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    feeCurrencyAddress:
      "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as `0x${string}`,
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`,
    feeCurrencyAddress:
      "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72" as `0x${string}`,
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
 * Celo's eth_gasPrice accepts an optional fee-currency address.
 * For 6-decimal USDC/USDT this must be the allowlisted adapter address.
 */
export async function getFeeCurrencyGasPrice(
  feeCurrency: Address
): Promise<bigint> {
  const client = getCeloClient()
  const priceHex = await client.request({
    method: "eth_gasPrice",
    params: [feeCurrency],
  } as any)

  return hexToBigInt(priceHex as `0x${string}`)
}

/**
 * Convert token raw units into Celo fee-currency accounting units.
 * Fee-currency gas pricing is expressed with 18 decimals.
 */
export function tokenRawToFeeUnits(
  amountRaw: bigint,
  tokenDecimals: number
): bigint {
  if (tokenDecimals > 18) {
    throw new Error("UNSUPPORTED_FEE_CURRENCY_DECIMALS")
  }

  return amountRaw * 10n ** BigInt(18 - tokenDecimals)
}


/**
 * Pick a verified stablecoin fee currency for a human-owned Celo transaction.
 * Returns null when neither configured stablecoin can safely cover gas, allowing
 * the caller to fall back to native CELO.
 */
export async function selectStableFeeCurrency(input: {
  account: Address
  to: Address
  data: Hex
  preferredSymbols?: readonly (keyof typeof CELO_TOKENS)[]
}): Promise<Address | null> {
  const client = getCeloClient()
  const symbols = input.preferredSymbols ?? (["USDC", "USDT"] as const)

  for (const symbol of symbols) {
    const token = CELO_TOKENS[symbol]

    try {
      const balance = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [input.account],
      })

      if (balance <= 0n) continue

      const [estimatedGas, gasPrice] = await Promise.all([
        client.estimateGas({
          account: input.account,
          to: input.to,
          data: input.data,
          feeCurrency: token.feeCurrencyAddress,
        }),
        getFeeCurrencyGasPrice(token.feeCurrencyAddress),
      ])

      const availableFeeUnits = tokenRawToFeeUnits(
        balance,
        token.decimals
      )
      const estimatedFee = estimatedGas * gasPrice

      if (availableFeeUnits > estimatedFee) {
        return token.feeCurrencyAddress
      }
    } catch {
      continue
    }
  }

  return null
}
