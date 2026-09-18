/**
 * Comprehensive Unit Tests for Murk CORE Deterministic Financial Logic
 * Covers all boundary tests defined in CORE.md and TEST_PLAN.md
 */

import { describe, it, expect } from "vitest"
import {
  createMoney,
  convertAssetToAccountingMinor,
  formatMoneyMinor,
  formatMoney,
  selectSettlementAsset,
  evaluatePolicy,
  REASON_CODES,
  RateQuote,
  SpendingMandate,
  CandidateAsset,
  MerchantRequirementOption,
} from "../src/core"

describe("CORE: Money & Rational Math", () => {
  it("converts raw asset to accounting minor units without floats", () => {
    // 1 USDC (6 decimals, raw = 1,000,000)
    // Rate: 1 USD = 1330.266485 NGN (numerator = 1330266485n, denominator = 1000000n)
    // NGN has 2 decimals (100 kobo = 1 NGN)
    const quote: RateQuote = {
      baseAsset: "USD",
      quoteCurrency: "NGN",
      rateNumerator: 1330266485n,
      rateDenominator: 1000000n,
      kind: "REFERENCE_FX",
      source: "test",
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    }

    const minor = convertAssetToAccountingMinor(1000000n, 6, quote, 2)
    // 1 * 1330.266485 * 100 = 133026.6485 kobo -> ceil = 133027 kobo (NGN 1,330.27)
    expect(minor).toBe(133027n)
  })

  it("handles zero purchase amount safely", () => {
    const quote: RateQuote = {
      baseAsset: "USD",
      quoteCurrency: "NGN",
      rateNumerator: 133000n,
      rateDenominator: 100n,
      kind: "REFERENCE_FX",
      source: "test",
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    }

    expect(convertAssetToAccountingMinor(0n, 6, quote, 2)).toBe(0n)
  })

  it("formats minor units accurately with tabular formatting", () => {
    expect(formatMoneyMinor(500000n, 2)).toBe("5,000.00")
    expect(formatMoneyMinor(142050n, 2)).toBe("1,420.50")
    expect(formatMoneyMinor(5n, 2)).toBe("0.05")
    expect(formatMoneyMinor(0n, 2)).toBe("0.00")

    const money = createMoney(500000n, "NGN", 2)
    expect(formatMoney(money)).toBe("NGN 5,000.00")
  })
})

describe("CORE: Settlement Selector", () => {
  const mockUSDC: CandidateAsset = {
    symbol: "USDC",
    address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    decimals: 6,
    enabled: true,
    minimumReserveRaw: 100000n, // 0.1 USDC reserve
    walletBalanceRaw: 5000000n, // 5 USDC balance
  }

  const mockUSDT: CandidateAsset = {
    symbol: "USDT",
    address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    decimals: 6,
    enabled: true,
    minimumReserveRaw: 0n,
    walletBalanceRaw: 10000000n, // 10 USDT
  }

  const merchantReq: MerchantRequirementOption = {
    scheme: "exact",
    network: "eip155:42220",
    chainId: 42220,
    assetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    amountRaw: 1000000n, // 1 USDC
    payTo: "0x0d74D5Cefd2e7F24E623330ebE3d8D4cB45fFB48",
  }

  it("selects accepted, enabled, and funded asset", () => {
    const res = selectSettlementAsset({
      merchantOptions: [merchantReq],
      candidateAssets: [mockUSDC],
      allowedAssetSymbols: ["USDC"],
    })

    expect(res.selected).toBeDefined()
    expect(res.selected?.symbol).toBe("USDC")
    expect(res.selected?.amountRaw).toBe(1000000n)
  })

  it("rejects when asset is not in user policy allowed list", () => {
    const res = selectSettlementAsset({
      merchantOptions: [merchantReq],
      candidateAssets: [mockUSDC],
      allowedAssetSymbols: ["USDT"], // Only USDT allowed, merchant requested USDC
    })

    expect(res.selected).toBeUndefined()
    expect(res.rejectedCandidates).toHaveLength(1)
    expect(res.rejectedCandidates[0].reason).toBe(REASON_CODES.ASSET_NOT_ALLOWED)
  })

  it("rejects when wallet balance is insufficient", () => {
    const brokeUSDC = { ...mockUSDC, walletBalanceRaw: 500000n } // 0.5 USDC < 1 USDC
    const res = selectSettlementAsset({
      merchantOptions: [merchantReq],
      candidateAssets: [brokeUSDC],
      allowedAssetSymbols: ["USDC"],
    })

    expect(res.selected).toBeUndefined()
    expect(res.rejectedCandidates[0].reason).toBe(REASON_CODES.INSUFFICIENT_BALANCE)
  })

  it("rejects when balance is enough for payment but violates minimum reserve", () => {
    // Balance 1.05 USDC, Payment 1 USDC, Remaining 0.05 USDC < 0.1 USDC reserve
    const lowReserveUSDC = { ...mockUSDC, walletBalanceRaw: 1050000n }
    const res = selectSettlementAsset({
      merchantOptions: [merchantReq],
      candidateAssets: [lowReserveUSDC],
      allowedAssetSymbols: ["USDC"],
    })

    expect(res.selected).toBeUndefined()
    expect(res.rejectedCandidates[0].reason).toBe(REASON_CODES.RESERVE_VIOLATION)
  })
})

describe("CORE: Policy Engine", () => {
  const baseMandate: SpendingMandate = {
    accountingCurrency: "NGN",
    dailyLimitMinor: 500000n, // NGN 5,000.00
    perPurchaseLimitMinor: 200000n, // NGN 2,000.00
    spentTodayMinor: 100000n, // NGN 1,000.00 spent
    reservedTodayMinor: 0n,
    status: "ACTIVE",
  }

  it("approves valid purchase within limits", () => {
    const decision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: baseMandate,
      purchaseValueMinor: 150000n, // NGN 1,500.00
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })

    expect(decision.decision).toBe("APPROVED")
    expect(decision.reasonCodes).toHaveLength(0)
    expect(decision.remainingBeforeMinor).toBe(400000n)
    expect(decision.remainingAfterMinor).toBe(250000n)
  })

  it("blocks when per-purchase limit is exceeded", () => {
    const decision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: baseMandate,
      purchaseValueMinor: 200001n, // 1 kobo over NGN 2,000 limit
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })

    expect(decision.decision).toBe("BLOCKED")
    expect(decision.reasonCodes).toContain(REASON_CODES.PER_PURCHASE_LIMIT_EXCEEDED)
  })

  it("blocks when daily mandate would be exceeded", () => {
    // Spent 1,000, daily limit 5,000, remaining 4,000
    // Try to spend 1,900 when already 3,500 spent:
    const strainedMandate = { ...baseMandate, spentTodayMinor: 350000n }
    const decision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: strainedMandate,
      purchaseValueMinor: 160000n, // 3500 + 1600 = 5100 > 5000
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })

    expect(decision.decision).toBe("BLOCKED")
    expect(decision.reasonCodes).toContain(REASON_CODES.DAILY_MANDATE_EXCEEDED)
  })

  it("blocks when agent is paused", () => {
    const decision = evaluatePolicy({
      agentStatus: "PAUSED",
      mandate: baseMandate,
      purchaseValueMinor: 50000n,
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })

    expect(decision.decision).toBe("BLOCKED")
    expect(decision.reasonCodes).toContain(REASON_CODES.AGENT_PAUSED)
  })

  it("blocks when rate is expired or invalid", () => {
    const decision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: baseMandate,
      purchaseValueMinor: 50000n,
      isAssetAllowed: true,
      isRateValid: false,
      isRateExpired: true,
    })

    expect(decision.decision).toBe("BLOCKED")
    expect(decision.reasonCodes).toContain(REASON_CODES.RATE_UNAVAILABLE)
    expect(decision.reasonCodes).toContain(REASON_CODES.RATE_EXPIRED)
  })

  it("handles exact boundary amounts accurately", () => {
    // Exactly at per-purchase limit
    const exactDecision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: baseMandate,
      purchaseValueMinor: 200000n, // Exactly NGN 2,000.00
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })
    expect(exactDecision.decision).toBe("APPROVED")

    // 1 minor unit over per-purchase limit
    const overDecision = evaluatePolicy({
      agentStatus: "ACTIVE",
      mandate: baseMandate,
      purchaseValueMinor: 200001n,
      isAssetAllowed: true,
      isRateValid: true,
      isRateExpired: false,
    })
    expect(overDecision.decision).toBe("BLOCKED")
  })
})
