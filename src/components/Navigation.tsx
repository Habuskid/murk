"use client"

import {
  Bot,
  History,
  Home,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"

export type TabKey = "home" | "agents" | "activity" | "settings"

interface NavigationProps {
  activeTab: TabKey
  onSelectTab: (tab: TabKey) => void
}

const tabs: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "home", label: "Home", icon: Home },
  { key: "agents", label: "Agent", icon: Bot },
  { key: "activity", label: "Activity", icon: History },
  { key: "settings", label: "Policy", icon: SlidersHorizontal },
]

export function Navigation({ activeTab, onSelectTab }: NavigationProps) {
  return (
    <nav
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-1 rounded-[18px] border border-nav-border bg-nav p-1.5 dock-elevation">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const Icon = tab.icon

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex min-h-11 items-center gap-2 rounded-[13px] px-3.5 text-xs font-semibold transition",
                isActive
                  ? "bg-nav-capsule text-nav-capsule-text"
                  : "text-nav-inactive hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" strokeWidth={1.9} />
              <span className={isActive ? "block" : "hidden sm:block"}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
