"use client"

import React, { useEffect, useState } from "react"
import { authedFetch } from "@/lib/authed-fetch"
import {
  PlayIcon,
  PauseIcon,
  ArrowDownLeftIcon,
  ShieldCheckIcon,
  CheckIcon,
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
  const [editMode, setEditMode] = useState(false)
  const [newDaily, setNewDaily] = useState(dailyLimitFormatted.replace(/,/g, ""))
  const [newPerPurchase, setNewPerPurchase] = useState(perPurchaseLimitFormatted.replace(/,/g, ""))
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
    const paddedFraction = (fraction + "00").slice(0, 2)
    return (BigInt(whole) * 100n + BigInt(paddedFraction)).toString()
  }

  const togglePause = async () => {
    const action = isPaused ? "resume" : "pause"
    try {
      setError(null)
      const res = await authedFetch(`/api/agents/${agentId}/${action}`, { method: "POST" })
      if (res.ok) {
        const next = !isPaused
        setIsPaused(next)
        onStatusChange(next ? "PAUSED" : "ACTIVE")
      }
      else {
        const body = await res.json().catch(() => ({}))
        setError(body.error || "Could not update agent status")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update agent status")
    }
  }

  const handleSaveLimits = async () => {
    setIsSaving(true)
    try {
      const dailyMinor = decimalToMinorUnits(newDaily)
      const perPurchaseMinor = decimalToMinorUnits(newPerPurchase)

      setError(null)
      const res = await authedFetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyLimitMinor: dailyMinor,
          perPurchaseLimitMinor: perPurchaseMinor,
        }),
      })

      if (res.ok) {
        setEditMode(false)
        onLimitsUpdated(newDaily, newPerPurchase)
      } else {
        const body = await res.json().catch(() => ({}))
        setError(body.error || "Could not update mandate")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update mandate")
    } finally {
      setIsSaving(false)
    }
  }



  return (
    <div className="w-full bg-surface rounded-[28px] p-6 sm:p-7 border border-border card-elevation mt-4 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            Agent Spending Authority Controls
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Owner policy boundaries, limits, and kill-switch
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-surface-inset rounded-full text-text-secondary border border-border">
          Mandate v1.0
        </span>
      </div>

      {/* Financial Limits Section */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-text-secondary">
            Mandate Thresholds ({currency})
          </span>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              Edit Thresholds
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(false)}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLimits}
                disabled={isSaving}
                className="text-xs font-bold text-success hover:text-success/80 transition-colors flex items-center gap-1"
              >
                {isSaving ? "Saving..." : (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Save Mandate</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {!editMode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-surface-inset rounded-2xl border border-border">
              <span className="text-xs text-text-secondary block font-medium">
                Daily Mandate Ceiling
              </span>
              <span className="text-2xl font-extrabold text-text-primary tabular-nums mt-1 block tracking-tight">
                {currency} {dailyLimitFormatted}
              </span>
              <span className="text-xs text-text-secondary mt-1 block">
                Ceiling across all transactions in 24h window
              </span>
            </div>

            <div className="p-4 bg-surface-inset rounded-2xl border border-border">
              <span className="text-xs text-text-secondary block font-medium">
                Per-Purchase Cap
              </span>
              <span className="text-2xl font-extrabold text-text-primary tabular-nums mt-1 block tracking-tight">
                {currency} {perPurchaseLimitFormatted}
              </span>
              <span className="text-xs text-text-secondary mt-1 block">
                Single checkout ceiling before block
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 p-4 bg-surface-inset rounded-2xl border border-border animate-in fade-in duration-150">
            <div>
              <label className="text-xs text-text-secondary font-medium block mb-1">
                New Daily Limit ({currency})
              </label>
              <input
                type="number"
                value={newDaily}
                onChange={(e) => setNewDaily(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent transition-colors tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-medium block mb-1">
                New Per-Purchase Cap ({currency})
              </label>
              <input
                type="number"
                value={newPerPurchase}
                onChange={(e) => setNewPerPurchase(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl text-text-primary focus:outline-none focus:border-accent transition-colors tabular-nums"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Emergency Authority Controls */}
      <div className="pt-4 border-t border-border space-y-3">
        <span className="text-xs font-semibold text-text-secondary block">
          Emergency Authority Controls
        </span>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={togglePause}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] ${
              isPaused
                ? "bg-success-soft text-success border-success/30 hover:bg-success/15"
                : "bg-danger-soft text-danger border-danger/30 hover:bg-danger/15"
            }`}
          >
            {isPaused ? (
              <>
                <PlayIcon className="w-3.5 h-3.5" />
                <span>Resume Agent Authority</span>
              </>
            ) : (
              <>
                <PauseIcon className="w-3.5 h-3.5" />
                <span>Emergency Pause Agent</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled
            className="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-surface-inset border border-border text-text-secondary flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
            title="Enabled after the authenticated user wallet is wired"
          >
            <ArrowDownLeftIcon className="w-3.5 h-3.5 text-text-secondary" />
            <span>Withdraw Funds</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-4 bg-surface-inset rounded-2xl border border-border text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-text-primary">
          <ShieldCheckIcon className="w-4 h-4 text-accent" />
          <span>Isolated Execution Wallet</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Agent signing material stays server-side. User-wallet recovery is only enabled after the real embedded-wallet export flow is integrated and verified.
        </p>
      </div>
    </div>
  )
}
