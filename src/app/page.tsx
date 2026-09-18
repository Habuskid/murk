"use client"

import React, { useState, useEffect } from "react"
import { Navigation, TabKey } from "@/components/Navigation"
import { HeroMandate } from "@/components/HeroMandate"
import { AgentFunds } from "@/components/AgentFunds"
import { PurchaseRunner } from "@/components/PurchaseRunner"
import { ActivityList } from "@/components/ActivityList"
import { AgentSettings } from "@/components/AgentSettings"
import { ActivityItem } from "@/db/repository"
import { OrchestratorReceipt } from "@/services/orchestrator"
import { formatMoneyMinor } from "@/core/money"
import {
  BotIcon,
  CheckIcon,
  ShieldCheckIcon,
  MurkLogoIcon,
  LockClosedIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  BellIcon,
  HeadsetIcon,
  UserIcon,
} from "@/components/Icons"

const SUPPORTED_CURRENCIES: Record<string, { rate: number; daily: bigint; perPurchase: bigint; symbol: string }> = {
  NGN: { rate: 1330, daily: 500000n, perPurchase: 200000n, symbol: "NGN" },
  KES: { rate: 130, daily: 650000n, perPurchase: 250000n, symbol: "KES" },
  BRL: { rate: 5.4, daily: 15000n, perPurchase: 6000n, symbol: "BRL" },
  MXN: { rate: 18.5, daily: 50000n, perPurchase: 20000n, symbol: "MXN" },
  USD: { rate: 1.0, daily: 2500n, perPurchase: 1000n, symbol: "USD" },
}

export default function MurkApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("home")
  const [currency, setCurrency] = useState("NGN")
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [agentStatus, setAgentStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE")
  const [dailyLimitMinor, setDailyLimitMinor] = useState<bigint>(500000n) // 5,000.00
  const [perPurchaseLimitMinor, setPerPurchaseLimitMinor] = useState<bigint>(200000n) // 2,000.00
  const [spentTodayMinor, setSpentTodayMinor] = useState<bigint>(0n)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [walletAddress] = useState<`0x${string}`>("0xfb538BBe2e2b4BC4A53f5916f3998c7bEF6eBCE5")

  const [balances, setBalances] = useState([
    { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6, formattedBalance: "5.00" },
    { symbol: "USDT", address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", decimals: 6, formattedBalance: "10.00" },
  ])

  // Load activity on mount
  useEffect(() => {
    fetch("/api/activity")
      .then((res) => res.json())
      .then((data) => {
        if (data.activity) {
          setActivity(data.activity)
        }
      })
      .catch(() => {})
  }, [])

  const handleTogglePause = async () => {
    const action = agentStatus === "PAUSED" ? "resume" : "pause"
    try {
      const res = await fetch(`/api/agents/agent_demo_01/${action}`, { method: "POST" })
      if (res.ok) {
        setAgentStatus(agentStatus === "PAUSED" ? "ACTIVE" : "PAUSED")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectCurrency = (cur: string) => {
    const config = SUPPORTED_CURRENCIES[cur]
    if (config) {
      setCurrency(cur)
      setDailyLimitMinor(config.daily)
      setPerPurchaseLimitMinor(config.perPurchase)
      setSpentTodayMinor(0n)
      setCurrencyMenuOpen(false)
    }
  }

  const handlePurchaseComplete = (receipt: OrchestratorReceipt) => {
    // If approved, update spent amount and balances
    if (receipt.policyDecision === "APPROVED") {
      const addedSpend = BigInt(receipt.accountingValueMinor || 0)
      setSpentTodayMinor((prev) => prev + addedSpend)

      // Deduct from USDC
      setBalances((prev) =>
        prev.map((b) =>
          b.symbol === "USDC"
            ? { ...b, formattedBalance: Math.max(0, parseFloat(b.formattedBalance) - 1).toFixed(2) }
            : b
        )
      )
    }

    // Prepend to activity
    const newItem: ActivityItem = {
      id: `act_${Date.now()}`,
      purchaseId: receipt.purchaseId,
      agentId: "agent_demo_01",
      agentName: "Research Agent",
      merchantUrl: receipt.merchantUrl,
      type: receipt.policyDecision === "APPROVED" ? "COMPLETED" : "BLOCKED",
      accountingCurrency: receipt.accountingCurrency,
      accountingAmountFormatted: receipt.accountingValueFormatted,
      settlementAsset: receipt.settlementAsset,
      settlementAmountFormatted: receipt.settlementAmountFormatted,
      txHash: receipt.txHash,
      timestamp: new Date(),
      reasonDescription: receipt.humanReadableReasons?.join("; ") || undefined,
    }

    setActivity((prev) => [newItem, ...prev])
  }

  const handleLimitsUpdated = (daily: string, perPurchase: string) => {
    setDailyLimitMinor(BigInt(Math.round(parseFloat(daily) * 100)))
    setPerPurchaseLimitMinor(BigInt(Math.round(parseFloat(perPurchase) * 100)))
  }

  const currentRate = SUPPORTED_CURRENCIES[currency]?.rate || 1330

  return (
    <div className="flex flex-col flex-1 w-full pb-28">
      {/* Top Header (Consumer Fintech Navigation) */}
      <header className="flex items-center justify-between py-4 mb-2 relative">
        {/* Left: Avatar + Brand Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#171717] border border-[#E8E8E5] flex items-center justify-center text-white shadow-xs overflow-hidden">
              <MurkLogoIcon className="w-6 h-6" />
            </div>
            {/* Green Online Dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success ring-2 ring-[#F4F4F2]" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm font-extrabold tracking-tight text-text-primary">MURK</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#E8E8E5] text-text-primary font-bold">
                x402
              </span>
            </div>
            <div className="text-[10px] text-text-secondary font-mono mt-1">Autonomous Spending Authority</div>
          </div>
        </div>

        {/* Right: Controls + Action Icons */}
        <div className="flex items-center gap-2">
          {/* Celo Mainnet Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-surface rounded-full border border-border text-[11px] font-mono font-medium text-text-secondary shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span>Celo</span>
          </div>

          {/* Interactive Currency Switcher */}
          <div className="relative">
            <button
              onClick={() => setCurrencyMenuOpen(!currencyMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-[#F8F8F6] rounded-full border border-border text-[11px] font-mono font-bold text-accent shadow-xs transition-colors active:scale-95"
              title="Change accounting currency"
            >
              <span>{currency}</span>
              <ChevronDownIcon className="w-3 h-3 text-text-secondary" />
            </button>

            {currencyMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-surface rounded-2xl shadow-lg border border-border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[9px] font-mono uppercase tracking-wider text-text-secondary px-2 py-1">
                  Accounting Currency
                </div>
                {Object.keys(SUPPORTED_CURRENCIES).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleSelectCurrency(c)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                      currency === c
                        ? "bg-accent-soft text-accent font-bold"
                        : "text-text-primary hover:bg-[#F8F8F6]"
                    }`}
                  >
                    <span>{c}</span>
                    {currency === c && <CheckIcon className="w-3 h-3 text-accent" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Policy / Settings Quick Button */}
          <button
            onClick={() => setActiveTab("settings")}
            className="w-9 h-9 rounded-full bg-surface hover:bg-[#F8F8F6] border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all active:scale-95 shadow-xs"
            title="Agent Policies"
          >
            <HeadsetIcon className="w-4 h-4" />
          </button>

          {/* Notification Bell with Badge */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative w-9 h-9 rounded-full bg-surface hover:bg-[#F8F8F6] border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-all active:scale-95 shadow-xs"
              title="System Alerts"
            >
              <BellIcon className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface rounded-2xl shadow-xl border border-[#E8E8E5] p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0F0EE]">
                  <span className="text-xs font-bold text-text-primary">System Signals</span>
                  <span className="text-[10px] font-mono text-accent font-semibold">1 Active</span>
                </div>
                <div className="mt-2.5 p-2.5 bg-[#F8F8F6] rounded-xl border border-[#E8E8E5]">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span>Deterministic Mandate Enforced</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
                    EIP-712 cryptographic policy verified for Research Agent on Celo Mainnet (42220).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tab Content */}
      {activeTab === "home" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <HeroMandate
            currency={currency}
            dailyLimitMinor={dailyLimitMinor}
            spentTodayMinor={spentTodayMinor}
            agentStatus={agentStatus}
            agentName="Research Agent"
            onEditLimits={() => setActiveTab("settings")}
            onTogglePause={handleTogglePause}
            onOpenVault={() => {
              const el = document.getElementById("execution-vault")
              if (el) {
                el.scrollIntoView({ behavior: "smooth" })
              } else {
                setActiveTab("agents")
              }
            }}
          />

          <PurchaseRunner
            agentId="agent_demo_01"
            accountingCurrency={currency}
            perPurchaseLimitFormatted={formatMoneyMinor(perPurchaseLimitMinor, 2)}
            onPurchaseComplete={handlePurchaseComplete}
          />

          <div id="execution-vault">
            <AgentFunds
              walletAddress={walletAddress}
              balances={balances}
              currency={currency}
              exchangeRatePerUsd={currentRate}
            />
          </div>

          <ActivityList items={activity.slice(0, 5)} />
        </main>
      )}

      {activeTab === "agents" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-surface rounded-[28px] p-6 sm:p-7 border border-[#E8E8E5] card-elevation">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F0F0EE]">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.1em] font-bold text-text-primary">
                  Registered Autonomous Agents
                </h2>
                <p className="text-[10px] text-text-secondary mt-0.5">
                  Governed agents with cryptographic EIP-712 spending mandates
                </p>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2.5 py-1 bg-[#F5F5F3] rounded-full text-text-secondary border border-border">
                1 Active
              </span>
            </div>

            {/* Agent Identity Card */}
            <div className="p-5 bg-[#F8F8F6] rounded-2xl border border-[#E8E8E5] space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-surface border border-[#E8E8E5] flex items-center justify-center text-text-primary shadow-xs">
                    <BotIcon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <span>Research Agent</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    </div>
                    <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                      ERC-8004 ID: 8004_murk_research_01
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border ${
                  agentStatus === "ACTIVE"
                    ? "bg-success-soft text-success border-success/30"
                    : "bg-danger-soft text-danger border-danger/30"
                }`}>
                  {agentStatus}
                </span>
              </div>

              {/* Policy Parameters Matrix */}
              <div className="pt-3 border-t border-[#F0F0EE] text-xs grid grid-cols-2 gap-3 text-text-secondary font-mono">
                <div className="p-3 bg-surface rounded-xl border border-[#E8E8E5]">
                  <span className="text-[10px] block text-text-secondary uppercase">24h Spending Ceiling</span>
                  <strong className="text-text-primary text-sm font-bold mt-0.5 block">
                    {currency} {formatMoneyMinor(dailyLimitMinor, 2)}
                  </strong>
                </div>
                <div className="p-3 bg-surface rounded-xl border border-[#E8E8E5]">
                  <span className="text-[10px] block text-text-secondary uppercase">Per-Transaction Cap</span>
                  <strong className="text-text-primary text-sm font-bold mt-0.5 block">
                    {currency} {formatMoneyMinor(perPurchaseLimitMinor, 2)}
                  </strong>
                </div>
              </div>

              {/* Security Boundary Specification */}
              <div className="pt-2 text-[11px] text-text-secondary space-y-1 font-mono">
                <div className="flex items-center gap-1.5 text-text-primary font-medium">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-accent" />
                  <span>Execution Isolation: Validated</span>
                </div>
                <div className="text-[10px] text-text-secondary">
                  Execution Key: <span className="text-text-primary">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {activeTab === "activity" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <ActivityList items={activity} />
        </main>
      )}

      {activeTab === "settings" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <AgentSettings
            agentId="agent_demo_01"
            agentStatus={agentStatus}
            dailyLimitFormatted={formatMoneyMinor(dailyLimitMinor, 2)}
            perPurchaseLimitFormatted={formatMoneyMinor(perPurchaseLimitMinor, 2)}
            currency={currency}
            onStatusChange={setAgentStatus}
            onLimitsUpdated={handleLimitsUpdated}
          />
        </main>
      )}

      {/* Persistent Floating Navigation Pill */}
      <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  )
}
