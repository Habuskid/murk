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
        <svg className={`w-5 h-5 ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      key: "agents",
      label: "Agents",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      key: "activity",
      label: "Activity",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? "text-white" : "text-[#8A8A8A]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-[#171717] px-3 py-2 rounded-full shadow-lg border border-neutral-800 transition-all duration-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none ${
                isActive ? "text-white bg-neutral-800" : "text-[#8A8A8A] hover:text-white"
              }`}
            >
              {tab.icon(isActive)}
              <span className={isActive ? "block" : "hidden sm:block"}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
