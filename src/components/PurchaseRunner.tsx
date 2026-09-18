"use client"

import React, { useState } from "react"
import { OrchestratorReceipt } from "@/services/orchestrator"
import {
  BoltIcon,
  ShieldAlertIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@/components/Icons"

interface PurchaseRunnerProps {
  agentId: string
  accountingCurrency: string
  perPurchaseLimitFormatted: string
  onPurchaseComplete: (receipt: OrchestratorReceipt) => void
}

const WORKFLOW_STEPS = [
  { key: "CHECK_SERVICE", label: "Checking service" },
  { key: "SELECT_ASSET", label: "Selecting payment asset" },
  { key: "CHECK_MANDATE", label: "Checking mandate" },
  { key: "PAY_ON_CHAIN", label: "Paying on Celo" },
  { key: "RECEIVE_RESOURCE", label: "Receiving resource" },
  { key: "COMPLETE", label: "Complete" },
]

export function PurchaseRunner({
  agentId,
  accountingCurrency,
  perPurchaseLimitFormatted,
  onPurchaseComplete,
}: PurchaseRunnerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1)
  const [activeReceipt, setActiveReceipt] = useState<OrchestratorReceipt | null>(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)

  const triggerPurchase = async (isBlockedAttempt: boolean = false) => {
    setIsRunning(true)
    setActiveReceipt(null)
    setShowTechnicalDetails(false)

    // Visual step progression per MOTION.md
    for (let i = 0; i < (isBlockedAttempt ? 3 : 5); i++) {
      setCurrentStepIndex(i)
      await new Promise((r) => setTimeout(r, 220))
    }

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
      const payload = {
        merchantUrl: `${origin}/api/merchant`,
        resourceUrl: isBlockedAttempt
          ? `${origin}/api/merchant/expensive-report`
          : `${origin}/api/merchant/dataset`,
        idempotencyKey: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }

      const res = await fetch(`/api/agents/${agentId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      setCurrentStepIndex(5)
      setIsRunning(false)

      if (data.receipt) {
        setActiveReceipt(data.receipt)
        onPurchaseComplete(data.receipt)
      }
    } catch (err) {
      setIsRunning(false)
    }
  }

  return (
    <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border mt-4 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Autonomous x402 Execution</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Test real deterministic payment approval and limit enforcement.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => triggerPurchase(false)}
          disabled={isRunning}
          className="group flex flex-col items-start p-4 rounded-2xl border border-accent/25 bg-accent-soft hover:bg-accent/15 active:scale-[0.99] text-left transition-all duration-150 disabled:opacity-50"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-accent">
            <span className="p-1 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
              <BoltIcon className="w-3.5 h-3.5" />
            </span>
            <span>Test Approved Purchase</span>
          </div>
          <span className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
            Request 1 USDC (~{accountingCurrency} 1,330) dataset within limit.
          </span>
        </button>

        <button
          onClick={() => triggerPurchase(true)}
          disabled={isRunning}
          className="group flex flex-col items-start p-4 rounded-2xl border border-danger/25 bg-danger-soft hover:bg-danger/15 active:scale-[0.99] text-left transition-all duration-150 disabled:opacity-50"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-danger">
            <span className="p-1 rounded-lg bg-danger/10 group-hover:bg-danger/20 transition-colors">
              <ShieldAlertIcon className="w-3.5 h-3.5" />
            </span>
            <span>Test Blocked Purchase</span>
          </div>
          <span className="text-[11px] text-text-secondary mt-1.5 leading-relaxed">
            Request 2 USDC exceeding limit ({accountingCurrency} {perPurchaseLimitFormatted}).
          </span>
        </button>
      </div>

      {/* Workflow Step Progression */}
      {isRunning && (
        <div className="p-4 bg-background rounded-2xl border border-border/80 mb-4 animate-in fade-in duration-200">
          <div className="relative pl-1 space-y-3">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCurrent = currentStepIndex === idx
              const isPassed = currentStepIndex > idx

              return (
                <div key={step.key} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-150 ${
                      isPassed
                        ? "bg-success text-white shadow-sm"
                        : isCurrent
                        ? "bg-accent text-white shadow-sm ring-2 ring-accent/30 animate-pulse"
                        : "bg-border/70 text-text-secondary"
                    }`}
                  >
                    {isPassed ? <CheckIcon className="w-3 h-3 text-white" /> : idx + 1}
                  </div>
                  <span
                    className={`transition-colors duration-150 ${
                      isCurrent
                        ? "text-text-primary font-semibold"
                        : isPassed
                        ? "text-text-primary"
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

      {/* Render Receipt Surface */}
      {activeReceipt && !isRunning && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            activeReceipt.policyDecision === "APPROVED"
              ? "bg-success-soft/60 border-success/30"
              : "bg-danger-soft/60 border-danger/30"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <div className="flex items-center gap-1.5">
                {activeReceipt.policyDecision === "APPROVED" ? (
                  <CheckIcon className="w-3.5 h-3.5 text-success" />
                ) : (
                  <ShieldAlertIcon className="w-3.5 h-3.5 text-danger" />
                )}
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    activeReceipt.policyDecision === "APPROVED" ? "text-success" : "text-danger"
                  }`}
                >
                  {activeReceipt.policyDecision === "APPROVED" ? "Payment Completed" : "Purchase Blocked"}
                </span>
              </div>
              <div className="text-xl font-bold text-text-primary tabular-nums mt-1">
                {activeReceipt.accountingCurrency} {activeReceipt.accountingValueFormatted}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-secondary block">
                {activeReceipt.policyDecision === "APPROVED"
                  ? `Paid ${activeReceipt.settlementAmountFormatted} ${activeReceipt.settlementAsset}`
                  : "Funds moved: 0"}
              </span>
              <span className="text-[10px] text-text-secondary font-mono">
                {activeReceipt.policyDecision === "APPROVED" ? "Celo Mainnet" : "Zero On-chain TX"}
              </span>
            </div>
          </div>

          {/* Blocked reason notice */}
          {activeReceipt.policyDecision === "BLOCKED" && (
            <div className="mt-3 p-3 bg-surface/90 rounded-xl border border-danger/20 text-xs text-danger font-medium flex items-start gap-2">
              <ShieldAlertIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Reason: {activeReceipt.humanReadableReasons?.join("; ") || "Exceeded Spending Authority"}</span>
            </div>
          )}

          {/* Technical Details Toggle */}
          <div className="mt-3">
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
            >
              <span>{showTechnicalDetails ? "Hide technical evidence" : "View technical evidence"}</span>
              {showTechnicalDetails ? (
                <ChevronUpIcon className="w-3.5 h-3.5 text-text-secondary" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5 text-text-secondary" />
              )}
            </button>

            {showTechnicalDetails && (
              <div className="mt-3 p-3.5 bg-surface rounded-xl border border-border text-[11px] font-mono space-y-1.5 text-text-secondary animate-in fade-in duration-150">
                <div className="flex justify-between"><span>Purchase ID:</span> <span className="text-text-primary font-medium">{activeReceipt.purchaseId}</span></div>
                <div className="flex justify-between"><span>Network:</span> <span className="text-text-primary font-medium">{activeReceipt.network}</span></div>
                <div className="flex justify-between"><span>TX Hash:</span> <span className="text-text-primary font-medium truncate max-w-[200px]">{activeReceipt.txHash || "None (Blocked before signing)"}</span></div>
                <div className="flex justify-between"><span>Rate Source:</span> <span className="text-text-primary font-medium">{activeReceipt.rateSource}</span></div>
                <div className="flex justify-between"><span>Quote:</span> <span className="text-text-primary font-medium">{activeReceipt.rateNumerator}/{activeReceipt.rateDenominator}</span></div>
                <div className="flex justify-between"><span>Remaining Authority:</span> <span className="text-text-primary font-medium">{activeReceipt.accountingCurrency} {activeReceipt.remainingMandateFormatted}</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
