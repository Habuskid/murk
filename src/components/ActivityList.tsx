"use client"

import React from "react"
import { ActivityItem } from "@/db/repository"
import { CheckIcon, XMarkIcon, LayersIcon } from "@/components/Icons"

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  if (items.length === 0) {
    return (
      <div className="w-full bg-surface rounded-3xl p-8 shadow-sm border border-border mt-4 text-center">
        <div className="w-10 h-10 rounded-2xl bg-background border border-border/80 flex items-center justify-center mx-auto mb-3 text-text-secondary">
          <LayersIcon className="w-5 h-5 text-text-secondary" />
        </div>
        <p className="text-xs font-medium text-text-primary">No Activity Recorded Yet</p>
        <p className="text-[11px] text-text-secondary mt-1">Autonomous agent settlement transactions will appear here.</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Recent Activity
        </h3>
        <span className="text-[11px] text-text-secondary font-mono">
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((act) => {
          const isCompleted = act.type === "COMPLETED"

          return (
            <div
              key={act.id}
              className="group flex items-center justify-between p-3.5 bg-background rounded-2xl border border-border/60 hover:border-border transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
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
                  <div className="text-xs font-bold text-text-primary">
                    {isCompleted ? "Payment Approved" : "Payment Blocked"}
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {act.reasonDescription ||
                      (isCompleted
                        ? `Settled ${act.settlementAmountFormatted} ${act.settlementAsset}`
                        : "Exceeded Spending Limit")}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-xs font-bold tabular-nums ${
                    isCompleted ? "text-text-primary" : "text-danger"
                  }`}
                >
                  {act.accountingCurrency} {act.accountingAmountFormatted}
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                  {act.txHash
                    ? `${act.txHash.slice(0, 6)}...${act.txHash.slice(-4)}`
                    : "Zero On-chain TX"}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
