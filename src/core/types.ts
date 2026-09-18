/**
 * CORE Financial Types & Interfaces
 * Pure deterministic domain models without external dependencies.
 */

export type Money = {
  amount: bigint
  currency: string
  decimals: number
}

export type RateKind = "EXECUTABLE_ONCHAIN" | "REFERENCE_FX" | "PEG_REFERENCE"

export type RateQuote = {
  baseAsset: string
  quoteCurrency: string
  rateNumerator: bigint
  rateDenominator: bigint
  kind: RateKind
  source: string
  timestamp: Date
  expiresAt: Date
}

export type AgentStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED"

export type MandateStatus = "ACTIVE" | "PAUSED"

export type SpendingMandate = {
  id?: string
  agentId?: string
  version?: number
  accountingCurrency: string
  dailyLimitMinor: bigint
  perPurchaseLimitMinor: bigint
  approvalThresholdMinor?: bigint | null
  spentTodayMinor: bigint
  reservedTodayMinor: bigint
  status: MandateStatus
}

export type CandidateAsset = {
  symbol: string
  address: string
  decimals: number
  enabled: boolean
  minimumReserveRaw: bigint
  walletBalanceRaw: bigint
}

export type MerchantRequirementOption = {
  scheme: string
  network: string
  chainId: number
  assetAddress: string
  amountRaw: bigint
  payTo: string
  extra?: Record<string, unknown>
}

export type SettlementSelectionResult = {
  selected?: {
    symbol: string
    address: string
    decimals: number
    amountRaw: bigint
    payTo: string
    scheme: string
  }
  rejectedCandidates: {
    symbolOrAddress: string
    reason: string
  }[]
}

export type PolicyDecisionType = "APPROVED" | "BLOCKED"

export type PolicyDecision = {
  decision: PolicyDecisionType
  reasonCodes: string[]
  accountingCurrency: string
  purchaseValueMinor: bigint
  spentBeforeMinor: bigint
  reservedBeforeMinor: bigint
  remainingBeforeMinor: bigint
  spentAfterMinor?: bigint
  remainingAfterMinor?: bigint
}

export const REASON_CODES = {
  AGENT_PAUSED: "AGENT_PAUSED",
  AGENT_NOT_ACTIVE: "AGENT_NOT_ACTIVE",
  MANDATE_INACTIVE: "MANDATE_INACTIVE",
  INVALID_PURCHASE_AMOUNT: "INVALID_PURCHASE_AMOUNT",
  ASSET_NOT_ALLOWED: "ASSET_NOT_ALLOWED",
  PER_PURCHASE_LIMIT_EXCEEDED: "PER_PURCHASE_LIMIT_EXCEEDED",
  DAILY_MANDATE_EXCEEDED: "DAILY_MANDATE_EXCEEDED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  RESERVE_VIOLATION: "RESERVE_VIOLATION",
  NO_VALID_SETTLEMENT_ASSET: "NO_VALID_SETTLEMENT_ASSET",
  RATE_UNAVAILABLE: "RATE_UNAVAILABLE",
  RATE_EXPIRED: "RATE_EXPIRED",
} as const

export type ReasonCode = typeof REASON_CODES[keyof typeof REASON_CODES]
