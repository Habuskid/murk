"use client"

import React from "react"
import { formatMoneyMinor } from "@/core/money"
import { CheckIcon, PauseIcon, ShieldCheckIcon } from "@/components/Icons"

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
    <div className="relative w-full bg-surface rounded-3xl p-6 sm:p-7 border border-[#E2E2DF] hero-elevation overflow-hidden transition-all duration-300">
      {/* Top subtle highlight shimmer */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

      {/* Top Meta Bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-secondary font-semibold">
            Mandate Authority
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F0EE] text-text-secondary font-mono">
            EIP-712
          </span>
        </div>

        <div
          className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border transition-colors ${
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

      {/* Hero Limit Big Display */}
      <div className="mb-5">
        <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider mb-1">
          Daily Spending Authority
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-mono font-bold text-accent">
            {currency}
          </span>
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary tabular-nums">
            {dailyLimitFormatted}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-accent" />
          <span>Bound to agent: <strong className="text-text-primary font-medium">{agentName}</strong></span>
        </div>
      </div>

      {/* Inset Metrics Sub-Card */}
      <div className="bg-[#F8F8F6] rounded-2xl p-4 border border-[#ECECE8] space-y-3.5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] text-text-secondary uppercase tracking-wider block font-medium">
              Spent Today
            </span>
            <span className="text-lg font-bold text-text-primary tabular-nums mt-0.5 block">
              {currency} {spentFormatted}
            </span>
          </div>
          <div className="border-l border-border pl-4">
            <span className="text-[11px] text-text-secondary uppercase tracking-wider block font-medium">
              Remaining
            </span>
            <span className="text-lg font-bold text-text-primary tabular-nums mt-0.5 block">
              {currency} {remainingFormatted}
            </span>
          </div>
        </div>

        {/* Precision Progress Bar */}
        <div>
          <div className="relative w-full bg-[#E5E5E0] h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentage > 90
                  ? "bg-danger"
                  : percentage > 70
                  ? "bg-amber-500"
                  : "bg-accent"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[11px] text-text-secondary font-mono">
            <span>{percentage}% utilized</span>
            <span>Resets at 00:00 UTC</span>
          </div>
        </div>
      </div>
    </div>
  )
}
