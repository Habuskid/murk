"use client"

import React from "react"
import { CDPReactProvider } from "@coinbase/cdp-react"

export function MurkCDPProvider({ children }: { children: React.ReactNode }) {
  const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID

  if (!projectId) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-[28px] border border-[#EAEAE7] bg-white p-6 text-center">
          <div className="text-sm font-bold text-[#111111]">CDP is not configured</div>
          <p className="mt-2 text-xs leading-relaxed text-[#767676]">
            Set NEXT_PUBLIC_CDP_PROJECT_ID and allowlist this origin in the CDP Portal before using email sign-in.
          </p>
        </div>
      </div>
    )
  }

  return (
    <CDPReactProvider
      config={{
        projectId,
        appName: "Murk",
        ethereum: {
          createOnLogin: "eoa",
        },
        authMethods: ["email"],
        disableAnalytics: true,
      }}
    >
      {children}
    </CDPReactProvider>
  )
}
