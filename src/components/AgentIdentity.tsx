"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
} from "@/components/Icons"
import { authedFetch } from "@/lib/authed-fetch"
import { useMurkWallet } from "@/components/MurkWalletProvider"
import {
  CELO_CAIP2,
  CELO_ERC8004_IDENTITY_REGISTRY,
  CELO_EXPLORER_URL,
  CELO_NETWORK_LABEL,
} from "@/config/celo-network"

type IdentityStatus = {
  registered: boolean
  agentId: string | null
  owner: `0x${string}` | null
  registeredWallet: `0x${string}` | null
  expectedOwner: `0x${string}`
  expectedAgentWallet: `0x${string}`
  ownerMatches: boolean
  walletBound: boolean
}

type PreparedTransaction = {
  chainId: typeof CELO_CAIP2
  transaction: {
    from: `0x${string}`
    to: `0x${string}`
    data: `0x${string}`
    value: string
    feeCurrency?: `0x${string}`
  }
}

interface AgentIdentityProps {
  agentId: string
  erc8004AgentId?: string
  onUpdated?: () => Promise<void> | void
}

export function AgentIdentity({
  agentId,
  erc8004AgentId,
  onUpdated,
}: AgentIdentityProps) {
  const { sendTransaction, isReady } = useMurkWallet()
  const [status, setStatus] = useState<IdentityStatus | null>(null)
  const [busy, setBusy] = useState<"REGISTER" | "BIND" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const response = await authedFetch(`/api/agents/${agentId}/erc8004`, {
        cache: "no-store",
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || "Could not load agent identity")
      }

      setStatus(body as IdentityStatus)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load agent identity"
      )
    }
  }, [agentId])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus, erc8004AgentId])

  const sendPreparedTransaction = async (
    prepared: PreparedTransaction,
    memo: string
  ): Promise<`0x${string}`> => {
    if (!isReady) {
      throw new Error("PRIVY_WALLET_NOT_READY")
    }

    return sendTransaction(prepared.transaction, memo)
  }

  const registerIdentity = async () => {
    setBusy("REGISTER")
    setError(null)
    setLastTxHash(null)

    try {
      const prepareResponse = await authedFetch(
        `/api/agents/${agentId}/erc8004`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "PREPARE_REGISTER" }),
        }
      )
      const prepared = await prepareResponse.json()

      if (!prepareResponse.ok) {
        throw new Error(prepared.error || "Could not prepare registration")
      }

      const txHash = await sendPreparedTransaction(
        prepared as PreparedTransaction,
        "Register Murk agent identity"
      )
      setLastTxHash(txHash)

      const confirmResponse = await authedFetch(
        `/api/agents/${agentId}/erc8004`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CONFIRM_REGISTER",
            txHash,
          }),
        }
      )
      const confirmed = await confirmResponse.json()

      if (!confirmResponse.ok) {
        throw new Error(confirmed.error || "Registration could not be verified")
      }

      await loadStatus()
      await onUpdated?.()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Registration failed"
      )
    } finally {
      setBusy(null)
    }
  }

  const bindExecutionWallet = async () => {
    setBusy("BIND")
    setError(null)
    setLastTxHash(null)

    try {
      const prepareResponse = await authedFetch(
        `/api/agents/${agentId}/erc8004`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "PREPARE_BIND" }),
        }
      )
      const prepared = await prepareResponse.json()

      if (!prepareResponse.ok) {
        throw new Error(prepared.error || "Could not prepare wallet binding")
      }

      const txHash = await sendPreparedTransaction(
        prepared as PreparedTransaction,
        "Bind Murk execution wallet"
      )
      setLastTxHash(txHash)

      const confirmResponse = await authedFetch(
        `/api/agents/${agentId}/erc8004`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CONFIRM_BIND",
            txHash,
          }),
        }
      )
      const confirmed = await confirmResponse.json()

      if (!confirmResponse.ok) {
        throw new Error(confirmed.error || "Wallet binding could not be verified")
      }

      await loadStatus()
      await onUpdated?.()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Wallet binding failed"
      )
    } finally {
      setBusy(null)
    }
  }

  const effectiveAgentId = status?.agentId || erc8004AgentId || null
  const verified =
    Boolean(status?.registered) &&
    Boolean(status?.ownerMatches) &&
    Boolean(status?.walletBound)

  return (
    <section className="mt-5 border-t border-border pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-text-primary">
            Onchain identity
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
            ERC-8004 keeps the identity NFT in your human wallet while the
            execution wallet is verified separately.
          </p>
        </div>

        <span
          className={[
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            verified
              ? "bg-success-soft text-success"
              : effectiveAgentId
                ? "bg-accent-soft text-accent"
                : "bg-surface-inset text-text-secondary",
          ].join(" ")}
        >
          {verified
            ? "Verified"
            : effectiveAgentId
              ? "Needs binding"
              : "Not registered"}
        </span>
      </div>

      {effectiveAgentId && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[12px] bg-surface-inset px-3.5 py-3">
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-text-secondary">
              ERC-8004 agent ID
            </div>
            <div className="mt-0.5 truncate font-mono text-xs text-text-primary">
              #{effectiveAgentId}
            </div>
          </div>

          <a
            href={`${CELO_EXPLORER_URL}/address/${CELO_ERC8004_IDENTITY_REGISTRY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent"
          >
            Registry
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        </div>
      )}

      {!effectiveAgentId && (
        <button
          type="button"
          onClick={() => void registerIdentity()}
          disabled={!isReady || busy !== null}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-xs font-semibold text-text-primary transition hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ShieldCheckIcon className="h-4 w-4 text-accent" strokeWidth={1.9} />
          {busy === "REGISTER" ? `Registering on ${CELO_NETWORK_LABEL}…` : "Register identity"}
        </button>
      )}

      {effectiveAgentId && !verified && (
        <button
          type="button"
          onClick={() => void bindExecutionWallet()}
          disabled={!isReady || busy !== null || !status?.ownerMatches}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ShieldCheckIcon className="h-4 w-4" strokeWidth={1.9} />
          {busy === "BIND"
            ? "Binding execution wallet…"
            : "Bind execution wallet"}
        </button>
      )}

      {verified && (
        <div className="mt-3 flex items-start gap-2 rounded-[12px] bg-success-soft px-3.5 py-3 text-[11px] leading-relaxed text-success">
          <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your human wallet owns the identity and Murk's isolated execution
          wallet is verified onchain.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-[12px] bg-danger-soft px-3.5 py-3 text-[11px] leading-relaxed text-danger">
          {error}
        </div>
      )}

      {lastTxHash && (
        <a
          href={`${CELO_EXPLORER_URL}/tx/${lastTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-accent"
        >
          {lastTxHash.slice(0, 10)}…{lastTxHash.slice(-6)}
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      )}
    </section>
  )
}
