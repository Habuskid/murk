import { NextResponse } from "next/server"
import { getCeloClient } from "@/services/celo"
import { getRateQuote } from "@/services/rates"

export const dynamic = "force-dynamic"

export async function GET() {
  const health: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    components: {
      app: "healthy",
      database: "healthy",
      celoRpc: "checking",
      rateProvider: "checking",
    },
  }

  // Check Celo RPC
  try {
    const client = getCeloClient()
    const blockNumber = await client.getBlockNumber()
    health.components.celoRpc = {
      status: "healthy",
      chainId: 42220,
      blockNumber: Number(blockNumber),
    }
  } catch (err: any) {
    health.components.celoRpc = {
      status: "degraded",
      error: err.message,
    }
  }

  // Check Rate Provider
  try {
    const quote = await getRateQuote("NGN", "USD")
    health.components.rateProvider = {
      status: "healthy",
      samplePair: "USD/NGN",
      rate: `${quote.rateNumerator}/${quote.rateDenominator}`,
      timestamp: quote.timestamp.toISOString(),
    }
  } catch (err: any) {
    health.components.rateProvider = {
      status: "degraded",
      error: err.message,
    }
  }

  return NextResponse.json(health)
}
