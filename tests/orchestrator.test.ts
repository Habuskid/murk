/**
 * Integration & Golden Demo Tests for Agent Orchestrator
 * Verifies Golden Path (Approved) and Blocked Path per GOLDEN_DEMO.md
 */

import { afterEach, describe, it, expect, vi } from "vitest"
import { executePurchaseWorkflow } from "../src/services/orchestrator"
import { SpendingMandate, CandidateAsset, RateQuote } from "../src/core/types"
import * as x402Module from "../src/services/x402"

describe("INTEGRATE & GOLDEN DEMO: Agent Orchestrator", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Demo Persona from GOLDEN_DEMO.md:
  // Agent: Research Agent
  // Accounting currency: NGN
  // Daily mandate: NGN 5,000.00 (500,000 kobo)
  // Per-purchase limit: NGN 2,000.00 (200,000 kobo)
  const goldenMandate: SpendingMandate = {
    accountingCurrency: "NGN",
    dailyLimitMinor: 500000n,
    perPurchaseLimitMinor: 200000n,
    spentTodayMinor: 0n,
    reservedTodayMinor: 0n,
    status: "ACTIVE",
  }

  const agentAddress: `0x${string}` = "0xfb538BBe2e2b4BC4A53f5916f3998c7bEF6eBCE5"

  const mockPortfolio: CandidateAsset[] = [
    {
      symbol: "USDC",
      address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
      decimals: 6,
      enabled: true,
      minimumReserveRaw: 100000n, // 0.1 USDC reserve
      walletBalanceRaw: 5000000n, // 5 USDC available
    },
    {
      symbol: "USDT",
      address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
      decimals: 6,
      enabled: true,
      minimumReserveRaw: 0n,
      walletBalanceRaw: 10000000n, // 10 USDT available
    },
  ]

  // Rate: 1 USD = 1330.266485 NGN
  const fixedRateQuote: RateQuote = {
    baseAsset: "USD",
    quoteCurrency: "NGN",
    rateNumerator: 1330266485n,
    rateDenominator: 1000000n,
    kind: "REFERENCE_FX",
    source: "open.er-api.com",
    timestamp: new Date("2026-09-18T00:00:00Z"),
    expiresAt: new Date(Date.now() + 86400000),
  }

  it("Executes the Golden Success Path end-to-end", async () => {
    // Mock x402 resource returning 402 with 1 USDC requirement
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
      type: "PAYMENT_REQUIRED",
      status: 402,
      requirements: [
        {
          scheme: "exact",
          network: "eip155:42220",
          chainId: 42220,
          assetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
          amountRaw: 1000000n, // 1 USDC
          payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
        },
      ],
      rawHeaders: {},
      rawPayload: {},
    })

    let paymentExecuted = false
    const paymentExecutor = async (params: any) => {
      paymentExecuted = true
      return {
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
        deliveredResource: {
          status: "success",
          resourceId: "fixture_resource_01",
        },
      }
    }

    const result = await executePurchaseWorkflow({
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC", "USDT"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      paymentExecutor,
    })

    // Assertions for Golden Path
    expect(result.finalState).toBe("COMPLETED")
    expect(paymentExecuted).toBe(true)
    expect(result.receipt.policyDecision).toBe("APPROVED")
    expect(result.receipt.settlementAsset).toBe("USDC")
    expect(result.receipt.accountingCurrency).toBe("NGN")

    // 1 USDC * 1330.266485 = 133027 kobo (NGN 1,330.27)
    expect(result.receipt.accountingValueMinor).toBe("133027")
    expect(result.receipt.accountingValueFormatted).toBe("1,330.27")

    // Remaining: 500,000 - 133,027 = 366,973 kobo (NGN 3,669.73)
    expect(result.receipt.remainingMandateMinor).toBe("366973")
    expect(result.receipt.remainingMandateFormatted).toBe("3,669.73")

    expect(result.receipt.txHash).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
    expect(result.receipt.resourceDeliveryStatus).toBe("DELIVERED")
    expect(result.deliveredResource).toBeDefined()
  })

  it("Executes the Blocked Path: per-purchase limit exceeded (ZERO funds moved, ZERO tx)", async () => {
    // Attempt to buy a service costing 2 USDC (~NGN 2,660.53)
    // Per-purchase limit is NGN 2,000.00
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
      type: "PAYMENT_REQUIRED",
      status: 402,
      requirements: [
        {
          scheme: "exact",
          network: "eip155:42220",
          chainId: 42220,
          assetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
          amountRaw: 2000000n, // 2 USDC
          payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
        },
      ],
      rawHeaders: {},
      rawPayload: {},
    })

    const paymentExecutorSpy = vi.fn()

    const result = await executePurchaseWorkflow({
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC", "USDT"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/expensive-report",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      paymentExecutor: paymentExecutorSpy,
    })

    // Crucial Golden Demo Assertions:
    // Decision: BLOCKED
    // Funds moved: 0
    // Wallet signing calls: 0
    // Transaction hash: none
    expect(result.finalState).toBe("POLICY_BLOCKED")
    expect(paymentExecutorSpy).not.toHaveBeenCalled()
    expect(result.receipt.policyDecision).toBe("BLOCKED")
    expect(result.receipt.txHash).toBeNull()
    expect(result.receipt.resourceDeliveryStatus).toBe("NOT_REQUESTED")
    expect(result.receipt.reasonCodes).toContain("PER_PURCHASE_LIMIT_EXCEEDED")
    expect(result.receipt.humanReadableReasons).toContain("Per-purchase limit exceeded")

    // Remaining mandate must remain UNCHANGED
    expect(result.receipt.remainingMandateMinor).toBe("500000")
    expect(result.receipt.remainingMandateFormatted).toBe("5,000.00")
  })

  it("Executes the Blocked Path: daily mandate exceeded", async () => {
    // Mandate already spent 4,000 NGN out of 5,000 NGN daily limit
    const nearlyDepletedMandate: SpendingMandate = {
      ...goldenMandate,
      spentTodayMinor: 400000n, // 4,000 NGN spent, 1,000 remaining
    }

    // Purchase costs 1 USDC (~1,330.27 NGN) > 1,000 remaining
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
      type: "PAYMENT_REQUIRED",
      status: 402,
      requirements: [
        {
          scheme: "exact",
          network: "eip155:42220",
          chainId: 42220,
          assetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
          amountRaw: 1000000n, // 1 USDC
          payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
        },
      ],
      rawHeaders: {},
      rawPayload: {},
    })

    const paymentExecutorSpy = vi.fn()

    const result = await executePurchaseWorkflow({
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      mandate: nearlyDepletedMandate,
      allowedAssetSymbols: ["USDC", "USDT"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      paymentExecutor: paymentExecutorSpy,
    })

    expect(result.finalState).toBe("POLICY_BLOCKED")
    expect(paymentExecutorSpy).not.toHaveBeenCalled()
    expect(result.receipt.reasonCodes).toContain("DAILY_MANDATE_EXCEEDED")
    expect(result.receipt.humanReadableReasons).toContain("Daily spending authority exceeded")
    expect(result.receipt.remainingMandateMinor).toBe("100000") // Exactly 1,000 NGN remaining
  })

  it("does not reserve or sign when the agent is paused", async () => {
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
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

    const reserveSpend = vi.fn()
    const paymentExecutor = vi.fn()

    const result = await executePurchaseWorkflow({
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "PAUSED",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("POLICY_BLOCKED")
    expect(result.receipt.reasonCodes).toContain("AGENT_PAUSED")
    expect(reserveSpend).not.toHaveBeenCalled()
    expect(paymentExecutor).not.toHaveBeenCalled()
    expect(result.receipt.txHash).toBeNull()
  })

  it("blocks before signing when the atomic spend reservation loses a race", async () => {
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
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

    const reserveSpend = vi
      .fn()
      .mockRejectedValue(new Error("SPEND_RESERVATION_REJECTED"))
    const paymentExecutor = vi.fn()

    const result = await executePurchaseWorkflow({
      purchaseId: "pur_reservation_race",
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "ACTIVE",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("POLICY_BLOCKED")
    expect(result.receipt.txHash).toBeNull()
    expect(result.receipt.reasonCodes).toContain("DAILY_MANDATE_EXCEEDED")
    expect(result.evidence?.policyDecision?.decision).toBe("BLOCKED")
    expect(paymentExecutor).not.toHaveBeenCalled()
  })

  it("releases the reservation when payment fails before settlement", async () => {
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
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

    const reserveSpend = vi.fn().mockResolvedValue({
      remainingAfterMinor: 366973n,
    })
    const commitSpend = vi.fn()
    const releaseSpend = vi.fn().mockResolvedValue(undefined)
    const paymentExecutor = vi
      .fn()
      .mockRejectedValue(new Error("PAYMENT_BROADCAST_FAILED"))

    const result = await executePurchaseWorkflow({
      purchaseId: "pur_payment_failure",
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "ACTIVE",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      commitSpend,
      releaseSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("PAYMENT_FAILED")
    expect(reserveSpend).toHaveBeenCalledTimes(1)
    expect(paymentExecutor).toHaveBeenCalledTimes(1)
    expect(releaseSpend).toHaveBeenCalledWith("pur_payment_failure")
    expect(commitSpend).not.toHaveBeenCalled()
    expect(result.receipt.txHash).toBeNull()
    expect(result.receipt.remainingMandateMinor).toBe("500000")
  })

  it("keeps spend reserved when x402 payment outcome is uncertain", async () => {
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
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

    const reserveSpend = vi.fn().mockResolvedValue({
      remainingAfterMinor: 366973n,
    })
    const commitSpend = vi.fn()
    const releaseSpend = vi.fn()
    const uncertainError = Object.assign(
      new Error("X402_PAYMENT_OUTCOME_UNCERTAIN"),
      { code: "X402_PAYMENT_OUTCOME_UNCERTAIN" }
    )
    const paymentExecutor = vi.fn().mockRejectedValue(uncertainError)

    const result = await executePurchaseWorkflow({
      purchaseId: "pur_uncertain_payment",
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "ACTIVE",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      commitSpend,
      releaseSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("PAYMENT_FAILED")
    expect(paymentExecutor).toHaveBeenCalledTimes(1)
    expect(commitSpend).not.toHaveBeenCalled()
    expect(releaseSpend).not.toHaveBeenCalled()
    expect(result.receipt.txHash).toBeNull()
    expect(result.receipt.resourceDeliveryStatus).toBe(
      "PAYMENT_OUTCOME_UNCERTAIN"
    )
    expect(result.receipt.reasonCodes).toContain(
      "PAYMENT_OUTCOME_UNCERTAIN"
    )
    expect(result.receipt.remainingMandateMinor).toBe("366973")
  })

  it("preserves a known settlement hash when verification becomes uncertain", async () => {
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
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

    const txHash =
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`
    const reserveSpend = vi.fn().mockResolvedValue({
      remainingAfterMinor: 366973n,
    })
    const commitSpend = vi.fn()
    const releaseSpend = vi.fn()
    const paymentExecutor = vi.fn().mockRejectedValue(
      Object.assign(new Error("X402_PAYMENT_OUTCOME_UNCERTAIN"), {
        code: "X402_PAYMENT_OUTCOME_UNCERTAIN",
        txHash,
      })
    )

    const result = await executePurchaseWorkflow({
      purchaseId: "pur_uncertain_with_hash",
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "ACTIVE",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      commitSpend,
      releaseSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("PAYMENT_FAILED")
    expect(result.receipt.txHash).toBe(txHash)
    expect(result.receipt.resourceDeliveryStatus).toBe(
      "PAYMENT_OUTCOME_UNCERTAIN"
    )
    expect(result.receipt.reasonCodes).toContain("PAYMENT_OUTCOME_UNCERTAIN")
    expect(result.evidence?.settlementTxHash).toBe(txHash)
    expect(releaseSpend).not.toHaveBeenCalled()
    expect(commitSpend).not.toHaveBeenCalled()
    expect(result.receipt.remainingMandateMinor).toBe("366973")
  })

  it("releases reserved authority when the known settlement transaction reverted", async () => {
    vi.spyOn(x402Module, "requestResource").mockResolvedValueOnce({
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

    const txHash =
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as `0x${string}`
    const reserveSpend = vi.fn().mockResolvedValue({
      remainingAfterMinor: 366973n,
    })
    const commitSpend = vi.fn()
    const releaseSpend = vi.fn().mockResolvedValue(undefined)
    const paymentExecutor = vi.fn().mockRejectedValue(
      Object.assign(new Error("X402_SETTLEMENT_REVERTED"), {
        code: "X402_SETTLEMENT_REVERTED",
        txHash,
      })
    )

    const result = await executePurchaseWorkflow({
      purchaseId: "pur_reverted_settlement",
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "ACTIVE",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      commitSpend,
      releaseSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("PAYMENT_FAILED")
    expect(result.receipt.txHash).toBe(txHash)
    expect(result.receipt.resourceDeliveryStatus).toBe("SETTLEMENT_REVERTED")
    expect(result.receipt.reasonCodes).toContain("X402_SETTLEMENT_REVERTED")
    expect(releaseSpend).toHaveBeenCalledWith("pur_reverted_settlement")
    expect(commitSpend).not.toHaveBeenCalled()
    expect(result.receipt.remainingMandateMinor).toBe("500000")
  })

  it("commits spend after settlement and never repays when resource delivery fails", async () => {
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

    const reserveSpend = vi.fn().mockResolvedValue({
      remainingAfterMinor: 366973n,
    })
    const commitSpend = vi.fn().mockResolvedValue(undefined)
    const releaseSpend = vi.fn().mockResolvedValue(undefined)
    const paymentExecutor = vi.fn().mockResolvedValue({
      txHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      paymentHeaders: {
        "PAYMENT-SIGNATURE": "real-payment-proof-placeholder",
      },
    })

    const result = await executePurchaseWorkflow({
      purchaseId: "pur_resource_failure",
      agentId: "agent_research_01",
      agentName: "Research Agent",
      agentAddress,
      agentStatus: "ACTIVE",
      mandate: goldenMandate,
      allowedAssetSymbols: ["USDC"],
      merchantUrl: "https://api.research-provider.com",
      resourceUrl: "https://api.research-provider.com/v1/dataset",
      overridePortfolio: mockPortfolio,
      overrideRateQuote: fixedRateQuote,
      reserveSpend,
      commitSpend,
      releaseSpend,
      paymentExecutor,
    })

    expect(result.finalState).toBe("RESOURCE_FAILED")
    expect(paymentExecutor).toHaveBeenCalledTimes(1)
    expect(commitSpend).toHaveBeenCalledWith("pur_resource_failure")
    expect(releaseSpend).not.toHaveBeenCalled()
    expect(result.receipt.txHash).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    )
    expect(result.receipt.resourceDeliveryStatus).toBe("FAILED_AFTER_PAYMENT")
    expect(result.receipt.remainingMandateMinor).toBe("366973")
  })
})
