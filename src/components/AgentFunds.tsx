"use client"

import React, { useState } from "react"
import {
  WalletIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  UsdcIcon,
  UsdtIcon,
} from "@/components/Icons"

interface TokenBalance {
  symbol: string
  address: string
  decimals: number
  formattedBalance: string
}

interface AgentFundsProps {
  walletAddress: string
  balances: TokenBalance[]
  currency?: string
  exchangeRatePerUsd?: number
  onTopUp?: () => void
}

export function AgentFunds({
  walletAddress,
  balances,
  currency = "NGN",
  exchangeRatePerUsd = 1330,
}: AgentFundsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  return (
    <div className="w-full bg-surface rounded-[28px] p-6 border border-[#E8E8E5] card-elevation mt-4 transition-all">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0F0EE]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F8F8F6] border border-[#E8E8E5] flex items-center justify-center text-text-primary">
            <WalletIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-xs font-mono uppercase tracking-[0.1em] font-bold text-text-primary">
              Execution Vault
            </h3>
            <span className="text-[10px] text-text-secondary">Isolated agent private key on Celo</span>
          </div>
        </div>

        {/* Address Pill & Explorer */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            className="text-[11px] font-mono text-text-secondary hover:text-text-primary bg-[#F8F8F6] px-3 py-1.5 rounded-full border border-border hover:border-text-secondary/50 transition-all flex items-center gap-1.5 active:scale-95"
            title="Click to copy EOA address"
          >
            <span>{shortAddress}</span>
            {copied ? (
              <CheckIcon className="w-3 h-3 text-success" />
            ) : (
              <CopyIcon className="w-3 h-3 text-text-secondary" />
            )}
          </button>

          <a
            href={`https://celoscan.io/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-full bg-[#F8F8F6] border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-text-secondary/50 transition-all"
            title="View on CeloScan Explorer"
          >
            <ExternalLinkIcon className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {balances.map((token) => {
          const isUsdc = token.symbol === "USDC"
          const parsedAmount = parseFloat(token.formattedBalance) || 0
          const fiatValue = (parsedAmount * exchangeRatePerUsd).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })

          return (
            <div
              key={token.symbol}
              className="p-4 bg-[#F8F8F6] rounded-2xl border border-[#E8E8E5] hover:border-border transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isUsdc ? <UsdcIcon className="w-5 h-5" /> : <UsdtIcon className="w-5 h-5" />}
                  <div>
                    <span className="text-xs font-bold text-text-primary block leading-none">
                      {token.symbol}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono">Celo Mainnet</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-surface rounded-md border border-[#E8E8E5] text-text-secondary">
                  ERC-20
                </span>
              </div>

              <div className="mt-3">
                <div className="text-xl font-bold text-text-primary tabular-nums tracking-tight">
                  {token.formattedBalance} <span className="text-xs font-normal text-text-secondary">{token.symbol}</span>
                </div>
                <div className="text-[11px] font-mono text-text-secondary mt-0.5">
                  ≈ {currency} {fiatValue}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
