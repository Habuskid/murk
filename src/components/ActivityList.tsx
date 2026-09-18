"use client"

import React from "react"
import { ActivityItem } from "@/db/repository"
import { CheckIcon, XMarkIcon, LayersIcon, ExternalLinkIcon } from "@/components/Icons"

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  if (items.length === 0) {
    return (
      <div className="w-full bg-surface rounded-3xl p-8 border border-[#E2E2DF] card-elevation mt-4 text-center">
        <div className="w-11 h-11 rounded-2xl bg-[#F8F8F6] border border-[#ECECE8] flex items-center justify-center mx-auto mb-3 text-text-secondary">
          <LayersIcon className="w-5 h-5 text-text-secondary" />
        </div>
        <p className="text-xs font-bold text-text-primary">Ledger Empty</p>
        <p className="text-[11px] text-text-secondary mt-1 max-w-[260px] mx-auto leading-relaxed">
          No settlement operations recorded yet. Execute a test purchase to generate deterministic ledger entries.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full bg-surface rounded-3xl p-6 sm:p-7 border border-[#E2E2DF] card-elevation mt-4">
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#ECECE8]">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-[0.1em] font-bold text-text-primary">
            Audit Ledger
          </h3>
          <span className="text-[10px] text-text-secondary">Immutable history of autonomous purchases</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F0F0EE] text-text-secondary border border-border">
          {items.length} {items.length === 1 ? "record" : "records"}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((act) => {
          const isCompleted = act.type === "COMPLETED"

          return (
            <div
              key={act.id}
              className="group flex items-center justify-between p-3.5 bg-[#F8F8F6] rounded-2xl border border-[#ECECE8] hover:border-border transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors flex-shrink-0 ${
                    isCompleted
                      ? "bg-success-soft text-success border-success/30"
                      : "bg-danger-soft text-danger border-danger/30"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <XMarkIcon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <span>{isCompleted ? "Payment Approved" : "Spend Blocked"}</span>
                    <span className="text-[10px] font-normal text-text-secondary font-mono">
                      {isCompleted ? "· Settled" : "· 0 Gas"}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {act.reasonDescription ||
                      (isCompleted
                        ? `Paid ${act.settlementAmountFormatted} ${act.settlementAsset}`
                        : "Exceeded Spending Limit")}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div
                  className={`text-xs font-bold tabular-nums tracking-tight ${
                    isCompleted ? "text-text-primary" : "text-danger"
                  }`}
                >
                  {act.accountingCurrency} {act.accountingAmountFormatted}
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5 flex items-center justify-end gap-1">
                  {act.txHash ? (
                    <a
                      href={`https://celoscan.io/tx/${act.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline flex items-center gap-0.5"
                      title="Inspect TX on CeloScan"
                    >
                      <span>{act.txHash.slice(0, 6)}...{act.txHash.slice(-4)}</span>
                      <ExternalLinkIcon className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span>Zero On-chain TX</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
