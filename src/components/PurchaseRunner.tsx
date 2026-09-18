"use client"

import { useMemo, useState } from "react"
import type { OrchestratorReceipt } from "@/services/orchestrator"
import { authedFetch } from "@/lib/authed-fetch"
import {
  BoltIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  ShieldAlertIcon,
} from "@/components/Icons"

interface PurchaseRunnerProps {
  agentId: string
  agentStatus: "ACTIVE" | "PAUSED" | "DRAFT" | "DISABLED"
  accountingCurrency: string
  perPurchaseLimitFormatted: string
  onPurchaseComplete: (receipt: OrchestratorReceipt) => void
}

const APPROVED_RESOURCE_URL = process.env.NEXT_PUBLIC_X402_RESOURCE_URL || ""
const BLOCKED_RESOURCE_URL =
  process.env.NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL || APPROVED_RESOURCE_URL
const IS_TESTNET = process.env.NEXT_PUBLIC_MURK_NETWORK !== "mainnet"
const TESTNET_HARNESS_PATH = "/api/testnet/x402-resource"
const EXPLORER_TX_BASE = IS_TESTNET
  ? "https://celo-sepolia.blockscout.com/tx/"
  : "https://celoscan.io/tx/"

const FLOW = ["Challenge", "Policy", "Settlement", "Resource"]

export function PurchaseRunner({
  agentId,
  agentStatus,
  accountingCurrency,
  perPurchaseLimitFormatted,
  onPurchaseComplete,
}: PurchaseRunnerProps) {
  const [selectedScenario, setSelectedScenario] = useState<"valid" | "blocked">("valid")
  const [isRunning, setIsRunning] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [activeReceipt, setActiveReceipt] = useState<OrchestratorReceipt | null>(null)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const isBlocked = selectedScenario === "blocked"
  const canRunPurchase = agentStatus === "ACTIVE"
  const configuredResourceUrl = isBlocked ? BLOCKED_RESOURCE_URL : APPROVED_RESOURCE_URL
  const useTestnetHarness = IS_TESTNET && !configuredResourceUrl
  const isConfigured = Boolean(configuredResourceUrl) || useTestnetHarness

  const merchantName = useMemo(() => {
    if (useTestnetHarness) return "Murk Sepolia x402 harness"
    if (!configuredResourceUrl) return "Not configured"
    try {
      return new URL(configuredResourceUrl).hostname
    } catch {
      return configuredResourceUrl
    }
  }, [configuredResourceUrl, useTestnetHarness])

  const progressIndex =
    currentStepIndex < 0 ? -1 : Math.min(3, Math.floor((currentStepIndex / 5) * 4))

  const triggerPurchase = async () => {
    if (!canRunPurchase) {
      setRunError(
        agentStatus === "DRAFT"
          ? "Fund the agent wallet before running a purchase."
          : agentStatus === "PAUSED"
            ? "Resume the agent before running a purchase."
            : "This agent is disabled."
      )
      return
    }

    setIsRunning(true)
    setActiveReceipt(null)
    setShowTechnicalDetails(false)
    setRunError(null)
    setCurrentStepIndex(0)

    if (!configuredResourceUrl && !useTestnetHarness) {
      setRunError(
        isBlocked
          ? "No over-limit x402 resource is configured."
          : "No live x402 resource is configured."
      )
      setIsRunning(false)
      setCurrentStepIndex(-1)
      return
    }

    try {
      const resourceUrl = useTestnetHarness
        ? new URL(TESTNET_HARNESS_PATH, window.location.origin).toString()
        : configuredResourceUrl
      const resource = new URL(resourceUrl)
      const payload = {
        merchantUrl: resource.origin,
        resourceUrl,
        idempotencyKey: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      }

      const res = await authedFetch(`/api/agents/${agentId}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      setIsRunning(false)

      if (!res.ok) {
        setRunError(data.error || "The purchase could not be completed.")
        setCurrentStepIndex(-1)
        return
      }

      if (Array.isArray(data.steps)) {
        setCurrentStepIndex(Math.max(0, data.steps.length - 1))
      }

      if (data.receipt) {
        setActiveReceipt(data.receipt)
        onPurchaseComplete(data.receipt)
      }
    } catch (error) {
      setIsRunning(false)
      setCurrentStepIndex(-1)
      setRunError(
        error instanceof Error ? error.message : "The purchase could not be completed."
      )
    }
  }

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-text-secondary">
            Purchase test
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-text-primary">
            Run the agent
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Murk checks the merchant, your policy and the final Celo settlement.
          </p>
        </div>

        <span className="shrink-0 rounded-full border border-border bg-surface-inset px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
          Celo
        </span>
      </div>

      <div className="mt-5 rounded-[14px] bg-surface-inset p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              setSelectedScenario("valid")
              setActiveReceipt(null)
            }}
            className={[
              "rounded-[11px] px-3 py-2.5 text-left transition",
              selectedScenario === "valid"
                ? "bg-surface text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <BoltIcon className="h-3.5 w-3.5 text-accent" strokeWidth={1.9} />
              Allowed
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-text-secondary">
              Within {accountingCurrency} {perPurchaseLimitFormatted}
            </span>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => {
              setSelectedScenario("blocked")
              setActiveReceipt(null)
            }}
            className={[
              "rounded-[11px] px-3 py-2.5 text-left transition",
              selectedScenario === "blocked"
                ? "bg-surface text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
              <ShieldAlertIcon className="h-3.5 w-3.5 text-danger" strokeWidth={1.9} />
              Over limit
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-text-secondary">
              Must stop before payment
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-y border-border py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-text-secondary">Merchant</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {merchantName}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] font-medium text-text-secondary">Policy</div>
          <div className={`mt-0.5 text-xs font-semibold ${isBlocked ? "text-danger" : "text-success"}`}>
            {isBlocked ? "Block expected" : "Live evaluation"}
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="mt-4">
          <div className="grid grid-cols-4 gap-2">
            {FLOW.map((step, index) => {
              const done = progressIndex > index
              const active = progressIndex === index

              return (
                <div key={step}>
                  <div
                    className={[
                      "h-1.5 rounded-full transition",
                      done || active ? "bg-accent" : "bg-surface-inset",
                    ].join(" ")}
                  />
                  <div
                    className={[
                      "mt-1.5 text-[10px] font-medium",
                      active ? "text-text-primary" : "text-text-secondary",
                    ].join(" ")}
                  >
                    {step}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!canRunPurchase && (
        <div className="mt-4 rounded-[12px] bg-surface-inset px-3.5 py-3 text-xs leading-relaxed text-text-secondary">
          {agentStatus === "DRAFT"
            ? "Add funds to the isolated agent wallet to activate live purchases."
            : agentStatus === "PAUSED"
              ? "The kill switch is active. Resume the agent before purchasing."
              : "This agent is disabled and cannot make purchases."}
        </div>
      )}

      <button
        type="button"
        onClick={triggerPurchase}
        disabled={isRunning || !isConfigured || !canRunPurchase}
        className={[
          "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45",
          isBlocked ? "bg-danger" : "bg-accent",
        ].join(" ")}
      >
        {isRunning ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            Running…
          </>
        ) : (
          <>
            {isBlocked ? (
              <ShieldAlertIcon className="h-4 w-4" strokeWidth={1.9} />
            ) : (
              <BoltIcon className="h-4 w-4" strokeWidth={1.9} />
            )}
            {isBlocked ? "Test policy block" : "Run live purchase"}
          </>
        )}
      </button>

      {runError && (
        <div className="mt-3 rounded-[12px] bg-danger-soft px-3.5 py-3 text-xs leading-relaxed text-danger">
          {runError}
        </div>
      )}

      {activeReceipt && !isRunning && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className={[
                  "flex items-center gap-1.5 text-xs font-semibold",
                  activeReceipt.policyDecision === "APPROVED"
                    ? "text-success"
                    : "text-danger",
                ].join(" ")}
              >
                {activeReceipt.policyDecision === "APPROVED" ? (
                  <CheckIcon className="h-4 w-4" strokeWidth={2} />
                ) : (
                  <ShieldAlertIcon className="h-4 w-4" strokeWidth={1.9} />
                )}
                {activeReceipt.policyDecision === "APPROVED"
                  ? "Settled"
                  : "Blocked before payment"}
              </div>

              <div className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-text-primary tabular-nums">
                {activeReceipt.accountingCurrency} {activeReceipt.accountingValueFormatted}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-text-primary tabular-nums">
                {activeReceipt.policyDecision === "APPROVED"
                  ? `${activeReceipt.settlementAmountFormatted} ${activeReceipt.settlementAsset}`
                  : "0 moved"}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {activeReceipt.policyDecision === "APPROVED"
                  ? IS_TESTNET
                    ? "Celo Sepolia"
                    : "Celo mainnet"
                  : activeReceipt.humanReadableReasons?.[0] || "Policy rejected"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTechnicalDetails((value) => !value)}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary"
          >
            {showTechnicalDetails ? "Hide evidence" : "View evidence"}
            {showTechnicalDetails ? (
              <ChevronUpIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            )}
          </button>

          {showTechnicalDetails && (
            <dl className="mt-3 grid gap-2 border-l-2 border-border pl-3 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Purchase</dt>
                <dd className="truncate font-mono text-text-primary">
                  {activeReceipt.purchaseId}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Rate source</dt>
                <dd className="text-right font-medium text-text-primary">
                  {activeReceipt.rateSource}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Remaining</dt>
                <dd className="font-semibold text-text-primary tabular-nums">
                  {activeReceipt.accountingCurrency} {activeReceipt.remainingMandateFormatted}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Transaction</dt>
                <dd>
                  {activeReceipt.txHash ? (
                    <a
                      href={`${EXPLORER_TX_BASE}${activeReceipt.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-accent"
                    >
                      {activeReceipt.txHash.slice(0, 8)}…{activeReceipt.txHash.slice(-4)}
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-text-secondary">None</span>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </section>
  )
}
