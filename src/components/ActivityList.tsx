"use client"

import React from "react"
import { ActivityItem } from "@/db/repository"

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  if (items.length === 0) {
    return (
      <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border mt-4 text-center">
        <p className="text-xs text-text-secondary">No recorded agent spending activity yet.</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border mt-4">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
        Recent Activity
      </h3>

      <div className="space-y-3">
        {items.map((act) => {
          const isCompleted = act.type === "COMPLETED"
          const isBlocked = act.type === "BLOCKED"

          return (
            <div
              key={act.id}
              className="flex items-center justify-between p-3.5 bg-background rounded-2xl border border-border/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  {isCompleted ? "✓" : "✕"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {isCompleted ? "Payment Approved" : "Payment Blocked"}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {act.reasonDescription || (isCompleted ? `Paid ${act.settlementAmountFormatted} ${act.settlementAsset}` : "Limit Exceeded")}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm font-bold tabular-nums ${
                    isCompleted ? "text-text-primary" : "text-danger"
                  }`}
                >
                  {act.accountingCurrency} {act.accountingAmountFormatted}
                </div>
                <div className="text-[10px] text-text-secondary font-mono mt-0.5">
                  {act.txHash ? `${act.txHash.slice(0, 6)}...${act.txHash.slice(-4)}` : "No TX"}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
