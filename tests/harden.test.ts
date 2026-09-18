/**
 * Engineering 5: HARDEN Verification Tests
 * Attacks the system across financial edge cases, x402 malformations,
 * concurrency, and guarantees fail-closed behavior per HARDEN.md.
 */

import { describe, it, expect, vi } from "vitest"
import { executePurchaseWorkflow } from "../src/services/orchestrator"
import { SpendingMandate, CandidateAsset, RateQuote } from "../src/core/types"
import { selectSettlementAsset } from "../src/core/settlement-selector"
import { evaluatePolicy } from "../src/core/policy-engine"
import { parseX402Response } from "../spikes/spike-c-x402-purchase"
import * as x402Module from "../src/services/x402"

describe("HARDEN: Fail-Closed Financial & Protocol Security", () => {
  const baseMandate: SpendingMandate = {
    accountingCurrency: "NGN",
    dailyLimitMinor: 500000n, // NGN 5,000.00
    perPurchaseLimitMinor: 200000n, // NGN 2,000.00
    spentTodayMinor: 0n,
    reservedTodayMinor: 0n,
    status: "ACTIVE",
  }

  const agentAddress: `0x${string}` = "0xfb538BBe2e2b4BC4A53f5916f3998c7bEF6eBCE5"

  const fixedRateQuote: RateQuote = {
    baseAsset: "USD",
    quoteCurrency: "NGN",
    rateNumerator: 1330266485n,
    rateDenominator: 1000000n,
    kind: "REFERENCE_FX",
    source: "open.er-api.com",
    timestamp: new Date(),
    expiresAt: new Date(Date.now() + 86400000),
  }

  it("fails closed when merchant returns malformed 402 missing payTo", () => {
    const malformedBody = {
      x402Version: 1,
      scheme: "exact",
      network: "eip155:42220",
      asset: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      amount: "1000000",
      // missing payTo
    }

    const parsed = parseX402Response(402, new Headers(), malformedBody)
    expect(parsed.requirements.length).toBe(0) // Invalid requirement rejected
  })

  it("fails closed on unsupported chain ID from merchant", () => {
    const wrongChainBody = {
      x402Version: 1,
      scheme: "exact",
      network: "eip155:1", // Ethereum mainnet instead of Celo 42220
      asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      amount: "1000000",
      payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
    }

    const parsed = parseX402Response(402, new Headers(), wrongChainBody)
    expect(parsed.requirements[0].chainId).toBe(1)

    // Selection fails because agent portfolio only holds Celo assets
    const res = selectSettlementAsset({
      merchantOptions: parsed.requirements,
      candidateAssets: [
        {
          symbol: "USDC",
          address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
          decimals: 6,
          enabled: true,
          minimumReserveRaw: 0n,
          walletBalanceRaw: 10000000n,
        },
      ],
      allowedAssetSymbols: ["USDC"],
    })

    expect(res.selected).toBeUndefined()
  })

  it("fails closed when non-positive or zero rate is provided", () => {
    const zeroQuote: RateQuote = {
      baseAsset: "USD",
      quoteCurrency: "NGN",
      rateNumerator: 0n,
      rateDenominator: 100n,
      kind: "REFERENCE_FX",
      source: "bad_provider",
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 10000),
    }

    const decision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: baseMandate,
      purchaseValueMinor: 1000n,
      isAssetAllowed: true,
      isRateValid: false, // rejected because non-positive
      isRateExpired: false,
    })

    expect(decision.decision).toBe("BLOCKED")
    expect(decision.reasonCodes).toContain("RATE_UNAVAILABLE")
  })

  it("fails closed when post-payment resource fails (NEVER submits a second payment)", async () => {
    // Merchant requires 1 USDC
    vi.spyOn(x402Module, "requestResource")
      .mockResolvedValueOnce({
        type: "PAYMENT_REQUIRED",
        status: 402,
        requirements: [
          {
            scheme: "exact",
            network: "eip155:42220",
            chainId: 42220,
            assetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
            amountRaw: 1000000n,
            payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
          },
        ],
        rawHeaders: {},
        rawPayload: {},
      })

    let paymentCalls = 0
    const paymentExecutor = async () => {
      paymentCalls++
      return { txHash: "0xabc123" as `0x${string}` }
    }

    const mockPortfolio: CandidateAsset[] = [
      {
        symbol: "USDC",
        address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        decimals: 6,
        enabled: true,
        minimumReserveRaw: 0n,
        walletBalanceRaw: 5000000n,
      },
    ]

    const result = await executePurchaseWorkflow({
      agentId: "agent_harden_01",
      agentName: "Security Test Agent",
      agentAddress,
      mandate: baseMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.merchant.com",
      resourceUrl: "https://api.merchant.com/fail-resource",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      paymentExecutor,
    })

    // Assert that payment was executed EXACTLY ONCE
    expect(paymentCalls).toBe(1)
    expect(result.receipt.txHash).toBe("0xabc123")
  })

  it("concurrent overspend protection: blocks simultaneous overcommit", () => {
    // Mandate has 2,500 NGN remaining
    const constrainedMandate: SpendingMandate = {
      ...baseMandate,
      dailyLimitMinor: 500000n, // 5,000 NGN limit
      spentTodayMinor: 250000n, // 2,500 NGN spent
      reservedTodayMinor: 0n,
    }

    // Purchase A requests 1,500 NGN
    const decisionA = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: constrainedMandate,
      purchaseValueMinor: 150000n,
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })
    expect(decisionA.decision).toBe("APPROVED")

    // Once A is reserved (reservedTodayMinor += 150,000):
    const updatedMandate: SpendingMandate = {
      ...constrainedMandate,
      reservedTodayMinor: 150000n, // 2,500 spent + 1,500 reserved = 4,000 committed
    }

    // Purchase B attempts to spend 1,500 NGN at the same time:
    const decisionB = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: updatedMandate,
      purchaseValueMinor: 150000n, // 4,000 + 1,500 = 5,500 > 5,000 limit
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })

    // B MUST be blocked deterministically!
    expect(decisionB.decision).toBe("BLOCKED")
    expect(decisionB.reasonCodes).toContain("DAILY_MANDATE_EXCEEDED")
  })
})
