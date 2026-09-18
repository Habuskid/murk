"use client"

import type { FormEvent } from "react"
import { useMemo, useState } from "react"
import { authedFetch } from "@/lib/authed-fetch"
import {
  BotIcon,
  MurkLogoIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "@/components/Icons"

const CURRENCIES = ["NGN", "KES", "BRL", "MXN", "COP", "AED", "SAR", "INR"] as const

function decimalToMinorUnits(value: string): string {
  const normalized = value.trim()
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error("Enter a valid amount with up to 2 decimal places")
  }

  const [whole, fraction = ""] = normalized.split(".")
  return (
    BigInt(whole) * 100n +
    BigInt((fraction + "00").slice(0, 2))
  ).toString()
}

function formatPreview(value: string) {
  const number = Number(value.replace(/,/g, ""))
  if (!Number.isFinite(number)) return value
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}

export function AgentOnboarding({
  onCreated,
}: {
  onCreated: () => Promise<void> | void
}) {
  const [name, setName] = useState("Research Agent")
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>("NGN")
  const [dailyLimit, setDailyLimit] = useState("5000")
  const [perPurchaseLimit, setPerPurchaseLimit] = useState("2000")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () => ({
      daily: formatPreview(dailyLimit),
      perPurchase: formatPreview(perPurchaseLimit),
    }),
    [dailyLimit, perPurchaseLimit]
  )

  const createAgent = async (event: FormEvent) => {
    event.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      const dailyLimitMinor = decimalToMinorUnits(dailyLimit)
      const perPurchaseLimitMinor = decimalToMinorUnits(perPurchaseLimit)

      if (BigInt(perPurchaseLimitMinor) > BigInt(dailyLimitMinor)) {
        throw new Error("Per-purchase limit cannot exceed the daily authority")
      }

      const response = await authedFetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          accountingCurrency: currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          dailyLimitMinor,
          perPurchaseLimitMinor,
          allowedAssets: ["USDC", "USDT"],
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Could not create the agent")
      }

      await onCreated()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create the agent"
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-3rem)] items-center py-8">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="mb-6 flex items-center gap-3 px-1">
          <MurkLogoIcon className="h-9 w-9" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.08em] text-text-primary">
              MURK
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              Create your execution agent
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
            <div>
              <div className="text-xs font-medium text-text-secondary">
                Agent setup
              </div>
              <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em] text-text-primary">
                Set the spending boundary
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                Choose the currency you think in and the maximum authority this
                agent receives.
              </p>
            </div>

            <form onSubmit={createAgent} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Agent name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={64}
                  className="h-12 w-full rounded-xl border border-border bg-surface-inset px-3.5 text-sm font-semibold text-text-primary outline-none transition focus:border-accent focus:bg-surface"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                  Accounting currency
                </span>
                <select
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value as (typeof CURRENCIES)[number])
                  }
                  className="h-12 w-full rounded-xl border border-border bg-surface-inset px-3.5 text-sm font-semibold text-text-primary outline-none focus:border-accent focus:bg-surface"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Daily authority
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dailyLimit}
                    onChange={(event) => setDailyLimit(event.target.value)}
                    className="h-12 w-full min-w-0 rounded-xl border border-border bg-surface-inset px-3.5 text-sm font-semibold tabular-nums text-text-primary outline-none focus:border-accent focus:bg-surface"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-medium text-text-secondary">
                    Per purchase
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={perPurchaseLimit}
                    onChange={(event) => setPerPurchaseLimit(event.target.value)}
                    className="h-12 w-full min-w-0 rounded-xl border border-border bg-surface-inset px-3.5 text-sm font-semibold tabular-nums text-text-primary outline-none focus:border-accent focus:bg-surface"
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-xl bg-danger-soft px-3.5 py-3 text-xs text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <BotIcon className="h-4 w-4" strokeWidth={1.9} />
                {isCreating ? "Creating agent…" : "Create agent"}
              </button>
            </form>
          </section>

          <aside className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
            <div className="text-xs font-medium text-text-secondary">
              Authority preview
            </div>
            <div className="mt-1 text-lg font-semibold tracking-[-0.02em] text-text-primary">
              {name.trim() || "Your agent"}
            </div>

            <div className="mt-5 overflow-hidden rounded-[14px] border border-border">
              <div className="flex items-center justify-between gap-4 bg-surface-inset px-4 py-4">
                <div className="text-xs text-text-secondary">Daily authority</div>
                <div className="text-base font-semibold text-text-primary tabular-nums">
                  {currency} {preview.daily}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-inset px-4 py-4">
                <div className="text-xs text-text-secondary">Per purchase</div>
                <div className="text-base font-semibold text-text-primary tabular-nums">
                  {currency} {preview.perPurchase}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4 border-t border-border pt-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.9} />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Enforced before payment
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                    A purchase outside these limits is blocked before signing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <WalletIcon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.9} />
                <div>
                  <div className="text-xs font-semibold text-text-primary">
                    Separate execution wallet
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                    Murk creates an isolated Celo wallet for delegated agent funds.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-text-secondary">
              Settlement assets for this build: USDC and USDT on Celo.
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
