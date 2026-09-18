"use client"

import { useMemo, useState } from "react"
import { ActivityList } from "@/components/ActivityList"
import { AgentFunds } from "@/components/AgentFunds"
import { AgentSettings } from "@/components/AgentSettings"
import { HeroMandate } from "@/components/HeroMandate"
import { Navigation, type TabKey } from "@/components/Navigation"
import { PurchaseRunner } from "@/components/PurchaseRunner"
import { MurkLogoIcon } from "@/components/Icons"
import type { ActivityItem } from "@/db/repository"

const activityFixture: ActivityItem[] = [
  {
    id: "sandbox_activity_1",
    purchaseId: "sandbox_purchase_1",
    agentId: "sandbox_agent",
    agentName: "Research Agent",
    merchantUrl: "https://agent402.tools",
    type: "COMPLETED",
    accountingCurrency: "NGN",
    accountingAmountFormatted: "1,620.00",
    settlementAsset: "USDC",
    settlementAmountFormatted: "1.00",
    txHash: "0x6c7a33b94ba4e7321180c275c330668fd03f3fdc0f40fe69993c028dce0a1211",
    timestamp: new Date("2026-09-18T10:30:00Z"),
  },
  {
    id: "sandbox_activity_2",
    purchaseId: "sandbox_purchase_2",
    agentId: "sandbox_agent",
    agentName: "Research Agent",
    merchantUrl: "https://example.com",
    type: "BLOCKED",
    accountingCurrency: "NGN",
    accountingAmountFormatted: "3,800.00",
    settlementAsset: "USDC",
    settlementAmountFormatted: "2.35",
    txHash: null,
    timestamp: new Date("2026-09-18T09:10:00Z"),
    reasonDescription: "Per-purchase limit exceeded",
  },
]

const balances = [
  {
    symbol: "USDC",
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    decimals: 6,
    formattedBalance: "8.40",
  },
  {
    symbol: "USDT",
    address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e",
    decimals: 6,
    formattedBalance: "3.25",
  },
]

export function UiSandbox() {
  const [activeTab, setActiveTab] = useState<TabKey>("home")
  const [paused, setPaused] = useState(false)

  const body = useMemo(() => {
    if (activeTab === "activity") {
      return <ActivityList items={activityFixture} />
    }

    if (activeTab === "settings") {
      return (
        <AgentSettings
          agentId="sandbox_agent"
          agentStatus={paused ? "PAUSED" : "ACTIVE"}
          dailyLimitFormatted="5,000.00"
          perPurchaseLimitFormatted="2,000.00"
          currency="NGN"
          onStatusChange={(status) => setPaused(status === "PAUSED")}
          onLimitsUpdated={() => undefined}
        />
      )
    }

    if (activeTab === "agents") {
      return (
        <div className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Execution agent
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-text-primary">
                Research Agent
              </h2>
              <p className="mt-1 font-mono text-[11px] text-text-secondary">
                0x4Fb3...19A2
              </p>
            </div>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
              Active
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border">
            <div className="bg-surface-inset p-4">
              <div className="text-[11px] font-medium text-text-secondary">
                Daily authority
              </div>
              <div className="mt-1 text-base font-semibold text-text-primary tabular-nums">
                NGN 5,000.00
              </div>
            </div>
            <div className="bg-surface-inset p-4">
              <div className="text-[11px] font-medium text-text-secondary">
                Per purchase
              </div>
              <div className="mt-1 text-base font-semibold text-text-primary tabular-nums">
                NGN 2,000.00
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div className="space-y-4">
            <HeroMandate
              currency="NGN"
              dailyLimitMinor={500000n}
              spentTodayMinor={162000n}
              agentStatus={paused ? "PAUSED" : "ACTIVE"}
              agentName="Research Agent"
              onTogglePause={() => setPaused((value) => !value)}
            />

            <PurchaseRunner
              agentId="sandbox_agent"
              accountingCurrency="NGN"
              perPurchaseLimitFormatted="2,000.00"
              onPurchaseComplete={() => undefined}
            />
          </div>

          <div id="execution-vault">
            <AgentFunds
              agentId="sandbox_agent"
              walletAddress="0x4Fb3d9A9f92C330E705d9a8777e7419eCA9B19A2"
              balances={balances}
            />
          </div>
        </div>

        <ActivityList items={activityFixture} />
      </>
    )
  }, [activeTab, paused])

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="mb-5 flex items-center justify-between border-b border-border pb-4 pt-2">
        <div className="flex items-center gap-3">
          <MurkLogoIcon className="h-9 w-9" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.08em] text-text-primary">
              MURK
            </div>
            <div className="mt-0.5 text-[11px] text-text-secondary">
              Spending authority
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-semibold text-text-secondary">
            Celo
          </span>
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
            NGN
          </span>
        </div>
      </header>

      <main className="space-y-4">{body}</main>

      <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  )
}
