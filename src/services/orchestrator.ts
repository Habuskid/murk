/**
 * Agent Orchestrator Service
 * Implements the canonical 10-step state machine per SYSTEM_DESIGN.md
 */

import {
  SpendingMandate,
  PolicyDecision,
  CandidateAsset,
  RateQuote,
  REASON_CODES,
} from "../core/types"
import { convertAssetToAccountingMinor, formatMoneyMinor } from "../core/money"
import { selectSettlementAsset } from "../core/settlement-selector"
import { evaluatePolicy } from "../core/policy-engine"
import { requestResource, ResourceRequestResult } from "./x402"
import { getRateQuote } from "./rates"
import { getAgentPortfolio, getCeloClient } from "./celo"

export type OrchestrationState =
  | "CREATED"
  | "PAYMENT_REQUIRED"
  | "ASSET_SELECTED"
  | "RATE_RESOLVED"
  | "POLICY_APPROVED"
  | "POLICY_BLOCKED"
  | "SPEND_RESERVED"
  | "PAYMENT_SUBMITTED"
  | "PAYMENT_SETTLED"
  | "RESOURCE_RECEIVED"
  | "COMPLETED"
  | "PAYMENT_FAILED"
  | "RESOURCE_FAILED"

export type OrchestratorReceipt = {
  purchaseId: string
  agentName: string
  merchantUrl: string
  resourceUrl: string
  settlementAsset: string
  settlementAmountRaw: string
  settlementAmountFormatted: string
  accountingCurrency: string
  accountingValueMinor: string
  accountingValueFormatted: string
  rateSource: string
  rateTimestamp: string
  rateNumerator: string
  rateDenominator: string
  policyDecision: "APPROVED" | "BLOCKED"
  reasonCodes: string[]
  humanReadableReasons: string[]
  network: string
  chainId: number
  txHash: string | null
  resourceDeliveryStatus: string
  remainingMandateMinor: string
  remainingMandateFormatted: string
  createdAt: string
}

export type OrchestrationStepLog = {
  step: OrchestrationState
  timestamp: string
  detail: string
}

export type OrchestrationEvidence = {
  paymentRequired?: {
    rawHeaders: Record<string, string>
    rawPayload: unknown
    requirements: Array<{
      scheme: string
      network: string
      chainId: number
      assetAddress: string
      amountRaw: string
      payTo: string
      extra?: Record<string, unknown>
    }>
  }
  rateQuote?: {
    baseAsset: string
    quoteCurrency: string
    rateNumerator: string
    rateDenominator: string
    kind: string
    source: string
    timestamp: string
    expiresAt: string
  }
  policyDecision?: {
    decision: "APPROVED" | "BLOCKED"
    reasonCodes: string[]
    purchaseValueMinor: string
    spentBeforeMinor: string
    reservedBeforeMinor: string
    remainingBeforeMinor: string
    remainingAfterMinor?: string
  }
  settlementTxHash?: string | null
  resource?: {
    status: number
    contentType: string
    delivered: boolean
  }
}

export type OrchestrationResult = {
  purchaseId: string
  finalState: OrchestrationState
  steps: OrchestrationStepLog[]
  receipt: OrchestratorReceipt
  deliveredResource?: any
  evidence?: OrchestrationEvidence
  error?: string
}

export function translateReasonCode(code: string): string {
  switch (code) {
    case REASON_CODES.DAILY_MANDATE_EXCEEDED:
      return "Daily spending authority exceeded"
    case REASON_CODES.PER_PURCHASE_LIMIT_EXCEEDED:
      return "Per-purchase limit exceeded"
    case REASON_CODES.AGENT_PAUSED:
      return "Agent is paused"
    case REASON_CODES.MANDATE_INACTIVE:
      return "Spending mandate is inactive"
    case REASON_CODES.INSUFFICIENT_BALANCE:
      return "Insufficient wallet balance"
    case REASON_CODES.RESERVE_VIOLATION:
      return "Wallet reserve requirement would be violated"
    case REASON_CODES.ASSET_NOT_ALLOWED:
      return "Settlement asset not allowed by policy"
    case REASON_CODES.NO_VALID_SETTLEMENT_ASSET:
      return "No valid settlement asset matches merchant requirements"
    case REASON_CODES.RATE_UNAVAILABLE:
      return "Accounting exchange rate is unavailable"
    case REASON_CODES.RATE_EXPIRED:
      return "Accounting exchange rate has expired"
    case REASON_CODES.INVALID_PURCHASE_AMOUNT:
      return "Purchase amount is invalid or zero"
    default:
      return code
  }
}

export type ExecutePurchaseParams = {
  purchaseId?: string
  agentId: string
  agentName: string
  agentAddress: `0x${string}`
  agentStatus?: "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED"
  mandate: SpendingMandate
  allowedAssetSymbols: string[]
  merchantUrl: string
  resourceUrl: string
  // Optional pre-configured assets / balance overrides for deterministic testing
  overridePortfolio?: CandidateAsset[]
  overrideRateQuote?: RateQuote
  // Custom executor for signing & broadcasting payment
  reserveSpend?: (params: {
    purchaseId: string
    amountMinor: bigint
  }) => Promise<{ remainingAfterMinor: bigint }>
  commitSpend?: (purchaseId: string) => Promise<void>
  releaseSpend?: (purchaseId: string) => Promise<void>
  paymentExecutor?: (params: {
    agentId: string
    selectedAsset: string
    assetAddress: string
    amountRaw: bigint
    payTo: string
    resourceUrl: string
  }) => Promise<{
    txHash: `0x${string}`
    paymentHeaders?: Record<string, string>
    deliveredResource?: unknown
  }>
}

export async function executePurchaseWorkflow(
  params: ExecutePurchaseParams
): Promise<OrchestrationResult> {
  const purchaseId = params.purchaseId || `pur_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const steps: OrchestrationStepLog[] = []

  function logStep(step: OrchestrationState, detail: string) {
    steps.push({ step, timestamp: new Date().toISOString(), detail })
  }

  logStep("CREATED", `Purchase workflow initialized for agent ${params.agentName} (${params.agentId})`)

  let selectedAsset = ""
  let selectedAssetAddress = ""
  let selectedDecimals = 6
  let settlementAmountRaw = 0n
  let payTo = ""
  let scheme = "exact"
  let rateQuote: RateQuote | null = null
  let accountingValueMinor = 0n
  let policyDecision: PolicyDecision | null = null
  let txHash: string | null = null
  let deliveredResource: any = null
  let spendReserved = false
  let spendCommitted = false
  let reservationRemainingMinor: bigint | null = null
  const evidence: OrchestrationEvidence = {}

  try {
    // 1. Request Resource (or simulate 402)
    logStep("PAYMENT_REQUIRED", `Requesting resource from ${params.resourceUrl}`)
    const initialReq = await requestResource(params.resourceUrl)

    if (initialReq.type === "DELIVERED") {
      evidence.resource = {
        status: initialReq.status,
        contentType: initialReq.contentType,
        delivered: true,
      }
      logStep("COMPLETED", "Resource was free; no payment required")
      const receipt: OrchestratorReceipt = {
        purchaseId,
        agentName: params.agentName,
        merchantUrl: params.merchantUrl,
        resourceUrl: params.resourceUrl,
        settlementAsset: "NONE",
        settlementAmountRaw: "0",
        settlementAmountFormatted: "0",
        accountingCurrency: params.mandate.accountingCurrency,
        accountingValueMinor: "0",
        accountingValueFormatted: "0.00",
        rateSource: "N/A",
        rateTimestamp: new Date().toISOString(),
        rateNumerator: "1",
        rateDenominator: "1",
        policyDecision: "APPROVED",
        reasonCodes: [],
        humanReadableReasons: [],
        network: "Celo Mainnet (42220)",
        chainId: 42220,
        txHash: null,
        resourceDeliveryStatus: "DELIVERED",
        remainingMandateMinor: (
          params.mandate.dailyLimitMinor -
          params.mandate.spentTodayMinor -
          params.mandate.reservedTodayMinor
        ).toString(),
        remainingMandateFormatted: formatMoneyMinor(
          params.mandate.dailyLimitMinor -
            params.mandate.spentTodayMinor -
            params.mandate.reservedTodayMinor,
          2
        ),
        createdAt: new Date().toISOString(),
      }
      return {
        purchaseId,
        finalState: "COMPLETED",
        steps,
        receipt,
        deliveredResource: initialReq.data,
        evidence,
      }
    }

    evidence.paymentRequired = {
      rawHeaders: initialReq.rawHeaders,
      rawPayload: initialReq.rawPayload,
      requirements: initialReq.requirements.map((requirement) => ({
        scheme: requirement.scheme,
        network: requirement.network,
        chainId: requirement.chainId,
        assetAddress: requirement.assetAddress,
        amountRaw: requirement.amountRaw.toString(),
        payTo: requirement.payTo,
        extra: requirement.extra,
      })),
    }

    // 2. Select Settlement Asset from Portfolio
    const portfolio = params.overridePortfolio || (await getAgentPortfolio(params.agentAddress, params.allowedAssetSymbols))
    const selection = selectSettlementAsset({
      merchantOptions: initialReq.requirements,
      candidateAssets: portfolio,
      allowedAssetSymbols: params.allowedAssetSymbols,
    })

    if (!selection.selected) {
      logStep("POLICY_BLOCKED", "No acceptable settlement asset found in agent portfolio")
      const receipt: OrchestratorReceipt = {
        purchaseId,
        agentName: params.agentName,
        merchantUrl: params.merchantUrl,
        resourceUrl: params.resourceUrl,
        settlementAsset: "NONE",
        settlementAmountRaw: "0",
        settlementAmountFormatted: "0",
        accountingCurrency: params.mandate.accountingCurrency,
        accountingValueMinor: "0",
        accountingValueFormatted: "0.00",
        rateSource: "N/A",
        rateTimestamp: new Date().toISOString(),
        rateNumerator: "1",
        rateDenominator: "1",
        policyDecision: "BLOCKED",
        reasonCodes: [REASON_CODES.NO_VALID_SETTLEMENT_ASSET],
        humanReadableReasons: [translateReasonCode(REASON_CODES.NO_VALID_SETTLEMENT_ASSET)],
        network: "Celo Mainnet (42220)",
        chainId: 42220,
        txHash: null,
        resourceDeliveryStatus: "NOT_REQUESTED",
        remainingMandateMinor: (params.mandate.dailyLimitMinor - params.mandate.spentTodayMinor).toString(),
        remainingMandateFormatted: formatMoneyMinor(params.mandate.dailyLimitMinor - params.mandate.spentTodayMinor),
        createdAt: new Date().toISOString(),
      }
      return {
        purchaseId,
        finalState: "POLICY_BLOCKED",
        steps,
        receipt,
        evidence,
      }
    }

    selectedAsset = selection.selected.symbol
    selectedAssetAddress = selection.selected.address
    selectedDecimals = selection.selected.decimals
    settlementAmountRaw = selection.selected.amountRaw
    payTo = selection.selected.payTo
    scheme = selection.selected.scheme

    logStep("ASSET_SELECTED", `Selected asset: ${selectedAsset} (${settlementAmountRaw} raw) to ${payTo}`)

    // 3. Resolve FX Rate Quote
    rateQuote = params.overrideRateQuote || (await getRateQuote(params.mandate.accountingCurrency, "USD"))
    evidence.rateQuote = {
      baseAsset: rateQuote.baseAsset,
      quoteCurrency: rateQuote.quoteCurrency,
      rateNumerator: rateQuote.rateNumerator.toString(),
      rateDenominator: rateQuote.rateDenominator.toString(),
      kind: rateQuote.kind,
      source: rateQuote.source,
      timestamp: rateQuote.timestamp.toISOString(),
      expiresAt: rateQuote.expiresAt.toISOString(),
    }
    logStep(
      "RATE_RESOLVED",
      `Rate resolved: 1 USD = ${rateQuote.rateNumerator}/${rateQuote.rateDenominator} ${rateQuote.quoteCurrency} (source: ${rateQuote.source})`
    )

    // 4. Convert Accounting Value
    accountingValueMinor = convertAssetToAccountingMinor(
      settlementAmountRaw,
      selectedDecimals,
      rateQuote,
      2
    )

    // 5. Evaluate Policy
    policyDecision = evaluatePolicy({
      agentStatus: params.agentStatus ?? "ACTIVE",
      mandate: params.mandate,
      purchaseValueMinor: accountingValueMinor,
      isAssetAllowed: params.allowedAssetSymbols.includes(selectedAsset),
      isRateValid: true,
      isRateExpired: false,
    })

    evidence.policyDecision = {
      decision: policyDecision.decision,
      reasonCodes: policyDecision.reasonCodes,
      purchaseValueMinor: policyDecision.purchaseValueMinor.toString(),
      spentBeforeMinor: policyDecision.spentBeforeMinor.toString(),
      reservedBeforeMinor: policyDecision.reservedBeforeMinor.toString(),
      remainingBeforeMinor: policyDecision.remainingBeforeMinor.toString(),
      remainingAfterMinor: policyDecision.remainingAfterMinor?.toString(),
    }

    if (policyDecision.decision === "BLOCKED") {
      logStep(
        "POLICY_BLOCKED",
        `Purchase blocked by policy engine: ${policyDecision.reasonCodes.join(", ")}`
      )

      const receipt: OrchestratorReceipt = {
        purchaseId,
        agentName: params.agentName,
        merchantUrl: params.merchantUrl,
        resourceUrl: params.resourceUrl,
        settlementAsset: selectedAsset,
        settlementAmountRaw: settlementAmountRaw.toString(),
        settlementAmountFormatted: (Number(settlementAmountRaw) / 10 ** selectedDecimals).toString(),
        accountingCurrency: params.mandate.accountingCurrency,
        accountingValueMinor: accountingValueMinor.toString(),
        accountingValueFormatted: formatMoneyMinor(accountingValueMinor, 2),
        rateSource: rateQuote.source,
        rateTimestamp: rateQuote.timestamp.toISOString(),
        rateNumerator: rateQuote.rateNumerator.toString(),
        rateDenominator: rateQuote.rateDenominator.toString(),
        policyDecision: "BLOCKED",
        reasonCodes: policyDecision.reasonCodes,
        humanReadableReasons: policyDecision.reasonCodes.map(translateReasonCode),
        network: "Celo Mainnet (42220)",
        chainId: 42220,
        txHash: null, // ZERO tx hash per GOLDEN_DEMO.md
        resourceDeliveryStatus: "NOT_REQUESTED",
        remainingMandateMinor: policyDecision.remainingBeforeMinor.toString(),
        remainingMandateFormatted: formatMoneyMinor(policyDecision.remainingBeforeMinor, 2),
        createdAt: new Date().toISOString(),
      }

      return {
        purchaseId,
        finalState: "POLICY_BLOCKED",
        steps,
        receipt,
        evidence,
      }
    }

    logStep("POLICY_APPROVED", `Policy approved purchase for ${params.mandate.accountingCurrency} ${formatMoneyMinor(accountingValueMinor, 2)}`)

    // 6. Atomically reserve spend before any signing.
    if (params.reserveSpend) {
      try {
        const reservation = await params.reserveSpend({
          purchaseId,
          amountMinor: accountingValueMinor,
        })
        spendReserved = true
        reservationRemainingMinor = reservation.remainingAfterMinor
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logStep("POLICY_BLOCKED", `Atomic spend reservation rejected: ${message}`)

        const remainingBefore =
          params.mandate.dailyLimitMinor -
          params.mandate.spentTodayMinor -
          params.mandate.reservedTodayMinor

        evidence.policyDecision = {
          decision: "BLOCKED",
          reasonCodes: [REASON_CODES.DAILY_MANDATE_EXCEEDED],
          purchaseValueMinor: accountingValueMinor.toString(),
          spentBeforeMinor: params.mandate.spentTodayMinor.toString(),
          reservedBeforeMinor: params.mandate.reservedTodayMinor.toString(),
          remainingBeforeMinor: remainingBefore.toString(),
        }

        const receipt: OrchestratorReceipt = {
          purchaseId,
          agentName: params.agentName,
          merchantUrl: params.merchantUrl,
          resourceUrl: params.resourceUrl,
          settlementAsset: selectedAsset,
          settlementAmountRaw: settlementAmountRaw.toString(),
          settlementAmountFormatted: (Number(settlementAmountRaw) / 10 ** selectedDecimals).toString(),
          accountingCurrency: params.mandate.accountingCurrency,
          accountingValueMinor: accountingValueMinor.toString(),
          accountingValueFormatted: formatMoneyMinor(accountingValueMinor, 2),
          rateSource: rateQuote.source,
          rateTimestamp: rateQuote.timestamp.toISOString(),
          rateNumerator: rateQuote.rateNumerator.toString(),
          rateDenominator: rateQuote.rateDenominator.toString(),
          policyDecision: "BLOCKED",
          reasonCodes: [REASON_CODES.DAILY_MANDATE_EXCEEDED],
          humanReadableReasons: [
            "Available daily authority changed before payment could be reserved",
          ],
          network: "Celo Mainnet (42220)",
          chainId: 42220,
          txHash: null,
          resourceDeliveryStatus: "NOT_REQUESTED",
          remainingMandateMinor: remainingBefore.toString(),
          remainingMandateFormatted: formatMoneyMinor(remainingBefore, 2),
          createdAt: new Date().toISOString(),
        }

        return {
          purchaseId,
          finalState: "POLICY_BLOCKED",
          steps,
          receipt,
          evidence,
        }
      }
    }

    logStep("SPEND_RESERVED", `Reserved ${accountingValueMinor} minor units against mandate`)

    // 7. Execute Payment
    if (!params.paymentExecutor) {
      throw new Error("LIVE_PAYMENT_EXECUTOR_REQUIRED")
    }

    logStep("PAYMENT_SUBMITTED", `Executing payment on Celo for ${settlementAmountRaw} raw units`)
    const paymentResult = await params.paymentExecutor({
      agentId: params.agentId,
      selectedAsset,
      assetAddress: selectedAssetAddress,
      amountRaw: settlementAmountRaw,
      payTo,
      resourceUrl: params.resourceUrl,
    })
    txHash = paymentResult.txHash
    evidence.settlementTxHash = txHash

    logStep("PAYMENT_SETTLED", `Payment settled on Celo with txHash: ${txHash}`)

    // Funds moved once settlement exists, so commit the accounting reservation
    // before attempting resource delivery.
    if (params.commitSpend && spendReserved) {
      await params.commitSpend(purchaseId)
      spendCommitted = true
    }

    // 8. Re-request the paid resource. Never fabricate delivery.
    if (paymentResult.deliveredResource !== undefined) {
      deliveredResource = paymentResult.deliveredResource
      evidence.resource = {
        status: 200,
        contentType: "application/octet-stream",
        delivered: true,
      }
      logStep("RESOURCE_RECEIVED", "Paid resource delivered by the x402 executor")
    } else if (paymentResult.paymentHeaders) {
      logStep("RESOURCE_RECEIVED", "Retrying resource request with real payment proof")
      const retry = await requestResource(params.resourceUrl, paymentResult.paymentHeaders)
      if (retry.type !== "DELIVERED") {
        throw new Error("RESOURCE_NOT_DELIVERED_AFTER_PAYMENT")
      }
      deliveredResource = retry.data
      evidence.resource = {
        status: retry.status,
        contentType: retry.contentType,
        delivered: true,
      }
    } else {
      throw new Error("PAYMENT_PROOF_REQUIRED_FOR_RESOURCE_RETRY")
    }

    // 9. Complete & Finalize
    logStep("COMPLETED", "Workflow completed successfully; spend reservation committed")

    const finalRemaining =
      reservationRemainingMinor ??
      policyDecision.remainingAfterMinor ??
      policyDecision.remainingBeforeMinor - accountingValueMinor

    const receipt: OrchestratorReceipt = {
      purchaseId,
      agentName: params.agentName,
      merchantUrl: params.merchantUrl,
      resourceUrl: params.resourceUrl,
      settlementAsset: selectedAsset,
      settlementAmountRaw: settlementAmountRaw.toString(),
      settlementAmountFormatted: (Number(settlementAmountRaw) / 10 ** selectedDecimals).toString(),
      accountingCurrency: params.mandate.accountingCurrency,
      accountingValueMinor: accountingValueMinor.toString(),
      accountingValueFormatted: formatMoneyMinor(accountingValueMinor, 2),
      rateSource: rateQuote.source,
      rateTimestamp: rateQuote.timestamp.toISOString(),
      rateNumerator: rateQuote.rateNumerator.toString(),
      rateDenominator: rateQuote.rateDenominator.toString(),
      policyDecision: "APPROVED",
      reasonCodes: [],
      humanReadableReasons: [],
      network: "Celo Mainnet (42220)",
      chainId: 42220,
      txHash,
      resourceDeliveryStatus: "DELIVERED",
      remainingMandateMinor: finalRemaining.toString(),
      remainingMandateFormatted: formatMoneyMinor(finalRemaining, 2),
      createdAt: new Date().toISOString(),
    }

    return {
      purchaseId,
      finalState: "COMPLETED",
      steps,
      receipt,
      deliveredResource,
      evidence,
    }
  } catch (err: any) {
    const failedAfterSettlement = Boolean(txHash)
    const paymentOutcomeUncertain =
      err?.code === "X402_PAYMENT_OUTCOME_UNCERTAIN" ||
      err?.message === "X402_PAYMENT_OUTCOME_UNCERTAIN"

    if (
      !failedAfterSettlement &&
      !paymentOutcomeUncertain &&
      spendReserved &&
      !spendCommitted &&
      params.releaseSpend
    ) {
      try {
        await params.releaseSpend(purchaseId)
        spendReserved = false
      } catch (releaseError) {
        logStep(
          "PAYMENT_FAILED",
          `Spend reservation release failed: ${
            releaseError instanceof Error ? releaseError.message : String(releaseError)
          }`
        )
      }
    }
    const failureState: OrchestrationState = failedAfterSettlement ? "RESOURCE_FAILED" : "PAYMENT_FAILED"

    const remainingAfterFailure =
      failedAfterSettlement || paymentOutcomeUncertain
        ? (
            reservationRemainingMinor ??
            policyDecision?.remainingAfterMinor ??
            (
              policyDecision
                ? policyDecision.remainingBeforeMinor - accountingValueMinor
                : params.mandate.dailyLimitMinor -
                  params.mandate.spentTodayMinor -
                  params.mandate.reservedTodayMinor
            )
          )
        : (
            policyDecision?.remainingBeforeMinor ??
            params.mandate.dailyLimitMinor -
              params.mandate.spentTodayMinor -
              params.mandate.reservedTodayMinor
          )

    logStep(failureState, `Orchestrator error: ${err.message}`)
    return {
      purchaseId,
      finalState: failureState,
      steps,
      receipt: {
        purchaseId,
        agentName: params.agentName,
        merchantUrl: params.merchantUrl,
        resourceUrl: params.resourceUrl,
        settlementAsset: selectedAsset || "UNKNOWN",
        settlementAmountRaw: settlementAmountRaw.toString(),
        settlementAmountFormatted: "0",
        accountingCurrency: params.mandate.accountingCurrency,
        accountingValueMinor: accountingValueMinor.toString(),
        accountingValueFormatted: "0.00",
        rateSource: rateQuote?.source || "UNKNOWN",
        rateTimestamp: (rateQuote?.timestamp || new Date()).toISOString(),
        rateNumerator: (rateQuote?.rateNumerator || 1n).toString(),
        rateDenominator: (rateQuote?.rateDenominator || 1n).toString(),
        policyDecision: policyDecision?.decision || "BLOCKED",
        reasonCodes: [
          failedAfterSettlement
            ? "RESOURCE_NOT_DELIVERED"
            : paymentOutcomeUncertain
              ? "PAYMENT_OUTCOME_UNCERTAIN"
              : "SYSTEM_ERROR",
        ],
        humanReadableReasons: [
          paymentOutcomeUncertain
            ? "Payment outcome is uncertain; spending authority remains reserved until reconciliation"
            : err.message,
        ],
        network: "Celo Mainnet (42220)",
        chainId: 42220,
        txHash,
        resourceDeliveryStatus: failedAfterSettlement
          ? "FAILED_AFTER_PAYMENT"
          : paymentOutcomeUncertain
            ? "PAYMENT_OUTCOME_UNCERTAIN"
            : "FAILED",
        remainingMandateMinor: remainingAfterFailure.toString(),
        remainingMandateFormatted: formatMoneyMinor(remainingAfterFailure, 2),
        createdAt: new Date().toISOString(),
      },
      evidence: {
        ...evidence,
        settlementTxHash: txHash,
        resource: evidence.resource || {
          status: 0,
          contentType: "unknown",
          delivered: false,
        },
      },
      error: err.message,
    }
  }
}
