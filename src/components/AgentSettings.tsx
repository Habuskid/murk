"use client"

import { useEffect, useState } from "react"
import { authedFetch } from "@/lib/authed-fetch"
import {
  CheckIcon,
  PauseIcon,
  PlayIcon,
  ShieldCheckIcon,
} from "@/components/Icons"

interface AgentSettingsProps {
  agentId: string
  agentStatus: "ACTIVE" | "PAUSED" | "DRAFT" | "DISABLED"
  dailyLimitFormatted: string
  perPurchaseLimitFormatted: string
  currency: string
  onStatusChange: (status: "ACTIVE" | "PAUSED") => void
  onLimitsUpdated: (daily: string, perPurchase: string) => void
}

export function AgentSettings({
  agentId,
  agentStatus,
  dailyLimitFormatted,
  perPurchaseLimitFormatted,
  currency,
  onStatusChange,
  onLimitsUpdated,
}: AgentSettingsProps) {
  const [isPaused, setIsPaused] = useState(agentStatus === "PAUSED")
  const canTogglePause = agentStatus === "ACTIVE" || agentStatus === "PAUSED"
  const [editMode, setEditMode] = useState(false)
  const [newDaily, setNewDaily] = useState(dailyLimitFormatted.replace(/,/g, ""))
  const [newPerPurchase, setNewPerPurchase] = useState(
    perPurchaseLimitFormatted.replace(/,/g, "")
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsPaused(agentStatus === "PAUSED")
  }, [agentStatus])

  const decimalToMinorUnits = (value: string): string => {
    const normalized = value.trim()
    if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
      throw new Error("Enter a valid amount with up to 2 decimal places")
    }

    const [whole, fraction = ""] = normalized.split(".")
    return (
      BigInt(whole) * 100n +
      BigInt((fraction + "00").slice(0, 2))
    ).toString()
  }

  const togglePause = async () => {
    if (!canTogglePause) return
    const action = isPaused ? "resume" : "pause"

    try {
      setError(null)
      const res = await authedFetch(`/api/agents/${agentId}/${action}`, {
        method: "POST",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Could not update agent status")
      }

      const next = !isPaused
      setIsPaused(next)
      onStatusChange(next ? "PAUSED" : "ACTIVE")
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update agent status"
      )
    }
  }

  const handleSaveLimits = async () => {
    setIsSaving(true)

    try {
      const dailyMinor = decimalToMinorUnits(newDaily)
      const perPurchaseMinor = decimalToMinorUnits(newPerPurchase)

      if (BigInt(perPurchaseMinor) > BigInt(dailyMinor)) {
        throw new Error("Per-purchase limit cannot exceed the daily limit")
      }

      setError(null)

      const res = await authedFetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyLimitMinor: dailyMinor,
          perPurchaseLimitMinor: perPurchaseMinor,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Could not update policy")
      }

      setEditMode(false)
      onLimitsUpdated(newDaily, newPerPurchase)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update policy"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="text-xs font-medium text-text-secondary">
            Policy
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-text-primary">
            Spending limits
          </h2>
        </div>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            agentStatus === "ACTIVE"
              ? "bg-success-soft text-success"
              : agentStatus === "PAUSED"
                ? "bg-danger-soft text-danger"
                : agentStatus === "DRAFT"
                  ? "bg-accent-soft text-accent"
                  : "bg-surface-inset text-text-secondary",
          ].join(" ")}
        >
          {agentStatus === "ACTIVE"
            ? "Active"
            : agentStatus === "PAUSED"
              ? "Paused"
              : agentStatus === "DRAFT"
                ? "Needs funding"
                : "Disabled"}
        </span>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">
            Accounting currency: {currency}
          </span>

          {!editMode ? (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="text-xs font-semibold text-accent"
            >
              Edit limits
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="text-xs font-medium text-text-secondary"
            >
              Cancel
            </button>
          )}
        </div>

        {!editMode ? (
          <div className="mt-3 overflow-hidden rounded-[14px] border border-border">
            <div className="flex items-center justify-between gap-4 bg-surface-inset px-4 py-4">
              <div>
                <div className="text-xs font-medium text-text-secondary">
                  Daily authority
                </div>
                <div className="mt-1 text-[11px] text-text-secondary">
                  Maximum spend per day
                </div>
              </div>
              <div className="text-lg font-semibold tracking-[-0.02em] text-text-primary tabular-nums">
                {currency} {dailyLimitFormatted}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-inset px-4 py-4">
              <div>
                <div className="text-xs font-medium text-text-secondary">
                  Per purchase
                </div>
                <div className="mt-1 text-[11px] text-text-secondary">
                  Maximum single payment
                </div>
              </div>
              <div className="text-lg font-semibold tracking-[-0.02em] text-text-primary tabular-nums">
                {currency} {perPurchaseLimitFormatted}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3 border-l-2 border-accent pl-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-text-secondary">
                Daily authority ({currency})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={newDaily}
                onChange={(event) => setNewDaily(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface-inset px-3 text-sm font-semibold tabular-nums text-text-primary outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-text-secondary">
                Per purchase ({currency})
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={newPerPurchase}
                onChange={(event) => setNewPerPurchase(event.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface-inset px-3 text-sm font-semibold tabular-nums text-text-primary outline-none focus:border-accent"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleSaveLimits()}
              disabled={isSaving}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-semibold text-white disabled:opacity-45"
            >
              <CheckIcon className="h-4 w-4" />
              {isSaving ? "Saving…" : "Save limits"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-danger-soft px-3.5 py-3 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-xs font-semibold text-text-primary">Agent control</div>
        <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
          {agentStatus === "DRAFT"
            ? "Fund the execution wallet first. Murk activates the agent only after the transfer is confirmed on Celo."
            : agentStatus === "DISABLED"
              ? "This agent is disabled and cannot make new purchases."
              : "Pausing prevents new purchases before any transaction is signed."}
        </p>

        <button
          type="button"
          onClick={() => void togglePause()}
          disabled={!canTogglePause}
          className={[
            "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-inset disabled:text-text-tertiary",
            canTogglePause
              ? isPaused
                ? "border-success/25 bg-success-soft text-success"
                : "border-danger/20 bg-danger-soft text-danger"
              : "",
          ].join(" ")}
        >
          {isPaused ? (
            <PlayIcon className="h-4 w-4" strokeWidth={1.9} />
          ) : (
            <PauseIcon className="h-4 w-4" strokeWidth={1.9} />
          )}
          {canTogglePause
            ? isPaused
              ? "Resume agent"
              : "Pause agent"
            : "Agent not active"}
        </button>
      </div>

      <div className="mt-5 flex items-start gap-2.5 border-t border-border pt-4">
        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.9} />
        <p className="text-[11px] leading-relaxed text-text-secondary">
          The execution wallet is isolated from your Portal wallet. Spending
          policy is checked before signing.
        </p>
      </div>
    </section>
  )
}
