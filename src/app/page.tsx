"use client"

import React, { useCallback, useEffect, useState } from "react"
import { Navigation, TabKey } from "@/components/Navigation"
import { AuthGate } from "@/components/AuthGate"
import { AgentOnboarding } from "@/components/AgentOnboarding"
import { HeroMandate } from "@/components/HeroMandate"
import { AgentFunds } from "@/components/AgentFunds"
import { PurchaseRunner } from "@/components/PurchaseRunner"
import { ActivityList } from "@/components/ActivityList"
import { AgentSettings } from "@/components/AgentSettings"
import type { ActivityItem } from "@/db/repository"
import type { OrchestratorReceipt } from "@/services/orchestrator"
import { formatMoneyMinor } from "@/core/money"
import { authedFetch } from "@/lib/authed-fetch"
import {
  BotIcon,
  ShieldCheckIcon,
  HeadsetIcon,
  AvatarIcon,
} from "@/components/Icons"

type AgentApiState = {
  id: string
  name: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED"
  accountingCurrency: string
  walletAddress: `0x${string}`
  erc8004AgentId?: string
  allowedAssets: string[]
  mandate: {
    dailyLimitMinor: string
    perPurchaseLimitMinor: string
    spentTodayMinor: string
    reservedTodayMinor: string
    status: "ACTIVE" | "PAUSED"
  } | null
}

type BalanceApiItem = {
  symbol: string
  address: string
  decimals: number
  formattedBalance: string
}

function MurkWalletApp() {
  const [activeTab, setActiveTab] = useState<TabKey>("home")
  const [agent, setAgent] = useState<AgentApiState | null>(null)
  const [hasNoAgents, setHasNoAgents] = useState(false)
  const [balances, setBalances] = useState<BalanceApiItem[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshAgentState = useCallback(async () => {
    try {
      setLoadError(null)

      const agentsRes = await authedFetch("/api/agents", { cache: "no-store" })
      const agentsData = await agentsRes.json()

      if (!agentsRes.ok) {
        throw new Error(agentsData.error || "Could not load agents.")
      }

      const firstAgent = Array.isArray(agentsData.agents) ? agentsData.agents[0] : null
      if (!firstAgent) {
        setAgent(null)
        setBalances([])
        setActivity([])
        setHasNoAgents(true)
        return
      }

      setHasNoAgents(false)
      const agentId = firstAgent.id as string

      const [agentRes, balanceRes, activityRes] = await Promise.all([
        authedFetch(`/api/agents/${agentId}`, { cache: "no-store" }),
        authedFetch(`/api/agents/${agentId}/balances`, { cache: "no-store" }),
        authedFetch(`/api/activity?agentId=${encodeURIComponent(agentId)}`, {
          cache: "no-store",
        }),
      ])

      if (!agentRes.ok) {
        const body = await agentRes.json().catch(() => ({}))
        throw new Error(body.error || "Could not load the agent.")
      }

      const agentData = (await agentRes.json()) as AgentApiState
      setAgent(agentData)

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json()
        setBalances(Array.isArray(balanceData.balances) ? balanceData.balances : [])
      } else {
        setBalances([])
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json()
        setActivity(Array.isArray(activityData.activity) ? activityData.activity : [])
      } else {
        setActivity([])
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load Murk.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAgentState()
  }, [refreshAgentState])

  const handleTogglePause = async () => {
    if (!agent) return
    const action = agent.status === "PAUSED" ? "resume" : "pause"
    const res = await authedFetch(`/api/agents/${agent.id}/${action}`, {
      method: "POST",
    })
    if (res.ok) {
      await refreshAgentState()
    }
  }

  const handlePurchaseComplete = async (_receipt: OrchestratorReceipt) => {
    await refreshAgentState()
  }

  const handleLimitsUpdated = async (_daily: string, _perPurchase: string) => {
    await refreshAgentState()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <div className="rounded-2xl border border-[#EAEAE7] bg-white px-5 py-4 text-sm text-[#767676]">
          Loading wallet state...
        </div>
      </div>
    )
  }

  if (hasNoAgents) {
    return <AgentOnboarding onCreated={refreshAgentState} />
  }

  if (!agent || !agent.mandate) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center">
        <div className="max-w-sm rounded-[28px] border border-[#EAEAE7] bg-white p-6 text-center">
          <div className="text-sm font-bold text-[#111111]">Murk is not ready</div>
          <p className="mt-2 text-xs leading-relaxed text-[#767676]">
            {loadError || "The agent or spending mandate could not be loaded."}
          </p>
          <button
            onClick={() => void refreshAgentState()}
            className="mt-4 rounded-2xl bg-accent px-4 py-3 text-xs font-bold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const dailyLimitMinor = BigInt(agent.mandate.dailyLimitMinor)
  const perPurchaseLimitMinor = BigInt(agent.mandate.perPurchaseLimitMinor)
  const spentTodayMinor = BigInt(agent.mandate.spentTodayMinor)
  const agentStatus = agent.status === "PAUSED" ? "PAUSED" : "ACTIVE"

  return (
    <div className="flex w-full flex-1 flex-col pb-28">
      <header className="relative mb-2 flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <AvatarIcon className="h-10 w-10 rounded-full ring-2 ring-white shadow-xs" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-sm font-extrabold tracking-tight text-[#111111]">MURK</span>
              <span className="rounded-md bg-[#EAEAE7] px-1.5 py-0.5 text-[10px] font-semibold text-[#111111]">
                x402
              </span>
            </div>
            <div className="mt-1 text-xs font-medium text-[#767676]">
              Autonomous Spending Authority
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-full border border-[#EAEAE7] bg-surface px-3 py-1.5 text-xs font-medium text-[#767676] shadow-xs sm:flex">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span>Celo mainnet</span>
          </div>
          <div className="rounded-full border border-[#EAEAE7] bg-surface px-3 py-1.5 text-xs font-bold text-accent shadow-xs">
            {agent.accountingCurrency}
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAEAE7] bg-surface text-[#111111] shadow-xs transition-all active:scale-95"
            title="Agent policies"
          >
            <HeadsetIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {loadError && (
        <div className="mb-4 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs text-danger">
          {loadError}
        </div>
      )}

      {activeTab === "home" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <HeroMandate
            currency={agent.accountingCurrency}
            dailyLimitMinor={dailyLimitMinor}
            spentTodayMinor={spentTodayMinor}
            agentStatus={agentStatus}
            agentName={agent.name}
            onEditLimits={() => setActiveTab("settings")}
            onTogglePause={handleTogglePause}
            onOpenVault={() => {
              const el = document.getElementById("execution-vault")
              if (el) el.scrollIntoView({ behavior: "smooth" })
            }}
          />

          <PurchaseRunner
            agentId={agent.id}
            accountingCurrency={agent.accountingCurrency}
            perPurchaseLimitFormatted={formatMoneyMinor(perPurchaseLimitMinor, 2)}
            onPurchaseComplete={handlePurchaseComplete}
          />

          <div id="execution-vault">
            <AgentFunds walletAddress={agent.walletAddress} balances={balances} />
          </div>

          <ActivityList items={activity.slice(0, 5)} />
        </main>
      )}

      {activeTab === "agents" && (
        <main className="space-y-4 animate-in fade-in duration-150">
          <div className="rounded-[28px] border border-[#EAEAE7] bg-surface p-6 card-elevation sm:p-7">
            <div className="mb-4 flex items-center justify-between border-b border-[#EAEAE7] pb-4">
              <div>
                <h2 className="text-sm font-bold text-[#111111]">{agent.name}</h2>
                <p className="mt-0.5 text-xs text-[#767676]">
                  Controlled autonomous execution on Celo
                </p>
              </div>
              <span className="rounded-full border border-[#EAEAE7] bg-[#F7F7F5] px-2.5 py-1 text-xs font-semibold text-[#767676]">
                {agentStatus}
              </span>
            </div>

            <div className="space-y-4 rounded-2xl border border-[#EAEAE7] bg-[#F7F7F5] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#EAEAE7] bg-surface">
                  <BotIcon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#111111]">{agent.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-[#767676]">
                    {agent.walletAddress.slice(0, 10)}...{agent.walletAddress.slice(-8)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-[#EAEAE7] pt-3 text-xs">
                <div className="rounded-xl border border-[#EAEAE7] bg-surface p-3.5">
                  <span className="block text-[#767676]">Daily mandate</span>
                  <strong className="mt-1 block text-base font-bold text-[#111111] tabular-nums">
                    {agent.accountingCurrency} {formatMoneyMinor(dailyLimitMinor, 2)}
                  </strong>
                </div>
                <div className="rounded-xl border border-[#EAEAE7] bg-surface p-3.5">
                  <span className="block text-[#767676]">Per-purchase limit</span>
                  <strong className="mt-1 block text-base font-bold text-[#111111] tabular-nums">
                    {agent.accountingCurrency} {formatMoneyMinor(perPurchaseLimitMinor, 2)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
                <ShieldCheckIcon className="h-4 w-4 text-accent" />
                <span>Execution wallet isolated from the user wallet</span>
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
            agentId={agent.id}
            agentStatus={agentStatus}
            dailyLimitFormatted={formatMoneyMinor(dailyLimitMinor, 2)}
            perPurchaseLimitFormatted={formatMoneyMinor(perPurchaseLimitMinor, 2)}
            currency={agent.accountingCurrency}
            onStatusChange={() => void refreshAgentState()}
            onLimitsUpdated={handleLimitsUpdated}
          />
        </main>
      )}

      <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  )
}

export default function MurkApp() {
  return (
    <AuthGate>
      <MurkWalletApp />
    </AuthGate>
  )
}
