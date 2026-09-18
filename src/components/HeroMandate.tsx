"use client"

import React from "react"
import { formatMoneyMinor } from "@/core/money"
import { CheckIcon, PauseIcon } from "@/components/Icons"

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
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Daily Spending Authority
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            isPaused
              ? "bg-danger-soft text-danger border-danger/30"
              : "bg-success-soft text-success border-success/30"
          }`}
        >
          {isPaused ? (
            <PauseIcon className="w-2.5 h-2.5" />
          ) : (
            <CheckIcon className="w-2.5 h-2.5" />
          )}
          <span>{isPaused ? "Paused" : "Active"}</span>
        </div>
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
          <span className="text-xs text-text-secondary block mb-0.5 font-medium">Spent Today</span>
          <span className="text-base font-bold text-text-primary tabular-nums">
            {currency} {spentFormatted}
          </span>
        </div>
        <div>
          <span className="text-xs text-text-secondary block mb-0.5 font-medium">Remaining Authority</span>
          <span className="text-base font-bold text-text-primary tabular-nums">
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
        <div className="flex justify-between items-center mt-2 text-[11px] text-text-secondary font-medium">
          <span>{percentage}% authority utilized</span>
          <span>Resets at 00:00 UTC</span>
        </div>
      </div>
    </div>
  )
}
