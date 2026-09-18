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
    <div className="w-full bg-surface rounded-[28px] p-6 border border-[#EAEAE7] card-elevation mt-4 transition-all">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAEAE7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F7F7F5] border border-[#EAEAE7] flex items-center justify-center text-[#111111]">
            <WalletIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111111]">
              Execution Vault
            </h3>
            <span className="text-xs text-[#767676]">Isolated agent private key on Celo</span>
          </div>
        </div>

        {/* Address Pill & Explorer */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            className="text-xs font-mono text-[#767676] hover:text-[#111111] bg-[#F7F7F5] px-3 py-1.5 rounded-full border border-[#EAEAE7] hover:border-[#111111]/20 transition-all flex items-center gap-1.5 active:scale-95"
            title="Click to copy EOA address"
          >
            <span>{shortAddress}</span>
            {copied ? (
              <CheckIcon className="w-3.5 h-3.5 text-success" />
            ) : (
              <CopyIcon className="w-3.5 h-3.5 text-[#767676]" />
            )}
          </button>

          <a
            href={`https://celoscan.io/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-[#F7F7F5] border border-[#EAEAE7] flex items-center justify-center text-[#767676] hover:text-[#111111] hover:border-[#111111]/20 transition-all"
            title="View on CeloScan Explorer"
          >
            <ExternalLinkIcon className="w-3.5 h-3.5" />
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
              className="p-4 bg-[#F7F7F5] rounded-2xl border border-[#EAEAE7] hover:border-[#111111]/20 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isUsdc ? <UsdcIcon className="w-6 h-6" /> : <UsdtIcon className="w-6 h-6" />}
                  <div>
                    <span className="text-sm font-bold text-[#111111] block leading-none">
                      {token.symbol}
                    </span>
                    <span className="text-xs text-[#767676] mt-0.5 block">Celo Mainnet</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-surface rounded-md border border-[#EAEAE7] text-[#767676]">
                  ERC-20
                </span>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-extrabold text-[#111111] tabular-nums tracking-tight">
                  {token.formattedBalance} <span className="text-xs font-normal text-[#767676]">{token.symbol}</span>
                </div>
                <div className="text-xs text-[#767676] mt-1 tabular-nums">
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
