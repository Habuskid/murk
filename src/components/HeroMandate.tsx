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
    <div className="space-y-3.5">
      {/* 1. Total Balance Card (Reference UI Screen 2) */}
      <div className="w-full bg-surface rounded-[28px] p-6 sm:p-7 border border-[#E8E8E5] card-elevation transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Total Balance
          </span>
          <button
            onClick={() => setBalanceHidden(!balanceHidden)}
            className="w-8 h-8 rounded-full bg-[#F8F8F6] border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors active:scale-95"
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
              <span className="text-2xl sm:text-3xl font-bold mr-1 text-text-primary">{currency === "USD" ? "$" : currency}</span>
              {dailyLimitFormatted}
            </>
          )}
        </div>

        {/* Inset Two-Column Summary Block (Reference: Payment Next & Payment Completed) */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#F0F0EE]">
          <div className="bg-[#F8F8F6] rounded-2xl p-3.5 border border-[#EBEBE7]">
            <span className="text-xs text-text-secondary block font-medium">Spent Today</span>
            <span className="text-sm sm:text-base font-bold text-text-primary tabular-nums mt-0.5 block">
              {balanceHidden ? "••••••" : `${currency} ${spentFormatted}`}
            </span>
          </div>
          <div className="bg-[#F8F8F6] rounded-2xl p-3.5 border border-[#EBEBE7]">
            <span className="text-xs text-text-secondary block font-medium">Remaining Authority</span>
            <span className="text-sm sm:text-base font-bold text-text-primary tabular-nums mt-0.5 block">
              {balanceHidden ? "••••••" : `${currency} ${remainingFormatted}`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quick Action Pills (Reference UI Screen 1, beneath hero) */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={onOpenVault}
          className="flex flex-col items-center justify-center py-3.5 px-2 bg-surface rounded-2xl border border-[#E8E8E5] card-elevation hover:border-text-secondary/40 transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-text-primary mb-1.5">
            <WalletIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-text-primary">Vault Keys</span>
        </button>

        <button
          onClick={onTogglePause}
          className="flex flex-col items-center justify-center py-3.5 px-2 bg-surface rounded-2xl border border-[#E8E8E5] card-elevation hover:border-text-secondary/40 transition-all active:scale-95"
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
            isPaused ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          }`}>
            {isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
          </div>
          <span className="text-xs font-semibold text-text-primary">
            {isPaused ? "Unfreeze" : "Freeze Agent"}
          </span>
        </button>

        <button
          onClick={onEditLimits}
          className="flex flex-col items-center justify-center py-3.5 px-2 bg-surface rounded-2xl border border-[#E8E8E5] card-elevation hover:border-text-secondary/40 transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-text-primary mb-1.5">
            <SlidersIcon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-text-primary">Policy Limits</span>
        </button>
      </div>

      {/* 3. Spending Limits Card with Scrubber + Hatched Bar (Reference UI Screen 2: "Card Limits") */}
      <div className="w-full bg-surface rounded-[28px] p-6 border border-[#E8E8E5] card-elevation transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary">Spending Limits</h3>
          <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
            isPaused ? "bg-danger-soft text-danger border-danger/30" : "bg-success-soft text-success border-success/30"
          }`}>
            {isPaused ? "Frozen" : "Active"}
          </span>
        </div>

        {/* Reference Slider / Hatched Track */}
        <div className="relative w-full h-7 bg-[#F0F0EE] rounded-full p-1 flex items-center overflow-hidden border border-[#E8E8E5]">
          {/* Hatched background for available capacity */}
          <div className="absolute inset-0 hatched-bar opacity-80" />

          {/* Active progress track */}
          <div
            className="relative h-full bg-accent rounded-full transition-all duration-300 flex items-center justify-end pr-0.5 shadow-xs"
            style={{ width: `${Math.max(percentage, 5)}%` }}
          >
            {/* Scrubber knob */}
            <div className="w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
          </div>
        </div>

        {/* Limit Numbers Row */}
        <div className="flex justify-between items-center mt-3 text-xs">
          <span className="text-text-secondary font-medium">Today Limits</span>
          <span className="font-bold text-text-primary font-mono tabular-nums">
            {currency} {spentFormatted} / <span className="text-text-secondary">{currency} {dailyLimitFormatted}</span>
          </span>
        </div>

        {/* Set limits link button (Reference: "Set card limits ->") */}
        <button
          onClick={onEditLimits}
          className="w-full mt-4 pt-3.5 border-t border-[#F0F0EE] flex items-center justify-between text-xs font-semibold text-text-primary hover:text-accent transition-colors group"
        >
          <span>Set spending limits</span>
          <ArrowRightIcon className="w-4 h-4 text-text-secondary group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
        </button>
      </div>
    </div>
  )
}
