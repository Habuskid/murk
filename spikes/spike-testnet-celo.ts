/**
 * Read-only Celo Sepolia infrastructure smoke test.
 *
 * This gate intentionally spends no funds. It verifies that Murk's configured
 * testnet profile points at live contracts and the Celo Sepolia x402
 * facilitator before we fund any wallet.
 */

import { parseAbi } from "viem"
import {
  CELO_CAIP2,
  CELO_CHAIN_ID,
  CELO_ERC8004_IDENTITY_REGISTRY,
  CELO_TOKENS,
  CELO_X402_FACILITATOR_URL,
  IS_CELO_TESTNET,
} from "../src/config/celo-network"
import { getCeloClient } from "../src/services/celo"

const ERC20_METADATA_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
])

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function assertContract(address: `0x${string}`, label: string) {
  const client = getCeloClient()
  const bytecode = await client.getBytecode({ address })
  assert(bytecode && bytecode !== "0x", `${label} has no bytecode at ${address}`)
}

export async function runCeloSepoliaSmoke(): Promise<{
  success: boolean
  evidence?: Record<string, unknown>
  error?: string
}> {
  console.log("=== CELO SEPOLIA READ-ONLY SMOKE ===")

  try {
    assert(IS_CELO_TESTNET, "Murk must be in testnet mode for this smoke test")
    assert(CELO_CHAIN_ID === 11142220, `Expected Celo Sepolia 11142220, got ${CELO_CHAIN_ID}`)
    assert(CELO_CAIP2 === "eip155:11142220", `Unexpected CAIP-2 network ${CELO_CAIP2}`)

    const client = getCeloClient()
    const chainId = await client.getChainId()
    assert(chainId === CELO_CHAIN_ID, `RPC returned chain ID ${chainId}`)

    await Promise.all([
      assertContract(CELO_TOKENS.USDC.address, "Celo Sepolia USDC"),
      assertContract(CELO_TOKENS.USDT.address, "Celo Sepolia USDT"),
      assertContract(CELO_TOKENS.USDC.feeCurrencyAddress, "USDC fee-currency adapter"),
      assertContract(CELO_TOKENS.USDT.feeCurrencyAddress, "USDT fee-currency adapter"),
      assertContract(CELO_ERC8004_IDENTITY_REGISTRY, "ERC-8004 Identity Registry"),
    ])

    const [usdcSymbol, usdcDecimals, usdtSymbol, usdtDecimals] = await Promise.all([
      client.readContract({
        address: CELO_TOKENS.USDC.address,
        abi: ERC20_METADATA_ABI,
        functionName: "symbol",
      }),
      client.readContract({
        address: CELO_TOKENS.USDC.address,
        abi: ERC20_METADATA_ABI,
        functionName: "decimals",
      }),
      client.readContract({
        address: CELO_TOKENS.USDT.address,
        abi: ERC20_METADATA_ABI,
        functionName: "symbol",
      }),
      client.readContract({
        address: CELO_TOKENS.USDT.address,
        abi: ERC20_METADATA_ABI,
        functionName: "decimals",
      }),
    ])

    assert(usdcDecimals === 6, `Unexpected USDC decimals: ${usdcDecimals}`)
    assert(usdtDecimals === 6, `Unexpected USDT decimals: ${usdtDecimals}`)

    const [healthResponse, supportedResponse] = await Promise.all([
      fetch(`${CELO_X402_FACILITATOR_URL}/health`),
      fetch(`${CELO_X402_FACILITATOR_URL}/supported`),
    ])

    assert(
      healthResponse.ok,
      `Celo Sepolia x402 facilitator health failed: HTTP ${healthResponse.status}`
    )
    assert(
      supportedResponse.ok,
      `Celo Sepolia x402 facilitator supported failed: HTTP ${supportedResponse.status}`
    )

    const health = await healthResponse.json().catch(() => null)
    const supported = await supportedResponse.json().catch(() => null)
    const supportedText = JSON.stringify(supported)

    assert(
      supportedText.includes(CELO_CAIP2),
      `Facilitator does not advertise ${CELO_CAIP2}`
    )

    const blockNumber = await client.getBlockNumber()

    const evidence = {
      chainId,
      caip2: CELO_CAIP2,
      blockNumber: blockNumber.toString(),
      tokens: {
        USDC: {
          address: CELO_TOKENS.USDC.address,
          feeCurrencyAddress: CELO_TOKENS.USDC.feeCurrencyAddress,
          symbol: usdcSymbol,
          decimals: usdcDecimals,
        },
        USDT: {
          address: CELO_TOKENS.USDT.address,
          feeCurrencyAddress: CELO_TOKENS.USDT.feeCurrencyAddress,
          symbol: usdtSymbol,
          decimals: usdtDecimals,
        },
      },
      erc8004IdentityRegistry: CELO_ERC8004_IDENTITY_REGISTRY,
      x402Facilitator: CELO_X402_FACILITATOR_URL,
      facilitatorHealth: health,
    }

    console.log(JSON.stringify(evidence, null, 2))
    console.log("CELO SEPOLIA READ-ONLY SMOKE: PASSED\n")
    return { success: true, evidence }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("CELO SEPOLIA READ-ONLY SMOKE: FAILED -", message)
    return { success: false, error: message }
  }
}

if (process.argv[1]?.includes("spike-testnet-celo")) {
  runCeloSepoliaSmoke().then((result) => {
    if (!result.success) process.exit(1)
  })
}
