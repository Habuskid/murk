import { NextRequest, NextResponse } from "next/server"
import { withX402 } from "@x402/next"
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
} from "@x402/core/server"
import { ExactEvmScheme } from "@x402/evm/exact/server"
import { isAddress } from "viem"
import {
  CELO_CAIP2,
  CELO_TOKENS,
  CELO_X402_FACILITATOR_URL,
  IS_CELO_TESTNET,
} from "@/config/celo-network"

export const dynamic = "force-dynamic"

function requireTestnetMerchantConfig() {
  if (!IS_CELO_TESTNET) {
    throw new Error("TESTNET_X402_MERCHANT_DISABLED_ON_MAINNET")
  }

  if (process.env.ENABLE_TESTNET_X402_MERCHANT !== "true") {
    throw new Error("TESTNET_X402_MERCHANT_DISABLED")
  }

  const apiKey = process.env.X402_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("X402_API_KEY_NOT_CONFIGURED")
  }

  const sellerAddress = process.env.TESTNET_X402_SELLER_ADDRESS?.trim()
  if (!sellerAddress || !isAddress(sellerAddress)) {
    throw new Error("TESTNET_X402_SELLER_ADDRESS_INVALID")
  }

  return {
    apiKey,
    sellerAddress: sellerAddress as `0x${string}`,
  }
}

function buildProtectedHandler(input: {
  apiKey: string
  sellerAddress: `0x${string}`
}) {
  const facilitatorClient = new HTTPFacilitatorClient({
    url: CELO_X402_FACILITATOR_URL,
    createAuthHeaders: async () => {
      const headers = { "X-API-Key": input.apiKey }
      return {
        verify: headers,
        settle: headers,
        supported: headers,
      }
    },
  })

  const server = new x402ResourceServer(facilitatorClient)
  server.register(CELO_CAIP2, new ExactEvmScheme())

  const handler = async (_req: NextRequest) => {
    return NextResponse.json({
      testnetHarness: true,
      network: CELO_CAIP2,
      resource: {
        type: "research-note",
        id: "murk-sepolia-paid-resource-v1",
        content:
          "Celo Sepolia x402 settlement confirmed. This resource exists only for Murk engineering verification.",
      },
      deliveredAt: new Date().toISOString(),
    })
  }

  return withX402(
    handler,
    {
      accepts: [
        {
          scheme: "exact",
          network: CELO_CAIP2,
          payTo: input.sellerAddress,
          price: {
            amount: "10000",
            asset: CELO_TOKENS.USDC.address,
            extra: {
              name: "USDC",
              version: "2",
            },
          },
        },
      ],
      description: "Murk Celo Sepolia paid x402 engineering resource",
      mimeType: "application/json",
    },
    server
  )
}

export async function GET(req: NextRequest) {
  try {
    const config = requireTestnetMerchantConfig()
    return await buildProtectedHandler(config)(req)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TESTNET_X402_MERCHANT_FAILED"

    const status =
      message === "TESTNET_X402_MERCHANT_DISABLED" ||
      message === "TESTNET_X402_MERCHANT_DISABLED_ON_MAINNET"
        ? 404
        : 503

    return NextResponse.json(
      {
        error: message,
        testnetHarness: true,
      },
      { status }
    )
  }
}
