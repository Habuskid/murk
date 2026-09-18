"use client"

import React from "react"
import { ActivityItem } from "@/db/repository"
import { ExternalLinkIcon, TerminalIcon, BoltIcon, ShieldAlertIcon } from "@/components/Icons"

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  if (items.length === 0) {
    return (
      <div className="w-full bg-surface rounded-[28px] p-8 border border-[#E8E8E5] card-elevation mt-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#F8F8F6] border border-[#ECECE8] flex items-center justify-center mx-auto mb-3 text-text-secondary">
          <TerminalIcon className="w-5 h-5 text-text-secondary" />
        </div>
        <p className="text-sm font-bold text-text-primary">No Transactions Yet</p>
        <p className="text-xs text-text-secondary mt-1 max-w-[280px] mx-auto leading-relaxed">
          Run an autonomous payment simulation above to record verified on-chain settlements here.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-3 mt-4">
      {/* Section Title (Reference: "Payment History") */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-text-primary">Payment History</h3>
        <span className="text-xs text-text-secondary font-medium">
          {items.length} {items.length === 1 ? "transaction" : "transactions"}
        </span>
      </div>

      {/* Grouping Tag */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-text-secondary">Today</span>
        <div className="flex-1 h-[1px] bg-[#E8E8E5]" />
      </div>

      {/* Transaction Cards (Reference UI Layout) */}
      <div className="space-y-3">
        {items.map((act) => {
          const isCompleted = act.type === "COMPLETED"
          const merchantName = act.merchantUrl?.includes("expensive")
            ? "Intelligence Syndicate"
            : "Financial Data Node"
          const resourceName = act.merchantUrl?.includes("expensive")
            ? "Macro Intelligence Q3 Report"
            : "Market Intelligence Dataset v2"

          return (
            <div
              key={act.id}
              className="bg-surface rounded-[24px] p-4 sm:p-5 border border-[#E8E8E5] card-elevation transition-all hover:border-text-secondary/40"
            >
              {/* Top Row: Icon + Title + Amount */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Brand/Merchant Squircle Icon */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-accent-soft text-accent border border-accent/20"
                      : "bg-danger-soft text-danger border border-danger/20"
                  }`}>
                    {isCompleted ? <BoltIcon className="w-5 h-5" /> : <ShieldAlertIcon className="w-5 h-5" />}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-text-primary leading-snug">
                      {resourceName}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-medium">
                      {merchantName}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight ${
                    isCompleted ? "text-text-primary" : "text-danger"
                  }`}>
                    -{act.accountingCurrency} {act.accountingAmountFormatted}
                  </div>
                  <div className="text-[11px] text-text-secondary font-medium mt-0.5">
                    {act.settlementAmountFormatted} {act.settlementAsset}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Metadata Tag + Status Pill (Reference UI) */}
              <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-[#F0F0EE] text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary font-mono text-[11px]">
                  <span>{isCompleted ? "Celo Mainnet" : "Zero Gas"}</span>
                  {act.txHash && (
                    <a
                      href={`https://celoscan.io/tx/${act.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-0.5 ml-1"
                      title="View CeloScan receipt"
                    >
                      <span>{act.txHash.slice(0, 6)}...</span>
                      <ExternalLinkIcon className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    isCompleted
                      ? "bg-accent-soft text-accent"
                      : "bg-danger-soft text-danger"
                  }`}
                >
                  {isCompleted ? "Paid Successfully" : "Payment Blocked"}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
