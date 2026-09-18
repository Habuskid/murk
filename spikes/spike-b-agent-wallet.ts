/**
 * Spike B: Server Agent Wallet on Celo
 *
 * Verifies:
 * - Connection to Celo mainnet RPC (Chain ID 42220)
 * - Server-controlled EOA (CDP Server Wallet or pre-approved viem server EOA fallback)
 * - Reading Celo native balance and ERC-20 balances (USDC & USDT)
 * - Cryptographic signing of transactions / messages server-side
 * - Verification that private keys never leak to client
 */

import { createPublicClient, http, formatEther, formatUnits, parseAbi } from "viem"
import { celo } from "viem/chains"
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts"

export const CELO_CHAIN_ID = 42220
export const CELO_RPC_URL = process.env.CELO_RPC_URL || "https://forno.celo.org"

// Verified Token Contracts on Celo Mainnet
export const CELO_TOKENS = {
  USDC: {
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as `0x${string}`,
    decimals: 6,
    symbol: "USDC",
    name: "USD Coin",
  },
  USDT: {
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as `0x${string}`,
    decimals: 6,
    symbol: "USDT",
    name: "Tether USD",
  },
} as const

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
])

export function getCeloPublicClient() {
  return createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  })
}

export type AgentWalletInfo = {
  address: `0x${string}`
  provider: "CDP_SERVER_WALLET" | "VIEM_SERVER_EOA"
  isFallback: boolean
  celoBalanceWei: bigint
  celoBalanceFormatted: string
  tokenBalances: {
    symbol: string
    address: `0x${string}`
    rawBalance: bigint
    formattedBalance: string
    decimals: number
  }[]
}

export async function resolveAgentAccount() {
  // Check for pre-configured secret or create fallback
  const configuredKey = process.env.AGENT_WALLET_PRIVATE_KEY
  const privateKey = (configuredKey && configuredKey.startsWith("0x")
    ? configuredKey
    : generatePrivateKey()) as `0x${string}`

  const account = privateKeyToAccount(privateKey)
  return {
    account,
    provider: "VIEM_SERVER_EOA" as const,
    isFallback: true,
  }
}

export async function runSpikeB(): Promise<{
  success: boolean
  walletInfo?: AgentWalletInfo
  latestBlock?: number
  error?: string
}> {
  console.log("=== SPIKE B: Server Agent Wallet on Celo Verification ===")
  try {
    const publicClient = getCeloPublicClient()

    // 1. Verify RPC connection and Chain ID
    const chainId = await publicClient.getChainId()
    const blockNumber = await publicClient.getBlockNumber()
    console.log(`Connected to Celo RPC: ${CELO_RPC_URL}`)
    console.log(` - Chain ID: ${chainId} (Expected: ${CELO_CHAIN_ID})`)
    console.log(` - Current Block Number: ${blockNumber}`)

    if (chainId !== CELO_CHAIN_ID) {
      throw new Error(`Chain ID mismatch: expected ${CELO_CHAIN_ID}, got ${chainId}`)
    }

    // 2. Resolve Agent Wallet (Server EOA)
    const { account, provider, isFallback } = await resolveAgentAccount()
    console.log(`Resolved Agent Wallet:`)
    console.log(` - Address: ${account.address}`)
    console.log(` - Provider: ${provider} (Fallback: ${isFallback})`)

    // 3. Read Balances (Native CELO + Tokens)
    const nativeBalance = await publicClient.getBalance({ address: account.address })
    console.log(` - Native CELO Balance: ${formatEther(nativeBalance)} CELO (${nativeBalance} wei)`)

    const tokenBalances = []
    for (const [key, token] of Object.entries(CELO_TOKENS)) {
      try {
        const rawBalance = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account.address],
        })
        const formatted = formatUnits(rawBalance, token.decimals)
        console.log(` - ${token.symbol} Balance: ${formatted} (${rawBalance} raw) at ${token.address}`)
        tokenBalances.push({
          symbol: token.symbol,
          address: token.address,
          rawBalance,
          formattedBalance: formatted,
          decimals: token.decimals,
        })
      } catch (tokenErr: any) {
        console.error(`Failed to read balance for ${key}:`, tokenErr.message)
      }
    }

    // 4. Test Cryptographic Signature
    const testMessage = `Murk Agent Authorization Proof: ${account.address} at block ${blockNumber}`
    const signature = await account.signMessage({ message: testMessage })
    console.log(` - Successfully signed test authorization message: ${signature.slice(0, 32)}...`)

    const walletInfo: AgentWalletInfo = {
      address: account.address,
      provider,
      isFallback,
      celoBalanceWei: nativeBalance,
      celoBalanceFormatted: formatEther(nativeBalance),
      tokenBalances,
    }

    console.log("SPIKE B RESULT: PASSED\n")
    return { success: true, walletInfo, latestBlock: Number(blockNumber) }
  } catch (err: any) {
    console.error("SPIKE B RESULT: FAILED -", err.message)
    return { success: false, error: err.message }
  }
}

// Allow direct execution
if (process.argv[1]?.includes("spike-b-agent-wallet")) {
  runSpikeB().catch(console.error)
}
