/**
 * Spike B: Persistent server agent wallet on Celo.
 *
 * Passes only when Murk can resolve the actual configured execution wallet,
 * read Celo mainnet state for that address, and sign with the same persistent
 * execution identity used by the runtime x402 client.
 */

import { createPublicClient, http, formatEther, formatUnits, parseAbi } from "viem"
import { celo } from "viem/chains"
import { resolveAgentExecutionWallet } from "../src/services/agent-wallet"

export const CELO_CHAIN_ID = 42220
export const CELO_RPC_URL = process.env.CELO_RPC_URL || "https://forno.celo.org"

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
])

export function getCeloPublicClient() {
  return createPublicClient({
    chain: celo,
    transport: http(CELO_RPC_URL),
  })
}

export type AgentWalletInfo = {
  address: `0x${string}`
  provider: "CDP_SERVER_EOA" | "VIEM_SERVER_EOA"
  celoBalanceWei: bigint
  celoBalanceFormatted: string
  tokenBalances: {
    symbol: string
    address: `0x${string}`
    rawBalance: bigint
    formattedBalance: string
    decimals: number
  }[]
  signature: `0x${string}`
}

export async function runSpikeB(): Promise<{
  success: boolean
  walletInfo?: AgentWalletInfo
  latestBlock?: number
  error?: string
}> {
  console.log("=== SPIKE B: Persistent Agent Wallet on Celo ===")

  try {
    const publicClient = getCeloPublicClient()
    const chainId = await publicClient.getChainId()
    const blockNumber = await publicClient.getBlockNumber()

    if (chainId !== CELO_CHAIN_ID) {
      throw new Error(`Chain ID mismatch: expected ${CELO_CHAIN_ID}, got ${chainId}`)
    }

    const executionWallet = await resolveAgentExecutionWallet("spike-agent-wallet")

    const nativeBalance = await publicClient.getBalance({
      address: executionWallet.address,
    })

    const tokenBalances = []
    for (const token of Object.values(CELO_TOKENS)) {
      const rawBalance = await publicClient.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [executionWallet.address],
      })

      tokenBalances.push({
        symbol: token.symbol,
        address: token.address,
        rawBalance,
        formattedBalance: formatUnits(rawBalance, token.decimals),
        decimals: token.decimals,
      })
    }

    const message = `Murk agent wallet verification on Celo block ${blockNumber}`
    const signature = await executionWallet.x402Signer.signMessage({
      message,
    })

    const walletInfo: AgentWalletInfo = {
      address: executionWallet.address,
      provider: executionWallet.provider,
      celoBalanceWei: nativeBalance,
      celoBalanceFormatted: formatEther(nativeBalance),
      tokenBalances,
      signature,
    }

    console.log(`Execution wallet: ${executionWallet.address}`)
    console.log(`Provider: ${executionWallet.provider}`)
    console.log("SPIKE B RESULT: PASSED\n")

    return {
      success: true,
      walletInfo,
      latestBlock: Number(blockNumber),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("SPIKE B RESULT: FAILED -", message)
    return { success: false, error: message }
  }
}

if (process.argv[1]?.includes("spike-b-agent-wallet")) {
  runSpikeB().catch(console.error)
}
