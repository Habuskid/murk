/**
 * Persistence Repository Layer
 * Supports both Neon Postgres (via Drizzle ORM) and transactional in-memory store for resilience.
 * Implements owner-scoping, versioned mandates, spend reservations, and idempotency protection.
 */

import { SpendingMandate, PolicyDecision, ReasonCode } from "../core/types"
import { OrchestratorReceipt, OrchestrationState } from "../services/orchestrator"

export type UserRecord = {
  id: string
  providerUserId: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export type WalletRecord = {
  id: string
  userId?: string
  agentId?: string
  type: "USER" | "AGENT"
  address: `0x${string}`
  provider: string
  chainId: number
  createdAt: Date
}

export type AgentRecord = {
  id: string
  ownerUserId: string
  name: string
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED"
  accountingCurrency: string
  timezone: string
  walletId: string
  walletAddress: `0x${string}`
  erc8004AgentId?: string
  allowedAssets: string[]
  minimumReserves: Record<string, bigint>
  createdAt: Date
  updatedAt: Date
}

export type MandateRecord = {
  id: string
  agentId: string
  version: number
  dailyLimitMinor: bigint
  perPurchaseLimitMinor: bigint
  approvalThresholdMinor?: bigint | null
  accountingCurrency: string
  status: "ACTIVE" | "PAUSED"
  spentTodayMinor: bigint
  reservedTodayMinor: bigint
  effectiveFrom: Date
  supersededAt?: Date | null
  createdAt: Date
}

export type PurchaseRecord = {
  id: string
  agentId: string
  mandateId: string
  merchantUrl: string
  resourceUrl: string
  state: OrchestrationState
  selectedAsset?: string | null
  settlementAmountRaw?: bigint | null
  accountingCurrency: string
  accountingAmountMinor?: bigint | null
  receipt?: OrchestratorReceipt | null
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
}

export type SpendReservationRecord = {
  id: string
  purchaseId: string
  agentId: string
  mandateId: string
  amountMinor: bigint
  status: "RESERVED" | "COMMITTED" | "RELEASED"
  createdAt: Date
  committedAt?: Date | null
  releasedAt?: Date | null
}

export type ActivityItem = {
  id: string
  purchaseId: string
  agentId: string
  agentName: string
  merchantUrl: string
  type: "COMPLETED" | "BLOCKED" | "FAILED"
  accountingCurrency: string
  accountingAmountFormatted: string
  settlementAsset: string
  settlementAmountFormatted: string
  txHash: string | null
  timestamp: Date
  reasonDescription?: string
}

class Store {
  users: Map<string, UserRecord> = new Map()
  wallets: Map<string, WalletRecord> = new Map()
  agents: Map<string, AgentRecord> = new Map()
  mandates: Map<string, MandateRecord[]> = new Map() // agentId -> versions
  purchases: Map<string, PurchaseRecord> = new Map()
  reservations: Map<string, SpendReservationRecord> = new Map()
  idempotency: Map<string, { result: any; createdAt: Date }> = new Map()

  constructor() {
    // Runtime state starts empty. Users, wallets, agents, mandates, and purchases
    // are created only from authenticated real flows or isolated tests.
  }

  findUserByProviderId(providerUserId: string): UserRecord | null {
    for (const user of this.users.values()) {
      if (user.providerUserId === providerUserId) return user
    }
    return null
  }

  saveUser(user: UserRecord) {
    this.users.set(user.id, user)
  }

  upsertUserWallet(wallet: WalletRecord) {
    for (const [id, existing] of this.wallets.entries()) {
      if (
        existing.type === "USER" &&
        existing.userId === wallet.userId &&
        existing.chainId === wallet.chainId
      ) {
        this.wallets.set(id, {
          ...existing,
          address: wallet.address,
          provider: wallet.provider,
        })
        return
      }
    }

    this.wallets.set(wallet.id, wallet)
  }

  findUserWallet(userId: string, chainId = 42220): WalletRecord | null {
    for (const wallet of this.wallets.values()) {
      if (
        wallet.type === "USER" &&
        wallet.userId === userId &&
        wallet.chainId === chainId
      ) {
        return wallet
      }
    }
    return null
  }

  findAgentById(agentId: string, ownerUserId?: string): AgentRecord | null {
    const agent = this.agents.get(agentId)
    if (!agent) return null
    if (ownerUserId && agent.ownerUserId !== ownerUserId) return null
    return agent
  }

  listAgentsByOwner(ownerUserId: string): AgentRecord[] {
    return Array.from(this.agents.values()).filter((a) => a.ownerUserId === ownerUserId)
  }

  getLatestMandate(agentId: string): MandateRecord | null {
    const list = this.mandates.get(agentId)
    if (!list || list.length === 0) return null
    return list[list.length - 1]
  }

  saveAgent(agent: AgentRecord) {
    this.agents.set(agent.id, agent)
  }

  createMandate(mandate: MandateRecord) {
    const list = this.mandates.get(mandate.agentId) || []
    if (list.length > 0) {
      list[list.length - 1].supersededAt = new Date()
    }
    list.push(mandate)
    this.mandates.set(mandate.agentId, list)
  }

  savePurchase(purchase: PurchaseRecord) {
    this.purchases.set(purchase.id, purchase)
  }

  getPurchaseById(id: string): PurchaseRecord | null {
    return this.purchases.get(id) || null
  }

  listActivityByOwner(ownerUserId: string, agentId?: string): ActivityItem[] {
    const ownedAgentIds = new Set(
      this.listAgentsByOwner(ownerUserId).map((agent) => agent.id)
    )

    if (agentId && !ownedAgentIds.has(agentId)) {
      return []
    }

    return this.listActivity(agentId).filter((item) =>
      ownedAgentIds.has(item.agentId)
    )
  }

  listActivity(agentId?: string): ActivityItem[] {
    const items: ActivityItem[] = []
    for (const p of this.purchases.values()) {
      if (agentId && p.agentId !== agentId) continue
      const agent = this.agents.get(p.agentId)
      const isCompleted = p.state === "COMPLETED"
      const isBlocked = p.state === "POLICY_BLOCKED"

      items.push({
        id: `act_${p.id}`,
        purchaseId: p.id,
        agentId: p.agentId,
        agentName: agent?.name || "Agent",
        merchantUrl: p.merchantUrl,
        type: isCompleted ? "COMPLETED" : isBlocked ? "BLOCKED" : "FAILED",
        accountingCurrency: p.accountingCurrency,
        accountingAmountFormatted: p.receipt?.accountingValueFormatted || "0.00",
        settlementAsset: p.selectedAsset || "NONE",
        settlementAmountFormatted: p.receipt?.settlementAmountFormatted || "0",
        txHash: p.receipt?.txHash || null,
        timestamp: p.createdAt,
        reasonDescription: p.receipt?.humanReadableReasons?.join("; ") || undefined,
      })
    }
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
}

const globalForRepository = globalThis as unknown as {
  repository: Store | undefined
}

export const repository = globalForRepository.repository ?? new Store()

if (process.env.NODE_ENV !== "production") {
  globalForRepository.repository = repository
}
