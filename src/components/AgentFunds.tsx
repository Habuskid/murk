"use client"

import React, { useMemo, useState } from "react"
import { parseUnits } from "viem"
import { usePortalWallet } from "@/components/MurkPortalProvider"
import { authedFetch } from "@/lib/authed-fetch"
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
  agentId: string
  walletAddress: string
  balances: TokenBalance[]
  onFundingConfirmed?: () => Promise<void> | void
}

function normalizeTxHash(result: unknown): `0x${string}` {
  if (typeof result === "string" && /^0x[a-fA-F0-9]{64}$/.test(result)) {
    return result as `0x${string}`
  }

  if (result && typeof result === "object") {
    const maybe = result as {
      txHash?: unknown
      data?: { txHash?: unknown }
    }
    const value = maybe.txHash ?? maybe.data?.txHash
    if (typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value)) {
      return value as `0x${string}`
    }
  }

  throw new Error("PORTAL_TRANSACTION_HASH_MISSING")
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function AgentFunds({
  agentId,
  walletAddress,
  balances,
  onFundingConfirmed,
}: AgentFundsProps) {
  const { portal, walletAddress: userWalletAddress, isReady, error: portalError } =
    usePortalWallet()

  const [copied, setCopied] = useState(false)
  const [assetSymbol, setAssetSymbol] = useState("USDC")
  const [amount, setAmount] = useState("1")
  const [fundingState, setFundingState] = useState<
    "IDLE" | "SIGNING" | "CONFIRMING" | "CONFIRMED"
  >("IDLE")
  const [fundingError, setFundingError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  const selectedToken = useMemo(
    () => balances.find((token) => token.symbol === assetSymbol),
    [balances, assetSymbol]
  )

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`

  const confirmFunding = async (
    txHash: `0x${string}`,
    amountRaw: bigint,
    idempotencyKey: string
  ) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const response = await authedFetch(`/api/agents/${agentId}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol,
          amountRaw: amountRaw.toString(),
          txHash,
          idempotencyKey,
        }),
      })

      const body = await response.json().catch(() => ({}))

      if (response.ok) {
        return body
      }

      if (
        response.status === 409 &&
        body.error === "FUNDING_TX_NOT_CONFIRMED"
      ) {
        await sleep(2000)
        continue
      }

      throw new Error(body.error || "FUNDING_VERIFICATION_FAILED")
    }

    throw new Error("FUNDING_CONFIRMATION_TIMEOUT")
  }

  const handleFund = async () => {
    if (!portal || !isReady || !userWalletAddress) {
      setFundingError("Portal wallet is not ready.")
      return
    }

    if (!selectedToken) {
      setFundingError("Selected asset is unavailable.")
      return
    }

    let amountRaw: bigint
    try {
      amountRaw = parseUnits(amount.trim(), selectedToken.decimals)
      if (amountRaw <= 0n) throw new Error("INVALID_AMOUNT")
    } catch {
      setFundingError("Enter a valid positive amount.")
      return
    }

    setFundingError(null)
    setLastTxHash(null)
    setFundingState("SIGNING")

    const idempotencyKey = `fund_${crypto.randomUUID()}`

    try {
      const result = await portal.sendAsset(
        {
          to: walletAddress,
          token: assetSymbol,
          amount: amount.trim(),
          signatureApprovalMemo: `Fund Murk agent with ${amount.trim()} ${assetSymbol}`,
        },
        "eip155:42220"
      )

      const txHash = normalizeTxHash(result)
      setLastTxHash(txHash)
      setFundingState("CONFIRMING")

      await confirmFunding(txHash, amountRaw, idempotencyKey)

      setFundingState("CONFIRMED")
      await onFundingConfirmed?.()
    } catch (cause) {
      setFundingState("IDLE")
      setFundingError(
        cause instanceof Error ? cause.message : "Funding failed."
      )
    }
  }

  const fundingBusy =
    fundingState === "SIGNING" || fundingState === "CONFIRMING"

  return (
    <div className="mt-4 w-full rounded-[28px] border border-border bg-surface p-6 card-elevation transition-all">
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface-inset text-text-primary">
            <WalletIcon className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Execution Vault
            </h3>
            <span className="text-xs text-text-secondary">
              Isolated agent wallet on Celo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-full border border-border bg-surface-inset px-3 py-1.5 font-mono text-xs text-text-secondary transition-all hover:border-accent/40 hover:text-text-primary active:scale-95"
            title="Copy execution wallet address"
          >
            <span>{shortAddress}</span>
            {copied ? (
              <CheckIcon className="h-3.5 w-3.5 text-success" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5 text-text-secondary" />
            )}
          </button>

          <a
            href={`https://celoscan.io/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-inset text-text-secondary transition-all hover:border-accent/40 hover:text-text-primary"
            title="View on CeloScan"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {balances.map((token) => {
          const isUsdc = token.symbol === "USDC"
          return (
            <div
              key={token.symbol}
              className="flex flex-col justify-between rounded-2xl border border-border bg-surface-inset p-4 transition-all hover:border-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isUsdc ? (
                    <UsdcIcon className="h-6 w-6" />
                  ) : (
                    <UsdtIcon className="h-6 w-6" />
                  )}
                  <div>
                    <span className="block text-sm font-bold leading-none text-text-primary">
                      {token.symbol}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-secondary">
                      Celo Mainnet
                    </span>
                  </div>
                </div>
                <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary">
                  ERC-20
                </span>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-extrabold tracking-tight text-text-primary tabular-nums">
                  {token.formattedBalance}{" "}
                  <span className="text-xs font-normal text-text-secondary">
                    {token.symbol}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-secondary">
                  Live Celo balance
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-[#F7F7F5] p-4">
        <div className="mb-3">
          <div className="text-xs font-bold text-text-primary">Fund agent</div>
          <div className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            Transfer from your Portal wallet. Murk activates the agent only after
            the exact Celo transfer is confirmed onchain.
          </div>
        </div>

        <div className="grid grid-cols-[110px_1fr] gap-2">
          <select
            value={assetSymbol}
            onChange={(event) => setAssetSymbol(event.target.value)}
            disabled={fundingBusy}
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-text-primary outline-none focus:border-accent"
          >
            {balances.map((token) => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>

          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            disabled={fundingBusy}
            placeholder="Amount"
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold tabular-nums text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleFund()}
          disabled={!isReady || fundingBusy || !selectedToken}
          className="mt-3 flex h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-xs font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {fundingState === "SIGNING"
            ? "Approve in wallet..."
            : fundingState === "CONFIRMING"
              ? "Confirming on Celo..."
              : fundingState === "CONFIRMED"
                ? "Funding confirmed"
                : "Fund execution wallet"}
        </button>

        {portalError && (
          <div className="mt-2 text-[11px] text-danger">{portalError}</div>
        )}

        {fundingError && (
          <div className="mt-2 text-[11px] text-danger">{fundingError}</div>
        )}

        {lastTxHash && (
          <a
            href={`https://celoscan.io/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block truncate font-mono text-[10px] text-accent"
          >
            {lastTxHash}
          </a>
        )}
      </div>
    </div>
  )
}
