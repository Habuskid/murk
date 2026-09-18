"use client"

import React, { useState } from "react"
import { WalletIcon, CopyIcon, CheckIcon } from "@/components/Icons"

interface TokenBalance {
  symbol: string
  address: string
  decimals: number
  formattedBalance: string
}

interface AgentFundsProps {
  walletAddress: string
  balances: TokenBalance[]
  onRefresh?: () => void
}

export function AgentFunds({ walletAddress, balances }: AgentFundsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  return (
    <div className="w-full bg-surface rounded-3xl p-6 shadow-sm border border-border mt-4">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <WalletIcon className="w-4 h-4 text-text-secondary" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Agent Execution Wallet
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="text-xs font-mono text-text-secondary hover:text-text-primary bg-background px-3 py-1.5 rounded-full border border-border hover:border-text-secondary/40 transition-all flex items-center gap-1.5 active:scale-95"
          title="Click to copy address"
        >
          <span>{shortAddress}</span>
          {copied ? (
            <CheckIcon className="w-3.5 h-3.5 text-success" />
          ) : (
            <CopyIcon className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {balances.map((token) => (
          <div
            key={token.symbol}
            className="p-3.5 bg-background rounded-2xl border border-border/60 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span className="text-xs font-bold text-text-primary">{token.symbol}</span>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 bg-surface rounded-full border border-border/60 text-text-secondary">
                Celo
              </span>
            </div>
            <div className="text-xl font-bold text-text-primary tabular-nums mt-2">
              {token.formattedBalance}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
