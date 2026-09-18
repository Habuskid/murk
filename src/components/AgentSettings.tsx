"use client"

import React, { useState } from "react"
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
    <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border mt-4 space-y-5">
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Agent Spending Authority Controls</h3>
          <p className="text-xs text-text-secondary mt-0.5">Policy limits and autonomous key management</p>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-background rounded-full text-text-secondary border border-border/70">
          Owner Policy
        </span>
      </div>

      {/* Financial Limits Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Mandate Thresholds ({currency})
          </span>
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              Edit Limits
            </button>
          ) : (
            <button
              onClick={handleSaveLimits}
              disabled={isSaving}
              className="text-xs font-semibold text-success hover:text-success/80 transition-colors flex items-center gap-1"
            >
              {isSaving ? "Saving..." : (
                <>
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Save New Version</span>
                </>
              )}
            </button>
          )}
        </div>

        {!editMode ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-background rounded-2xl border border-border/60">
              <span className="text-[11px] text-text-secondary block font-medium">Daily Authority</span>
              <span className="text-base font-bold text-text-primary tabular-nums mt-0.5 block">
                {currency} {dailyLimitFormatted}
              </span>
            </div>
            <div className="p-3.5 bg-background rounded-2xl border border-border/60">
              <span className="text-[11px] text-text-secondary block font-medium">Per-Purchase Limit</span>
              <span className="text-base font-bold text-text-primary tabular-nums mt-0.5 block">
                {currency} {perPurchaseLimitFormatted}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-background rounded-2xl border border-border animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] text-text-secondary font-medium block mb-1">
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
              <label className="text-[11px] text-text-secondary font-medium block mb-1">
                New Per-Purchase Limit ({currency})
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

      {/* Emergency Controls */}
      <div className="pt-3 border-t border-border space-y-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
          Emergency Authority Controls
        </span>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={togglePause}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99] ${
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
            className="flex-1 py-3 px-4 rounded-2xl text-xs font-semibold bg-background border border-border hover:bg-neutral-100 text-text-primary flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.99]"
          >
            {withdrawSuccess ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-success" />
                <span className="text-success">Withdrawn to EOA!</span>
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

      {/* Security Notice */}
      <div className="p-3.5 bg-background rounded-2xl border border-border/60 text-[11px] text-text-secondary space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-text-primary">
          <ShieldCheckIcon className="w-4 h-4 text-accent" />
          <span>Isolated Key Security</span>
        </div>
        <p className="leading-relaxed">
          Agent execution keys never reach browser JavaScript. Human wallet export is isolated via provider frames.
        </p>
      </div>
    </div>
  )
}
