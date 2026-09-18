"use client"

import type { ActivityItem } from "@/db/repository"
import {
  BoltIcon,
  ExternalLinkIcon,
  ShieldAlertIcon,
} from "@/components/Icons"

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[22px] border border-border bg-surface px-5 py-8 text-center">
        <div className="text-sm font-semibold text-text-primary">No activity yet</div>
        <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-text-secondary">
          Completed purchases and policy blocks will appear here.
        </p>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Activity
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-text-primary">
            Recent decisions
          </h2>
        </div>
        <span className="text-[11px] font-medium text-text-secondary">
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
        {items.map((activity, index) => {
          const completed = activity.type === "COMPLETED"

          let merchant = activity.merchantUrl || "External merchant"
          try {
            merchant = new URL(activity.merchantUrl).hostname
          } catch {}

          return (
            <div
              key={activity.id}
              className={[
                "flex items-start gap-3 px-4 py-4 sm:px-5",
                index > 0 ? "border-t border-border" : "",
              ].join(" ")}
            >
              <div
                className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  completed
                    ? "bg-accent-soft text-accent"
                    : "bg-danger-soft text-danger",
                ].join(" ")}
              >
                {completed ? (
                  <BoltIcon className="h-4 w-4" strokeWidth={1.9} />
                ) : (
                  <ShieldAlertIcon className="h-4 w-4" strokeWidth={1.9} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-text-primary">
                      {merchant}
                    </div>
                    <div className="mt-0.5 text-[11px] text-text-secondary">
                      {completed ? "Purchase settled" : "Blocked before payment"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={[
                        "text-sm font-semibold tabular-nums",
                        completed ? "text-text-primary" : "text-danger",
                      ].join(" ")}
                    >
                      {completed ? "−" : ""}
                      {activity.accountingCurrency} {activity.accountingAmountFormatted}
                    </div>
                    <div className="mt-0.5 text-[10px] font-medium text-text-secondary tabular-nums">
                      {activity.settlementAmountFormatted} {activity.settlementAsset}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 text-[11px] text-text-secondary">
                    {activity.txHash ? (
                      <a
                        href={`https://celoscan.io/tx/${activity.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 font-mono text-accent"
                      >
                        <span className="truncate">
                          {activity.txHash.slice(0, 8)}…{activity.txHash.slice(-4)}
                        </span>
                        <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      activity.reasonDescription || "No transaction created"
                    )}
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      completed
                        ? "bg-success-soft text-success"
                        : "bg-danger-soft text-danger",
                    ].join(" ")}
                  >
                    {completed ? "Settled" : "Blocked"}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
