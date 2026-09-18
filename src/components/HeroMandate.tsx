"use client"

import React, { useState } from "react"
import { formatMoneyMinor } from "@/core/money"
import {
  EyeIcon,
  ArrowRightIcon,
  PauseIcon,
  PlayIcon,
  WalletIcon,
  SlidersIcon,
} from "@/components/Icons"

interface HeroMandateProps {
  currency: string
  dailyLimitMinor: bigint
  spentTodayMinor: bigint
  agentStatus: "ACTIVE" | "PAUSED" | "DRAFT" | "DISABLED"
  agentName: string
  onEditLimits?: () => void
  onTogglePause?: () => void
  onOpenVault?: () => void
}

export function HeroMandate({
  currency,
  dailyLimitMinor,
  spentTodayMinor,
  agentStatus,
  agentName,
  onEditLimits,
  onTogglePause,
  onOpenVault,
}: HeroMandateProps) {
  const [balanceHidden, setBalanceHidden] = useState(false)

  const dailyLimitFormatted = formatMoneyMinor(dailyLimitMinor, 2)
  const spentFormatted = formatMoneyMinor(spentTodayMinor, 2)

  const remainingMinor = dailyLimitMinor > spentTodayMinor ? dailyLimitMinor - spentTodayMinor : 0n
  const remainingFormatted = formatMoneyMinor(remainingMinor, 2)

  // Calculate percentage (clamped between 4% and 100% for visual scrubber knob)
  const rawPercentage = dailyLimitMinor > 0n
    ? Math.round((Number(spentTodayMinor) / Number(dailyLimitMinor)) * 100)
    : 0
  const percentage = Math.min(100, Math.max(rawPercentage > 0 ? 6 : 0, rawPercentage))

  const isPaused = agentStatus === "PAUSED"

  return (
    <div className="space-y-4">
      {/* 1. Total Balance Hero Card (Reference UI Screen 2) */}
      <div className="w-full bg-surface rounded-[28px] p-6 sm:p-7 border border-border card-elevation transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Total Balance
          </span>
          <button
            onClick={() => setBalanceHidden(!balanceHidden)}
            className="w-8 h-8 rounded-full bg-surface-inset border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95"
            title={balanceHidden ? "Show balance" : "Hide balance"}
          >
            <EyeIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Big Display Balance */}
        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary tabular-nums">
          {balanceHidden ? (
            "••••••••••"
          ) : (
            <>
              <span className="text-2xl sm:text-3xl font-bold mr-1 text-text-primary">
                {currency === "USD" ? "$" : currency}
              </span>
              {dailyLimitFormatted}
            </>
          )}
        </div>

        {/* Inset Two-Column Summary Block (Reference: Payment Next & Payment Completed) */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-border">
          <div className="bg-surface-inset rounded-2xl p-4 border border-border">
            <span className="text-xs text-text-secondary block font-medium">Spent Today</span>
            <span className="text-base font-bold text-text-primary tabular-nums mt-1 block">
              {balanceHidden ? "••••••" : `${currency} ${spentFormatted}`}
            </span>
          </div>
          <div className="bg-surface-inset rounded-2xl p-4 border border-border">
            <span className="text-xs text-text-secondary block font-medium">Remaining Authority</span>
            <span className="text-base font-bold text-text-primary tabular-nums mt-1 block">
              {balanceHidden ? "••••••" : `${currency} ${remainingFormatted}`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Pills (Reference UI Screen 1, beneath hero) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={onOpenVault}
          className="flex flex-col items-center justify-center py-4 px-2 bg-surface rounded-2xl border border-border card-elevation hover:border-accent/40 transition-all active:scale-95 group"
        >
          <div className="w-11 h-11 rounded-full bg-surface-hover flex items-center justify-center text-text-primary mb-2 group-hover:bg-surface-inset transition-colors">
            <WalletIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-text-primary">Vault Keys</span>
        </button>

        <button
          onClick={onTogglePause}
          className="flex flex-col items-center justify-center py-4 px-2 bg-surface rounded-2xl border border-border card-elevation hover:border-accent/40 transition-all active:scale-95 group"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-colors ${
            isPaused ? "bg-success-soft text-success" : "bg-surface-hover text-text-primary group-hover:bg-surface-inset"
          }`}>
            {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
          </div>
          <span className="text-xs font-semibold text-text-primary">
            {isPaused ? "Unfreeze" : "Freeze Agent"}
          </span>
        </button>

        <button
          onClick={onEditLimits}
          className="flex flex-col items-center justify-center py-4 px-2 bg-surface rounded-2xl border border-border card-elevation hover:border-accent/40 transition-all active:scale-95 group"
        >
          <div className="w-11 h-11 rounded-full bg-surface-hover flex items-center justify-center text-text-primary mb-2 group-hover:bg-surface-inset transition-colors">
            <SlidersIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-text-primary">Policy Limits</span>
        </button>
      </div>

      {/* 3. Spending Limits Card with Sleek Figma Progress Line */}
      <div className="w-full bg-surface rounded-[28px] p-6 border border-border card-elevation transition-all">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Daily Spending Limit</h3>
            <p className="text-xs text-text-secondary mt-0.5">Autonomous mandate ceiling</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            isPaused ? "bg-danger-soft text-danger border-danger/30" : "bg-success-soft text-success border-success/30"
          }`}>
            {isPaused ? "Frozen" : "Active"}
          </span>
        </div>

        {/* Metrics & Sleek Progress Line */}
        <div className="mt-4 pt-4 border-t border-border space-y-2.5">
          <div className="flex items-baseline justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-text-secondary font-medium">Utilization</span>
              <span className="font-bold text-text-primary tabular-nums">{rawPercentage}%</span>
            </div>
            <div className="tabular-nums">
              <span className="font-bold text-text-primary">{currency} {spentFormatted}</span>
              <span className="text-text-secondary font-normal"> / {currency} {dailyLimitFormatted}</span>
            </div>
          </div>

          {/* Sleek 6px Figma Progress Track */}
          <div className="w-full h-2 bg-surface-inset rounded-full overflow-hidden border border-border/70">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, rawPercentage))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-text-secondary pt-0.5">
            <span>Resets every 24h</span>
            <span>Remaining: <strong className="font-semibold text-text-primary tabular-nums">{currency} {remainingFormatted}</strong></span>
          </div>
        </div>

        {/* Set limits link button */}
        <button
          onClick={onEditLimits}
          className="w-full mt-4 pt-3.5 border-t border-border flex items-center justify-between text-xs font-semibold text-text-primary hover:text-accent transition-colors group"
        >
          <span>Configure policy thresholds</span>
          <ArrowRightIcon className="w-3.5 h-3.5 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  )
}
