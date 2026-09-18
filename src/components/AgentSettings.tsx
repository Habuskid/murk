"use client"

import React, { useState } from "react"

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
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Agent Spending Authority Controls</h3>
        <span className="text-xs text-text-secondary">Owner Policy</span>
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
              className="text-xs font-semibold text-accent hover:underline"
            >
              Edit Limits
            </button>
          ) : (
            <button
              onClick={handleSaveLimits}
              disabled={isSaving}
              className="text-xs font-semibold text-success hover:underline"
            >
              {isSaving ? "Saving..." : "Save New Version"}
            </button>
          )}
        </div>

        {!editMode ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background rounded-2xl border border-border/50">
              <span className="text-[11px] text-text-secondary block">Daily Authority</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {currency} {dailyLimitFormatted}
              </span>
            </div>
            <div className="p-3 bg-background rounded-2xl border border-border/50">
              <span className="text-[11px] text-text-secondary block">Per-Purchase Limit</span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {currency} {perPurchaseLimitFormatted}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-3 bg-background rounded-2xl border border-border">
            <div>
              <label className="text-[11px] text-text-secondary block mb-1">New Daily Limit</label>
              <input
                type="number"
                value={newDaily}
                onChange={(e) => setNewDaily(e.target.value)}
                className="w-full p-2 text-xs bg-surface border border-border rounded-xl text-text-primary font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-secondary block mb-1">New Per-Purchase Limit</label>
              <input
                type="number"
                value={newPerPurchase}
                onChange={(e) => setNewPerPurchase(e.target.value)}
                className="w-full p-2 text-xs bg-surface border border-border rounded-xl text-text-primary font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Emergency Controls */}
      <div className="pt-2 border-t border-border space-y-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
          Emergency Authority Controls
        </span>

        <div className="flex gap-2.5">
          <button
            onClick={togglePause}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all ${
              isPaused
                ? "bg-success-soft text-success border-success/30 hover:bg-success/15"
                : "bg-danger-soft text-danger border-danger/30 hover:bg-danger/15"
            }`}
          >
            {isPaused ? "▶ Resume Agent Authority" : "⏸ Emergency Pause Agent"}
          </button>

          <button
            onClick={handleWithdraw}
            className="flex-1 py-2.5 px-3 rounded-2xl text-xs font-semibold bg-background border border-border hover:bg-neutral-100 text-text-primary transition-all"
          >
            {withdrawSuccess ? "Withdrawn to EOA!" : "↩ Withdraw All Funds"}
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="p-3 bg-background rounded-2xl border border-border/50 text-[11px] text-text-secondary space-y-1">
        <div className="font-semibold text-text-primary">🛡️ Isolated Key Security</div>
        <div>
          Agent execution keys never reach browser JavaScript. Human wallet export is isolated via provider frames.
        </div>
      </div>
    </div>
  )
}
