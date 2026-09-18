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

export default function MurkApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("home")
  const [currency, setCurrency] = useState("NGN")
  const [agentStatus, setAgentStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE")
  const [dailyLimitMinor, setDailyLimitMinor] = useState<bigint>(500000n) // NGN 5,000.00
  const [perPurchaseLimitMinor, setPerPurchaseLimitMinor] = useState<bigint>(200000n) // NGN 2,000.00
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

  const handlePurchaseComplete = (receipt: OrchestratorReceipt) => {
    // If approved, update spent amount and balances
    if (receipt.policyDecision === "APPROVED") {
      const addedSpend = BigInt(receipt.accountingValueMinor || 0)
      setSpentTodayMinor((prev) => prev + addedSpend)

      // Deduct from USDC
      setBalances((prev) =>
        prev.map((b) =>
          b.symbol === "USDC"
            ? { ...b, formattedBalance: (parseFloat(b.formattedBalance) - 1).toFixed(2) }
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

  return (
    <div className="flex flex-col flex-1 w-full pb-28">
      {/* Top Header */}
      <header className="flex items-center justify-between py-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs tracking-wider">
            M
          </div>
          <div>
            <div className="text-xs font-semibold text-text-primary">Research Agent</div>
            <div className="text-[10px] text-text-secondary">demo@murk.finance</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Celo Mainnet Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-full border border-border text-[11px] font-medium text-text-secondary">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span>Celo Mainnet</span>
          </div>

          {/* Currency Pill */}
          <div className="px-2.5 py-1 bg-surface rounded-full border border-border text-[11px] font-bold text-accent">
            {currency}
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
          />

          <AgentFunds
            walletAddress={walletAddress}
            balances={balances}
          />

          <PurchaseRunner
            agentId="agent_demo_01"
            accountingCurrency={currency}
            perPurchaseLimitFormatted={formatMoneyMinor(perPurchaseLimitMinor, 2)}
            onPurchaseComplete={handlePurchaseComplete}
          />

          <ActivityList items={activity.slice(0, 5)} />
        </main>
      )}

      {activeTab === "agents" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-text-primary">Your Autonomous Agents</h2>
              <span className="text-xs px-2.5 py-0.5 bg-background rounded-full text-text-secondary font-medium">
                1 Active
              </span>
            </div>

            <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-text-primary">Research Agent</div>
                  <div className="text-xs text-text-secondary">ERC-8004 ID: 8004_murk_research_01</div>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  agentStatus === "ACTIVE" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}>
                  {agentStatus}
                </span>
              </div>

              <div className="pt-2 border-t border-border/50 text-xs flex justify-between text-text-secondary">
                <span>Daily Mandate: <strong className="text-text-primary font-mono">{currency} {formatMoneyMinor(dailyLimitMinor, 2)}</strong></span>
                <span>Per Purchase: <strong className="text-text-primary font-mono">{currency} {formatMoneyMinor(perPurchaseLimitMinor, 2)}</strong></span>
              </div>
            </div>
          </div>
        </main>
      )}

      {activeTab === "activity" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-surface rounded-3xl p-6 border border-border shadow-sm">
            <h2 className="text-base font-bold text-text-primary mb-1">Audit Ledger & Activity</h2>
            <p className="text-xs text-text-secondary mb-4">
              Deterministic records of all approved, blocked, and settled agent operations.
            </p>
            <ActivityList items={activity} />
          </div>
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
