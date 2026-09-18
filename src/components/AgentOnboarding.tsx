"use client"

import React, { FormEvent, useState } from "react"
import { authedFetch } from "@/lib/authed-fetch"

const CURRENCIES = ["NGN", "KES", "BRL", "MXN", "COP", "AED", "SAR", "INR"] as const

function decimalToMinorUnits(value: string): string {
  const normalized = value.trim()
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error("Enter a valid amount with up to 2 decimal places")
  }

  const [whole, fraction = ""] = normalized.split(".")
  return (BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2))).toString()
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

  const createAgent = async (event: FormEvent) => {
    event.preventDefault()
    setIsCreating(true)
    setError(null)

    try {
      const dailyLimitMinor = decimalToMinorUnits(dailyLimit)
      const perPurchaseLimitMinor = decimalToMinorUnits(perPurchaseLimit)

      if (BigInt(perPurchaseLimitMinor) > BigInt(dailyLimitMinor)) {
        throw new Error("Per-purchase limit cannot exceed the daily mandate")
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the agent")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-3rem)] items-center justify-center py-8">
      <section className="w-full rounded-[30px] border border-[#E8E8E5] bg-white p-6 card-elevation sm:p-8">
        <div className="mb-7">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-sm font-black text-white">
            M
          </div>
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-[#111111]">
            Set your agent's authority
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#767676]">
            Define the accounting currency and hard spending limits before the agent receives funds.
          </p>
        </div>

        <form onSubmit={createAgent} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#767676]">
              Agent name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={64}
              className="h-[52px] w-full rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 text-sm font-medium text-[#111111] outline-none transition focus:border-[#2F9CF4] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-[#767676]">
              Accounting currency
            </label>
            <select
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as (typeof CURRENCIES)[number])
              }
              className="h-[52px] w-full rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 text-sm font-semibold text-[#111111] outline-none focus:border-[#2F9CF4] focus:bg-white"
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-xs font-semibold text-[#767676]">
                Daily mandate
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={dailyLimit}
                onChange={(event) => setDailyLimit(event.target.value)}
                className="h-[52px] w-full rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 text-sm font-bold tabular-nums text-[#111111] outline-none focus:border-[#2F9CF4] focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#767676]">
                Per purchase
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={perPurchaseLimit}
                onChange={(event) => setPerPurchaseLimit(event.target.value)}
                className="h-[52px] w-full rounded-2xl border border-[#E8E8E5] bg-[#F7F7F5] px-4 text-sm font-bold tabular-nums text-[#111111] outline-none focus:border-[#2F9CF4] focus:bg-white"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating || !name.trim()}
            className="mt-2 flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#2F9CF4] px-4 text-sm font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreating ? "Creating execution wallet..." : "Create agent"}
          </button>
        </form>
      </section>
    </main>
  )
}
