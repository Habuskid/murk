/**
 * Active Celo network integration service.
 *
 * Development defaults to Celo Sepolia. Mainnet must be selected explicitly
 * through NEXT_PUBLIC_MURK_NETWORK=mainnet.
 */

import {
  createPublicClient,
  hexToBigInt,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem"
import { CandidateAsset } from "../core/types"
import {
  CELO_CHAIN,
  CELO_CHAIN_ID,
  CELO_DEFAULT_RPC_URL,
  CELO_TOKENS,
} from "../config/celo-network"

export { CELO_CHAIN_ID, CELO_TOKENS }

export const CELO_RPC_URL =
  process.env.CELO_RPC_URL || CELO_DEFAULT_RPC_URL

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
])

export function getCeloClient() {
  return createPublicClient({
    chain: CELO_CHAIN,
    transport: http(CELO_RPC_URL),
  })
}

export async function getAgentPortfolio(
  agentAddress: `0x${string}`,
  allowedSymbols: string[] = ["USDC", "USDT"],
  minimumReserves: Record<string, bigint> = {}
): Promise<CandidateAsset[]> {
  const client = getCeloClient()
  const portfolio: CandidateAsset[] = []

  for (const token of Object.values(CELO_TOKENS)) {
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
      console.warn(
        `Could not read balance for ${token.symbol} at ${token.address} on chain ${CELO_CHAIN_ID}:`,
        err
      )
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

export function tokenRawToFeeUnits(
  amountRaw: bigint,
  tokenDecimals: number
): bigint {
  if (tokenDecimals > 18) {
    throw new Error("UNSUPPORTED_FEE_CURRENCY_DECIMALS")
  }

  return amountRaw * 10n ** BigInt(18 - tokenDecimals)
}

export async function selectStableFeeCurrency(input: {
  account: Address
  to: Address
  data: Hex
  preferredSymbols?: readonly (keyof typeof CELO_TOKENS)[]
  spendRawBySymbol?: Partial<Record<keyof typeof CELO_TOKENS, bigint>>
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

      const spendRaw = input.spendRawBySymbol?.[symbol] ?? 0n
      if (balance <= spendRaw) continue

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
        balance - spendRaw,
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
