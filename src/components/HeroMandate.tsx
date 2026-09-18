"use client"

import { useState } from "react"
import { formatMoneyMinor } from "@/core/money"
import {
  EyeIcon,
  PauseIcon,
  PlayIcon,
  SlidersIcon,
  WalletIcon,
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

function currencyLabel(currency: string) {
  return currency === "USD" ? "$" : currency
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
  const [hidden, setHidden] = useState(false)

  const dailyLimitFormatted = formatMoneyMinor(dailyLimitMinor, 2)
  const spentFormatted = formatMoneyMinor(spentTodayMinor, 2)
  const remainingMinor =
    dailyLimitMinor > spentTodayMinor ? dailyLimitMinor - spentTodayMinor : 0n
  const remainingFormatted = formatMoneyMinor(remainingMinor, 2)

  const percentage =
    dailyLimitMinor > 0n
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((Number(spentTodayMinor) / Number(dailyLimitMinor)) * 100)
          )
        )
      : 0

  const isPaused = agentStatus === "PAUSED"
  const prefix = currencyLabel(currency)

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-[22px] border border-border bg-surface">
        <div className="flex items-start justify-between px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
              Daily authority
            </div>
            <div className="mt-1 text-xs text-text-secondary">
              {agentName}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                isPaused
                  ? "bg-danger-soft text-danger"
                  : "bg-success-soft text-success",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  isPaused ? "bg-danger" : "bg-success",
                ].join(" ")}
              />
              {isPaused ? "Paused" : "Active"}
            </span>

            <button
              type="button"
              onClick={() => setHidden((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-inset text-text-secondary transition hover:text-text-primary active:scale-[0.98]"
              aria-label={hidden ? "Show authority" : "Hide authority"}
            >
              <EyeIcon className="h-4 w-4" strokeWidth={1.9} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-end gap-2">
            <span className="pb-1 text-sm font-semibold text-text-secondary">
              {prefix}
            </span>
            <div className="text-[36px] font-semibold leading-none tracking-[-0.045em] text-text-primary sm:text-[42px]">
              {hidden ? "••••••" : dailyLimitFormatted}
            </div>
          </div>

          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-surface-inset">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-medium text-text-secondary">
                  Spent today
                </div>
                <div className="mt-1 text-sm font-semibold text-text-primary tabular-nums">
                  {hidden ? "••••" : `${currency} ${spentFormatted}`}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-medium text-text-secondary">
                  Remaining
                </div>
                <div className="mt-1 text-sm font-semibold text-text-primary tabular-nums">
                  {hidden ? "••••" : `${currency} ${remainingFormatted}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-border bg-surface-inset">
          <button
            type="button"
            onClick={onOpenVault}
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 border-r border-border px-2 text-[11px] font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
          >
            <WalletIcon className="h-4 w-4" strokeWidth={1.9} />
            Wallet
          </button>

          <button
            type="button"
            onClick={onTogglePause}
            className={[
              "flex min-h-16 flex-col items-center justify-center gap-1.5 border-r border-border px-2 text-[11px] font-semibold transition",
              isPaused
                ? "text-success hover:bg-success-soft"
                : "text-danger hover:bg-danger-soft",
            ].join(" ")}
          >
            {isPaused ? (
              <PlayIcon className="h-4 w-4" strokeWidth={1.9} />
            ) : (
              <PauseIcon className="h-4 w-4" strokeWidth={1.9} />
            )}
            {isPaused ? "Resume" : "Pause"}
          </button>

          <button
            type="button"
            onClick={onEditLimits}
            className="flex min-h-16 flex-col items-center justify-center gap-1.5 px-2 text-[11px] font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
          >
            <SlidersIcon className="h-4 w-4" strokeWidth={1.9} />
            Limits
          </button>
        </div>
      </div>
    </section>
  )
}
