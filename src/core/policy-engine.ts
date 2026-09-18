/**
 * Core Policy Engine
 *
 * Deterministic financial authority evaluation.
 * The LLM has zero authority to approve payments or bypass rules.
 */

import {
  AgentStatus,
  SpendingMandate,
  PolicyDecision,
  REASON_CODES,
} from "./types"

export type PolicyEvaluationInput = {
  agentStatus: AgentStatus
  mandate: SpendingMandate
  purchaseValueMinor: bigint
  isAssetAllowed: boolean
  isRateValid: boolean
  isRateExpired: boolean
}

export function evaluatePolicy(input: PolicyEvaluationInput): PolicyDecision {
  const {
    agentStatus,
    mandate,
    purchaseValueMinor,
    isAssetAllowed,
    isRateValid,
    isRateExpired,
  } = input

  const reasonCodes: string[] = []

  // Current economic state before decision
  const spentBefore = mandate.spentTodayMinor
  const reservedBefore = mandate.reservedTodayMinor
  const totalCommittedBefore = spentBefore + reservedBefore

  const dailyLimit = mandate.dailyLimitMinor
  const remainingBefore = dailyLimit > totalCommittedBefore ? dailyLimit - totalCommittedBefore : 0n

  // 1. Agent Active Check
  if (agentStatus !== "ACTIVE") {
    reasonCodes.push(REASON_CODES.AGENT_PAUSED)
  }

  // 2. Mandate Active Check
  if (mandate.status !== "ACTIVE") {
    reasonCodes.push(REASON_CODES.MANDATE_INACTIVE)
  }

  // 3. Rate Validity
  if (!isRateValid) {
    reasonCodes.push(REASON_CODES.RATE_UNAVAILABLE)
  }
  if (isRateExpired) {
    reasonCodes.push(REASON_CODES.RATE_EXPIRED)
  }

  // 4. Purchase Value Positive
  if (purchaseValueMinor <= 0n) {
    reasonCodes.push(REASON_CODES.INVALID_PURCHASE_AMOUNT)
  }

  // 5. Settlement Asset Allowed
  if (!isAssetAllowed) {
    reasonCodes.push(REASON_CODES.ASSET_NOT_ALLOWED)
  }

  // 6. Per-Purchase Limit Respected
  if (purchaseValueMinor > mandate.perPurchaseLimitMinor) {
    reasonCodes.push(REASON_CODES.PER_PURCHASE_LIMIT_EXCEEDED)
  }

  // 7. Daily Authority Sufficient (including already reserved amounts)
  if (totalCommittedBefore + purchaseValueMinor > dailyLimit) {
    reasonCodes.push(REASON_CODES.DAILY_MANDATE_EXCEEDED)
  }

  // Decision outcome
  const isApproved = reasonCodes.length === 0

  if (isApproved) {
    const remainingAfter = remainingBefore - purchaseValueMinor
    const reservedAfter = reservedBefore + purchaseValueMinor

    return {
      decision: "APPROVED",
      reasonCodes: [],
      accountingCurrency: mandate.accountingCurrency,
      purchaseValueMinor,
      spentBeforeMinor: spentBefore,
      reservedBeforeMinor: reservedBefore,
      remainingBeforeMinor: remainingBefore,
      spentAfterMinor: spentBefore,
      remainingAfterMinor: remainingAfter,
    }
  } else {
    return {
      decision: "BLOCKED",
      reasonCodes,
      accountingCurrency: mandate.accountingCurrency,
      purchaseValueMinor,
      spentBeforeMinor: spentBefore,
      reservedBeforeMinor: reservedBefore,
      remainingBeforeMinor: remainingBefore,
    }
  }
}
