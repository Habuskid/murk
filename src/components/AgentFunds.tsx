"use client"

import { useMemo, useState } from "react"
import { parseUnits } from "viem"
import { usePortalWallet } from "@/components/MurkPortalProvider"
import { authedFetch } from "@/lib/authed-fetch"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  UsdcIcon,
  UsdtIcon,
  WalletIcon,
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
  onBalancesChanged?: () => Promise<void> | void
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
  onBalancesChanged,
}: AgentFundsProps) {
  const { portal, walletAddress: userWalletAddress, isReady, error: portalError } =
    usePortalWallet()

  const [copied, setCopied] = useState(false)
  const [activeAction, setActiveAction] = useState<"fund" | "withdraw" | null>(null)

  const [assetSymbol, setAssetSymbol] = useState("USDC")
  const [amount, setAmount] = useState("1")
  const [fundingState, setFundingState] = useState<
    "IDLE" | "SIGNING" | "CONFIRMING" | "CONFIRMED"
  >("IDLE")
  const [fundingError, setFundingError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  const [withdrawAssetSymbol, setWithdrawAssetSymbol] = useState("USDC")
  const [withdrawAmount, setWithdrawAmount] = useState("0.5")
  const [withdrawalState, setWithdrawalState] = useState<
    "IDLE" | "SUBMITTING" | "CONFIRMED"
  >("IDLE")
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null)
  const [withdrawalTxHash, setWithdrawalTxHash] = useState<string | null>(null)

  const selectedToken = useMemo(
    () => balances.find((token) => token.symbol === assetSymbol),
    [balances, assetSymbol]
  )

  const withdrawalToken = useMemo(
    () => balances.find((token) => token.symbol === withdrawAssetSymbol),
    [balances, withdrawAssetSymbol]
  )

  const shortAddress = `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

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

      if (response.ok) return body

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
      const prepareResponse = await authedFetch(
        `/api/agents/${agentId}/fund`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetSymbol,
            amountRaw: amountRaw.toString(),
          }),
        }
      )
      const prepared = await prepareResponse.json()

      if (!prepareResponse.ok) {
        throw new Error(
          prepared.error || "Could not prepare the funding transaction."
        )
      }

      const result = await portal.request({
        chainId: prepared.chainId,
        method: "eth_sendTransaction",
        params: [prepared.transaction],
        signatureApprovalMemo: `Fund Murk agent with ${amount.trim()} ${assetSymbol}`,
      })

      const txHash = normalizeTxHash(result)
      setLastTxHash(txHash)
      setFundingState("CONFIRMING")

      await confirmFunding(txHash, amountRaw, idempotencyKey)

      setFundingState("CONFIRMED")
      await onBalancesChanged?.()
    } catch (cause) {
      setFundingState("IDLE")
      setFundingError(
        cause instanceof Error ? cause.message : "Funding failed."
      )
    }
  }

  const handleWithdraw = async () => {
    if (!userWalletAddress) {
      setWithdrawalError("Portal wallet is not ready.")
      return
    }

    if (!withdrawalToken) {
      setWithdrawalError("Selected asset is unavailable.")
      return
    }

    let amountRaw: bigint
    try {
      amountRaw = parseUnits(withdrawAmount.trim(), withdrawalToken.decimals)
      if (amountRaw <= 0n) throw new Error("INVALID_AMOUNT")
    } catch {
      setWithdrawalError("Enter a valid positive amount.")
      return
    }

    setWithdrawalError(null)
    setWithdrawalTxHash(null)
    setWithdrawalState("SUBMITTING")

    try {
      const response = await authedFetch(`/api/agents/${agentId}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSymbol: withdrawAssetSymbol,
          amountRaw: amountRaw.toString(),
          idempotencyKey: `withdraw_${crypto.randomUUID()}`,
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.message || body.error || "Withdrawal failed.")
      }

      setWithdrawalTxHash(body.txHash || null)
      setWithdrawalState("CONFIRMED")
      await onBalancesChanged?.()
    } catch (cause) {
      setWithdrawalState("IDLE")
      setWithdrawalError(
        cause instanceof Error ? cause.message : "Withdrawal failed."
      )
    }
  }

  const fundingBusy =
    fundingState === "SIGNING" || fundingState === "CONFIRMING"

  return (
    <section className="rounded-[22px] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <WalletIcon className="h-4 w-4" strokeWidth={1.9} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Agent wallet
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              Funds available to the execution agent
            </div>
          </div>
        </div>

        <a
          href={`https://celoscan.io/address/${walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-secondary transition hover:text-text-primary"
          aria-label="View agent wallet on CeloScan"
        >
          <ExternalLinkIcon className="h-4 w-4" strokeWidth={1.8} />
        </a>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] text-text-secondary transition hover:text-text-primary"
      >
        {shortAddress}
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 text-success" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" />
        )}
      </button>

      <div className="mt-4 overflow-hidden rounded-[14px] border border-border">
        {balances.map((token, index) => {
          const TokenIcon = token.symbol === "USDC" ? UsdcIcon : UsdtIcon

          return (
            <div
              key={token.symbol}
              className={[
                "flex items-center justify-between bg-surface-inset px-4 py-3.5",
                index > 0 ? "border-t border-border" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-2.5">
                <TokenIcon className="h-5 w-5" />
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {token.symbol}
                  </div>
                  <div className="text-[11px] text-text-secondary">Celo</div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold tracking-[-0.025em] text-text-primary tabular-nums">
                  {token.formattedBalance}
                </div>
                <div className="text-[10px] font-medium text-text-secondary">
                  {token.symbol}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            setActiveAction((current) => (current === "fund" ? null : "fund"))
          }
          className={[
            "flex h-11 items-center justify-center gap-2 rounded-[13px] border text-xs font-semibold transition",
            activeAction === "fund"
              ? "border-accent bg-accent-soft text-accent"
              : "border-border bg-surface text-text-primary hover:bg-surface-inset",
          ].join(" ")}
        >
          <ArrowDownLeftIcon className="h-4 w-4" strokeWidth={1.9} />
          Add funds
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveAction((current) =>
              current === "withdraw" ? null : "withdraw"
            )
          }
          className={[
            "flex h-11 items-center justify-center gap-2 rounded-[13px] border text-xs font-semibold transition",
            activeAction === "withdraw"
              ? "border-text-primary bg-text-primary text-white"
              : "border-border bg-surface text-text-primary hover:bg-surface-inset",
          ].join(" ")}
        >
          <ArrowUpRightIcon className="h-4 w-4" strokeWidth={1.9} />
          Return funds
        </button>
      </div>

      {activeAction === "fund" && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-xs font-semibold text-text-primary">
            Add from Portal wallet
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            Murk activates funds only after the Celo transfer is confirmed.
          </p>

          <div className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] gap-2">
            <select
              value={assetSymbol}
              onChange={(event) => setAssetSymbol(event.target.value)}
              disabled={fundingBusy}
              className="h-11 min-w-0 rounded-xl border border-border bg-surface-inset px-2.5 text-sm font-semibold text-text-primary outline-none focus:border-accent"
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
              className="h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm font-semibold tabular-nums text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleFund()}
            disabled={!isReady || fundingBusy || !selectedToken}
            className="mt-2.5 flex h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-xs font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {fundingState === "SIGNING"
              ? "Approve in Portal…"
              : fundingState === "CONFIRMING"
                ? "Confirming on Celo…"
                : fundingState === "CONFIRMED"
                  ? "Funds added"
                  : "Confirm add funds"}
          </button>

          {(portalError || fundingError) && (
            <div className="mt-2 text-[11px] text-danger">
              {fundingError || portalError}
            </div>
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
      )}

      {activeAction === "withdraw" && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="text-xs font-semibold text-text-primary">
            Return to your Portal wallet
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            The destination is fixed to your authenticated wallet.
          </p>

          <div className="mt-3 grid grid-cols-[88px_minmax(0,1fr)] gap-2">
            <select
              value={withdrawAssetSymbol}
              onChange={(event) => setWithdrawAssetSymbol(event.target.value)}
              disabled={withdrawalState === "SUBMITTING"}
              className="h-11 min-w-0 rounded-xl border border-border bg-surface-inset px-2.5 text-sm font-semibold text-text-primary outline-none focus:border-accent"
            >
              {balances.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>

            <input
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              inputMode="decimal"
              disabled={withdrawalState === "SUBMITTING"}
              placeholder="Amount"
              className="h-11 min-w-0 rounded-xl border border-border bg-surface px-3 text-sm font-semibold tabular-nums text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={
              !userWalletAddress ||
              withdrawalState === "SUBMITTING" ||
              !withdrawalToken
            }
            className="mt-2.5 flex h-11 w-full items-center justify-center rounded-xl bg-text-primary px-4 text-xs font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {withdrawalState === "SUBMITTING"
              ? "Returning on Celo…"
              : withdrawalState === "CONFIRMED"
                ? "Funds returned"
                : "Confirm return"}
          </button>

          {withdrawalError && (
            <div className="mt-2 text-[11px] text-danger">{withdrawalError}</div>
          )}

          {withdrawalTxHash && (
            <a
              href={`https://celoscan.io/tx/${withdrawalTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate font-mono text-[10px] text-accent"
            >
              {withdrawalTxHash}
            </a>
          )}
        </div>
      )}
    </section>
  )
}
