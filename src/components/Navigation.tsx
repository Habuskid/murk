"use client"

import React from "react"

export type TabKey = "home" | "agents" | "activity" | "settings"

interface NavigationProps {
  activeTab: TabKey
  onSelectTab: (tab: TabKey) => void
}

export function Navigation({ activeTab, onSelectTab }: NavigationProps) {
  const tabs: { key: TabKey; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      key: "home",
      label: "Home",
      icon: (active) => (
        <svg className={`w-4 h-4 transition-colors ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: "agents",
      label: "Agents",
      icon: (active) => (
        <svg className={`w-4 h-4 transition-colors ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: "activity",
      label: "Ledger",
      icon: (active) => (
        <svg className={`w-4 h-4 transition-colors ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      key: "settings",
      label: "Policy",
      icon: (active) => (
        <svg className={`w-4 h-4 transition-colors ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-[#141414]/95 backdrop-blur-md px-2 py-1.5 rounded-full dock-elevation border border-white/10 transition-all duration-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 select-none ${
                isActive
                  ? "text-white bg-neutral-800 shadow-xs"
                  : "text-[#8A8A8A] hover:text-white"
              }`}
            >
              {tab.icon(isActive)}
              <span className={isActive ? "block font-bold tracking-tight" : "hidden sm:block"}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
