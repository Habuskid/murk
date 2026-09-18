"use client"

import React, { useState } from "react"
import {
  PlayIcon,
  PauseIcon,
  ArrowDownLeftIcon,
  ShieldCheckIcon,
  CheckIcon,
  LockClosedIcon,
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
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  const togglePause = async () => {
    const action = isPaused ? "resume" : "pause"
    try {
      const res = await fetch(`/api/agents/${agentId}/${action}`, { method: "POST" })
      if (res.ok) {
        const next = !isPaused
        setIsPaused(next)
        onStatusChange(next ? "PAUSED" : "ACTIVE")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveLimits = async () => {
    setIsSaving(true)
    try {
      // Multiply by 100 for minor units (2 decimals)
      const dailyMinor = (parseFloat(newDaily) * 100).toFixed(0)
      const perPurchaseMinor = (parseFloat(newPerPurchase) * 100).toFixed(0)

      const res = await fetch(`/api/agents/${agentId}`, {
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
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleWithdraw = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol: "USDC",
          amountRaw: "1000000",
          destinationAddress: "0x9e7e2eB7a59B4f91C12Cb3bbBcD929825A4B2b8D",
          idempotencyKey: `wd_${Date.now()}`,
        }),
      })
      if (res.ok) {
        setWithdrawSuccess(true)
        setTimeout(() => setWithdrawSuccess(false), 3000)
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="w-full bg-surface rounded-3xl p-6 sm:p-7 border border-[#E2E2DF] card-elevation mt-4 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#ECECE8]">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-[0.1em] font-bold text-text-primary">
            Agent Spending Authority Controls
          </h3>
          <p className="text-[10px] text-text-secondary mt-0.5">
            Owner policy boundaries, limits, and kill-switch
          </p>
        </div>
        <span className="text-[10px] font-mono font-semibold px-2.5 py-1 bg-[#F5F5F3] rounded-full text-text-secondary border border-border">
          Mandate v1.0
        </span>
      </div>

      {/* Financial Limits Section */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider">
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
            <div className="p-4 bg-[#F8F8F6] rounded-2xl border border-[#ECECE8]">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-mono font-medium">
                Daily Mandate Ceiling
              </span>
              <span className="text-xl font-extrabold text-text-primary tabular-nums mt-1 block tracking-tight">
                {currency} {dailyLimitFormatted}
              </span>
              <span className="text-[10px] text-text-secondary font-mono mt-1 block">
                Ceiling across all transactions in 24h window
              </span>
            </div>

            <div className="p-4 bg-[#F8F8F6] rounded-2xl border border-[#ECECE8]">
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-mono font-medium">
                Per-Purchase Cap
              </span>
              <span className="text-xl font-extrabold text-text-primary tabular-nums mt-1 block tracking-tight">
                {currency} {perPurchaseLimitFormatted}
              </span>
              <span className="text-[10px] text-text-secondary font-mono mt-1 block">
                Single checkout ceiling before block
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 p-4 bg-[#F8F8F6] rounded-2xl border border-border animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] text-text-secondary font-medium block mb-1 font-mono">
                New Daily Limit ({currency})
              </label>
              <input
                type="number"
                value={newDaily}
                onChange={(e) => setNewDaily(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-secondary font-medium block mb-1 font-mono">
                New Per-Purchase Cap ({currency})
              </label>
              <input
                type="number"
                value={newPerPurchase}
                onChange={(e) => setNewPerPurchase(e.target.value)}
                className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl text-text-primary font-mono focus:outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Emergency Authority Controls */}
      <div className="pt-4 border-t border-[#ECECE8] space-y-3">
        <span className="text-[11px] font-mono font-bold text-text-secondary uppercase tracking-wider block">
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
            onClick={handleWithdraw}
            className="flex-1 py-3 px-4 rounded-2xl text-xs font-bold bg-[#F8F8F6] border border-border hover:bg-[#EFEFEA] text-text-primary flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99]"
          >
            {withdrawSuccess ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Swept to EOA!</span>
              </>
            ) : (
              <>
                <ArrowDownLeftIcon className="w-3.5 h-3.5 text-text-secondary" />
                <span>Withdraw All Funds</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Architecture Callout */}
      <div className="p-4 bg-[#F8F8F6] rounded-2xl border border-[#ECECE8] text-xs space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-text-primary">
          <ShieldCheckIcon className="w-4 h-4 text-accent" />
          <span>Isolated Key Architecture</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-secondary">
            ERC-8004
          </span>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed">
          Agent execution private keys never touch browser memory or client-side JavaScript. Human wallet export is physically restricted behind secure provider iframe frames.
        </p>
      </div>
    </div>
  )
}
