/**
 * Celo network integration.
 *
 * Murk runs the same financial policy code on Celo Sepolia for staging and
 * Celo mainnet for the final deployment. Network-specific addresses live here
 * so changing environments never means changing transaction logic.
 */

import {
  createPublicClient,
  defineChain,
  hexToBigInt,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem"
import { celo } from "viem/chains"
import { CandidateAsset } from "../core/types"

export const CELO_MAINNET_CHAIN_ID = 42220
export const CELO_SEPOLIA_CHAIN_ID = 11142220

function configuredChainId(): typeof CELO_MAINNET_CHAIN_ID | typeof CELO_SEPOLIA_CHAIN_ID {
  const raw = process.env.CELO_CHAIN_ID?.trim() || String(CELO_MAINNET_CHAIN_ID)
  const parsed = Number(raw)

  if (parsed !== CELO_MAINNET_CHAIN_ID && parsed !== CELO_SEPOLIA_CHAIN_ID) {
    throw new Error(`UNSUPPORTED_CELO_CHAIN_ID:${raw}`)
  }

  return parsed
}

export const CELO_CHAIN_ID = configuredChainId()
export const CELO_CAIP2_NETWORK =
  CELO_CHAIN_ID === CELO_SEPOLIA_CHAIN_ID
    ? ("eip155:11142220" as const)
    : ("eip155:42220" as const)

export const IS_CELO_SEPOLIA = CELO_CHAIN_ID === CELO_SEPOLIA_CHAIN_ID

export const CELO_SEPOLIA_RPC_URL =
  "https://forno.celo-sepolia.celo-testnet.org"
export const CELO_MAINNET_RPC_URL = "https://forno.celo.org"

export const CELO_RPC_URL =
  process.env.CELO_RPC_URL ||
  (IS_CELO_SEPOLIA ? CELO_SEPOLIA_RPC_URL : CELO_MAINNET_RPC_URL)

const celoSepolia = defineChain({
  id: CELO_SEPOLIA_CHAIN_ID,
  name: "Celo Sepolia",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CELO_SEPOLIA_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "Celo Sepolia Explorer",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
  testnet: true,
})

export const CELO_CHAIN = IS_CELO_SEPOLIA ? celoSepolia : celo

type CeloTokenSymbol = "USDC" | "USDT"

export type CeloTokenConfig = {
  symbol: CeloTokenSymbol
  name: string
  address: Address
  /**
   * Celo fee-currency adapter. Null means Murk must use native CELO for gas on
   * that network instead of guessing an adapter address.
   */
  feeCurrencyAddress: Address | null
  decimals: number
}

const MAINNET_TOKENS: Record<CeloTokenSymbol, CeloTokenConfig | null> = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    feeCurrencyAddress: "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B",
    decimals: 6,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    feeCurrencyAddress: "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72",
    decimals: 6,
  },
}

const SEPOLIA_TOKENS: Record<CeloTokenSymbol, CeloTokenConfig | null> = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x01C5C0122039549AD1493B8220cABEdD739BC44E",
    // Do not reuse the mainnet adapter on testnet. Until a Sepolia adapter is
    // independently verified, staging transactions pay gas in faucet CELO.
    feeCurrencyAddress: null,
    decimals: 6,
  },
  // Murk's Sepolia golden path is deliberately USDC-only. We do not invent a
  // testnet USDT address merely to preserve a multi-asset UI state.
  USDT: null,
}

export const CELO_TOKENS: Record<
  CeloTokenSymbol,
  CeloTokenConfig | null
> = IS_CELO_SEPOLIA ? SEPOLIA_TOKENS : MAINNET_TOKENS

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

/**
 * Reads token balances for configured candidate assets for an agent address.
 */
export async function getAgentPortfolio(
  agentAddress: `0x${string}`,
  allowedSymbols: string[] = ["USDC", "USDT"],
  minimumReserves: Record<string, bigint> = {}
): Promise<CandidateAsset[]> {
  const client = getCeloClient()
  const portfolio: CandidateAsset[] = []

  for (const token of Object.values(CELO_TOKENS)) {
    if (!token) continue

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
        `Could not read balance for ${token.symbol} at ${token.address}:`,
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
 * Returns null when no verified adapter is configured, allowing native CELO.
 */
export async function selectStableFeeCurrency(input: {
  account: Address
  to: Address
  data: Hex
  preferredSymbols?: readonly CeloTokenSymbol[]
  spendRawBySymbol?: Partial<Record<CeloTokenSymbol, bigint>>
}): Promise<Address | null> {
  const client = getCeloClient()
  const symbols =
    input.preferredSymbols ?? (["USDC", "USDT"] as const)

  for (const symbol of symbols) {
    const token = CELO_TOKENS[symbol]
    if (!token?.feeCurrencyAddress) continue

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
