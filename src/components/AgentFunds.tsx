"use client"

import React, { useState } from "react"

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

export function AgentFunds({ walletAddress, balances, onRefresh }: AgentFundsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  return (
    <div className="w-full bg-surface rounded-3xl p-5 shadow-sm border border-border mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Agent Execution Wallet
        </span>
        <button
          onClick={handleCopy}
          className="text-xs font-mono text-text-secondary hover:text-text-primary bg-background px-2.5 py-1 rounded-full border border-border transition-colors flex items-center gap-1.5"
          title="Click to copy address"
        >
          <span>{shortAddress}</span>
          <span className="text-[10px] text-accent font-sans">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        {balances.map((token) => (
          <div
            key={token.symbol}
            className="p-3 bg-background rounded-2xl border border-border/60 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">{token.symbol}</span>
              <span className="text-[10px] text-text-secondary">Celo</span>
            </div>
            <div className="text-lg font-semibold text-text-primary tabular-nums mt-1">
              {token.formattedBalance}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
