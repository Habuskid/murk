"use client"

import React, { useState } from "react"
import { OrchestratorReceipt } from "@/services/orchestrator"
import {
  BoltIcon,
  ShieldAlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TerminalIcon,
  ExternalLinkIcon,
} from "@/components/Icons"

interface PurchaseRunnerProps {
  agentId: string
  accountingCurrency: string
  perPurchaseLimitFormatted: string
  onPurchaseComplete: (receipt: OrchestratorReceipt) => void
}

const APPROVED_RESOURCE_URL = process.env.NEXT_PUBLIC_X402_RESOURCE_URL || ""
const BLOCKED_RESOURCE_URL = process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL || ""

const WORKFLOW_STEPS = [
  { key: "CHECK_SERVICE", label: "Merchant x402 Challenge Handshake" },
  { key: "SELECT_ASSET", label: "Multi-Asset Discovery & FX Rate Quote" },
  { key: "CHECK_MANDATE", label: "Deterministic Policy & Mandate Evaluation" },
  { key: "PAY_ON_CHAIN", label: "Celo Mainnet Cryptographic Settlement" },
  { key: "RECEIVE_RESOURCE", label: "Resource Delivery & Spend Confirmation" },
  { key: "COMPLETE", label: "Voucher Generated & Ledger Updated" },
]

export function PurchaseRunner({
  agentId,
  accountingCurrency,
  perPurchaseLimitFormatted,
  onPurchaseComplete,
}: PurchaseRunnerProps) {
  const [selectedScenario, setSelectedScenario] = useState<"valid" | "blocked">("valid")
  const [isRunning, setIsRunning] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1)
  const [activeReceipt, setActiveReceipt] = useState<OrchestratorReceipt | null>(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const isBlocked = selectedScenario === "blocked"
  const configuredResourceUrl = isBlocked ? BLOCKED_RESOURCE_URL : APPROVED_RESOURCE_URL
  const isConfigured = Boolean(configuredResourceUrl)

  const triggerPurchase = async () => {
    setIsRunning(true)
    setActiveReceipt(null)
    setShowTechnicalDetails(false)
    setRunError(null)
    setCurrentStepIndex(0)

    if (!configuredResourceUrl) {
      setRunError(
        isBlocked
          ? "No external blocked-scenario x402 resource is configured."
          : "No external x402 resource is configured."
      )
      setIsRunning(false)
      setCurrentStepIndex(-1)
      return
    }

    try {
      const resource = new URL(configuredResourceUrl)
      const payload = {
        merchantUrl: resource.origin,
        resourceUrl: configuredResourceUrl,
        idempotencyKey: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }

      const res = await fetch(`/api/agents/${agentId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      setIsRunning(false)

      if (!res.ok) {
        setRunError(data.error || "The live purchase could not be completed.")
        setCurrentStepIndex(-1)
        return
      }

      if (Array.isArray(data.steps)) {
        setCurrentStepIndex(Math.min(data.steps.length - 1, WORKFLOW_STEPS.length - 1))
      }

      if (data.receipt) {
        setActiveReceipt(data.receipt)
        onPurchaseComplete(data.receipt)
      }
    } catch (err) {
      setIsRunning(false)
      setCurrentStepIndex(-1)
      setRunError(err instanceof Error ? err.message : "The live purchase could not be completed.")
    }
  }

  return (
    <div className="w-full bg-surface rounded-[28px] p-6 sm:p-7 border border-border card-elevation mt-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-surface-hover border border-border text-text-primary flex items-center justify-center">
            <TerminalIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Autonomous Execution Studio
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Deterministic x402 protocol testing and mandate verification
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-inset text-text-secondary border border-border">
          Celo (42220)
        </span>
      </div>

      {/* Scenario Segmented Selector */}
      <div className="mt-4">
        <label className="text-xs font-semibold text-text-secondary block mb-2">
          Select Test Scenario
        </label>
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-inset rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => {
              if (!isRunning) {
                setSelectedScenario("valid")
                setActiveReceipt(null)
              }
            }}
            className={`p-3.5 rounded-xl text-left transition-all duration-150 ${
              selectedScenario === "valid"
                ? "bg-surface shadow-xs text-text-primary border border-border"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <BoltIcon className="w-3.5 h-3.5 text-accent" />
              <span>Approved (1 USDC)</span>
            </div>
            <span className="text-xs text-text-secondary block mt-1">
              Within {accountingCurrency} {perPurchaseLimitFormatted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isRunning) {
                setSelectedScenario("blocked")
                setActiveReceipt(null)
              }
            }}
            className={`p-3.5 rounded-xl text-left transition-all duration-150 ${
              selectedScenario === "blocked"
                ? "bg-surface shadow-xs text-text-primary border border-border"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-danger">
              <ShieldAlertIcon className="w-3.5 h-3.5 text-danger" />
              <span>Blocked (2 USDC)</span>
            </div>
            <span className="text-xs text-text-secondary block mt-1">
              Exceeds {accountingCurrency} {perPurchaseLimitFormatted}
            </span>
          </button>
        </div>
      </div>

      {/* Target Resource Inspector Card */}
      <div className="mt-3.5 p-4 bg-surface-inset rounded-2xl border border-border text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-text-secondary">Target Resource:</span>
          <span className="text-text-primary font-mono text-[11px] font-medium">
            {configuredResourceUrl || "Not configured"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Merchant Cost:</span>
          <span className="text-text-primary font-bold tabular-nums">
            {isConfigured ? "Read from the merchant's live 402 response" : "Unavailable"}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Expected Outcome:</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
            isBlocked ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
          }`}>
            {isBlocked ? "BLOCKED BY REAL POLICY EVALUATION" : "LIVE X402 PURCHASE"}
          </span>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="mt-4">
        <button
          onClick={triggerPurchase}
          disabled={isRunning || !isConfigured}
          className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold tracking-wide transition-all duration-150 flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] disabled:opacity-50 ${
            isBlocked
              ? "bg-danger text-white hover:bg-danger/90"
              : "bg-accent text-white hover:bg-accent/90"
          }`}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Orchestrating Autonomous Settlement...</span>
            </span>
          ) : (
            <>
              {isBlocked ? <ShieldAlertIcon className="w-4 h-4" /> : <BoltIcon className="w-4 h-4" />}
              <span>{isBlocked ? "Run Blocked Scenario" : "Run Live x402 Purchase"}</span>
            </>
          )}
        </button>
      </div>

      {runError && (
        <div className="mt-4 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          {runError}
        </div>
      )}

            {/* Step Progress Timeline */}
      {isRunning && (
        <div className="mt-4 p-4 bg-surface-inset rounded-2xl border border-border animate-in fade-in duration-200">
          <div className="space-y-3">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCurrent = currentStepIndex === idx
              const isPassed = currentStepIndex > idx

              return (
                <div key={step.key} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 ${
                      isPassed
                        ? "bg-success text-white shadow-xs"
                        : isCurrent
                        ? "bg-accent text-white shadow-xs ring-2 ring-accent/30 animate-pulse"
                        : "bg-surface-hover text-text-secondary border border-border"
                    }`}
                  >
                    {isPassed ? <CheckIcon className="w-3 h-3 text-white" /> : idx + 1}
                  </div>
                  <span
                    className={`transition-colors duration-150 ${
                      isCurrent
                        ? "text-text-primary font-bold"
                        : isPassed
                        ? "text-text-primary font-medium"
                        : "text-text-secondary"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Render Voucher Audit Receipt */}
      {activeReceipt && !isRunning && (
        <div
          className={`mt-5 p-5 rounded-2xl border transition-all ${
            activeReceipt.policyDecision === "APPROVED"
              ? "bg-success-soft/70 border-success/30"
              : "bg-danger-soft/70 border-danger/30"
          }`}
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-border">
            <div>
              <div className="flex items-center gap-1.5">
                {activeReceipt.policyDecision === "APPROVED" ? (
                  <CheckIcon className="w-4 h-4 text-success" />
                ) : (
                  <ShieldAlertIcon className="w-4 h-4 text-danger" />
                )}
                <span
                  className={`text-xs font-semibold ${
                    activeReceipt.policyDecision === "APPROVED" ? "text-success" : "text-danger"
                  }`}
                >
                  {activeReceipt.policyDecision === "APPROVED"
                    ? "Payment Settled On Celo"
                    : "Spend Blocked By Policy"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-text-primary tabular-nums mt-1">
                {activeReceipt.accountingCurrency} {activeReceipt.accountingValueFormatted}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-text-primary block tabular-nums">
                {activeReceipt.policyDecision === "APPROVED"
                  ? `${activeReceipt.settlementAmountFormatted} ${activeReceipt.settlementAsset}`
                  : "0 Gas / 0 USDC"}
              </span>
              <span className="text-xs text-text-secondary">
                {activeReceipt.policyDecision === "APPROVED" ? "Gas Sponsored" : "Protected"}
              </span>
            </div>
          </div>

          {/* Blocked Reason Notice */}
          {activeReceipt.policyDecision === "BLOCKED" && (
            <div className="mt-3 p-3 bg-surface rounded-xl border border-danger/20 text-xs text-danger font-medium flex items-start gap-2">
              <ShieldAlertIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Policy Reason: {activeReceipt.humanReadableReasons?.join("; ") || "Exceeded Spending Authority"}</span>
            </div>
          )}

          {/* Technical Details Accordion */}
          <div className="mt-3.5">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <span>{showTechnicalDetails ? "Hide cryptographic voucher" : "Inspect cryptographic voucher"}</span>
              {showTechnicalDetails ? (
                <ChevronUpIcon className="w-3.5 h-3.5 text-text-secondary" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5 text-text-secondary" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 p-4 bg-surface rounded-xl border border-border text-xs space-y-2 text-text-secondary animate-in fade-in duration-150">
                <div className="flex justify-between">
                  <span>Purchase ID:</span>
                  <span className="text-text-primary font-mono text-[11px] font-medium">{activeReceipt.purchaseId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network:</span>
                  <span className="text-text-primary font-medium">{activeReceipt.network}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TX Hash:</span>
                  {activeReceipt.txHash ? (
                    <a
                      href={`https://celoscan.io/tx/${activeReceipt.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>{activeReceipt.txHash.slice(0, 8)}...{activeReceipt.txHash.slice(-6)}</span>
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-text-secondary">Blocked Before Signing (0 on-chain TX)</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Rate Oracle:</span>
                  <span className="text-text-primary font-medium">{activeReceipt.rateSource}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quote Ratio:</span>
                  <span className="text-text-primary font-medium">{activeReceipt.rateNumerator}/{activeReceipt.rateDenominator}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Daily Mandate:</span>
                  <span className="text-text-primary font-bold tabular-nums">{activeReceipt.accountingCurrency} {activeReceipt.remainingMandateFormatted}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
