"use client"

import React from "react"
import { formatMoneyMinor } from "@/core/money"

interface HeroMandateProps {
  currency: string
  dailyLimitMinor: bigint
  spentTodayMinor: bigint
  agentStatus: "ACTIVE" | "PAUSED" | "DRAFT" | "DISABLED"
  agentName: string
}

export function HeroMandate({
  currency,
  dailyLimitMinor,
  spentTodayMinor,
  agentStatus,
  agentName,
}: HeroMandateProps) {
  const dailyLimitFormatted = formatMoneyMinor(dailyLimitMinor, 2)
  const spentFormatted = formatMoneyMinor(spentTodayMinor, 2)

  const remainingMinor = dailyLimitMinor > spentTodayMinor ? dailyLimitMinor - spentTodayMinor : 0n
  const remainingFormatted = formatMoneyMinor(remainingMinor, 2)

  // Calculate percentage
  const percentage = dailyLimitMinor > 0n
    ? Math.min(100, Math.round((Number(spentTodayMinor) / Number(dailyLimitMinor)) * 100))
    : 0

  const isPaused = agentStatus === "PAUSED"

  return (
    <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border transition-all duration-300">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Daily Spending Authority
          </span>
        </div>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
            isPaused
              ? "bg-danger-soft text-danger"
              : "bg-success-soft text-success"
          }`}
        >
          {isPaused ? "Paused" : "Active"}
        </span>
      </div>

      {/* Hero Limit */}
      <div className="mb-6">
        <div className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary tabular-nums">
          {currency} {dailyLimitFormatted}
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Governing agent: <span className="text-text-primary font-medium">{agentName}</span>
        </p>
      </div>

      {/* Spent vs Remaining Columns */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border/60">
        <div>
          <span className="text-xs text-text-secondary block mb-0.5">Spent Today</span>
          <span className="text-base font-semibold text-text-primary tabular-nums">
            {currency} {spentFormatted}
          </span>
        </div>
        <div>
          <span className="text-xs text-text-secondary block mb-0.5">Remaining Authority</span>
          <span className="text-base font-semibold text-text-primary tabular-nums">
            {currency} {remainingFormatted}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-[#E8E8E5] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              percentage > 90 ? "bg-danger" : percentage > 70 ? "bg-amber-500" : "bg-accent"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2 text-[11px] text-text-secondary">
          <span>{percentage}% authority utilized</span>
          <span>Resets at midnight UTC</span>
        </div>
      </div>
    </div>
  )
}
