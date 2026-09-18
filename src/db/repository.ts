/**
 * Neon-backed persistence repository.
 *
 * Runtime financial state must not depend on process memory. All user, wallet,
 * agent, mandate, purchase, reservation, receipt, and idempotency state is
 * persisted in Neon Postgres through Drizzle.
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { getDb, schema } from "./index"
import { CELO_TOKENS } from "../services/celo"
import type { OrchestratorReceipt, OrchestrationState } from "../services/orchestrator"

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

function asAddress(value: string): `0x${string}` {
  return value as `0x${string}`
}

function assetConfig(symbol: string) {
  const token = Object.values(CELO_TOKENS).find((item) => item.symbol === symbol)
  if (!token) {
    throw new Error(`UNSUPPORTED_SETTLEMENT_ASSET:${symbol}`)
  }
  return token
}

async function hydrateAgent(row: typeof schema.agents.$inferSelect): Promise<AgentRecord> {
  const db = getDb()

  if (!row.walletId) {
    throw new Error("AGENT_WALLET_NOT_CONFIGURED")
  }

  const [wallet] = await db
    .select()
    .from(schema.wallets)
    .where(eq(schema.wallets.id, row.walletId))
    .limit(1)

  if (!wallet) {
    throw new Error("AGENT_WALLET_NOT_FOUND")
  }

  const assets = await db
    .select()
    .from(schema.agentAssets)
    .where(eq(schema.agentAssets.agentId, row.id))

  const minimumReserves: Record<string, bigint> = {}
  const allowedAssets: string[] = []

  for (const asset of assets) {
    minimumReserves[asset.assetSymbol] = asset.minimumReserveRaw
    if (asset.enabled) allowedAssets.push(asset.assetSymbol)
  }

  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    status: row.status,
    accountingCurrency: row.accountingCurrency,
    timezone: row.timezone,
    walletId: row.walletId,
    walletAddress: asAddress(wallet.address),
    erc8004AgentId: row.erc8004AgentId || undefined,
    allowedAssets,
    minimumReserves,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function getUsageForMandate(
  mandateId: string,
  timezone: string
): Promise<{ spentTodayMinor: bigint; reservedTodayMinor: bigint }> {
  const db = getDb()

  const result = await db.execute<{
    spent_today: string
    reserved_today: string
  }>(sql`
    SELECT
      COALESCE(SUM(CASE
        WHEN status = 'COMMITTED'
          AND DATE(created_at AT TIME ZONE ${timezone}) = DATE(NOW() AT TIME ZONE ${timezone})
        THEN amount_minor ELSE 0 END), 0)::text AS spent_today,
      COALESCE(SUM(CASE
        WHEN status = 'RESERVED'
          AND DATE(created_at AT TIME ZONE ${timezone}) = DATE(NOW() AT TIME ZONE ${timezone})
        THEN amount_minor ELSE 0 END), 0)::text AS reserved_today
    FROM spend_reservations
    WHERE mandate_id = ${mandateId}
  `)

  const row = result.rows[0]

  return {
    spentTodayMinor: BigInt(row?.spent_today || "0"),
    reservedTodayMinor: BigInt(row?.reserved_today || "0"),
  }
}

class PersistentRepository {
  async findUserByProviderId(providerUserId: string): Promise<UserRecord | null> {
    const db = getDb()
    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.providerUserId, providerUserId))
      .limit(1)

    return row || null
  }

  async saveUser(user: UserRecord): Promise<void> {
    const db = getDb()
    await db
      .insert(schema.users)
      .values(user)
      .onConflictDoUpdate({
        target: schema.users.providerUserId,
        set: {
          email: user.email,
          updatedAt: user.updatedAt,
        },
      })
  }

  async upsertUserWallet(wallet: WalletRecord): Promise<void> {
    const db = getDb()

    if (!wallet.userId) {
      throw new Error("USER_WALLET_REQUIRES_USER_ID")
    }

    const [existing] = await db
      .select()
      .from(schema.wallets)
      .where(
        and(
          eq(schema.wallets.userId, wallet.userId),
          eq(schema.wallets.type, "USER"),
          eq(schema.wallets.chainId, wallet.chainId)
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(schema.wallets)
        .set({
          address: wallet.address,
          provider: wallet.provider,
        })
        .where(eq(schema.wallets.id, existing.id))
      return
    }

    await db.insert(schema.wallets).values({
      id: wallet.id,
      userId: wallet.userId,
      type: "USER",
      address: wallet.address,
      provider: wallet.provider,
      chainId: wallet.chainId,
      createdAt: wallet.createdAt,
    })
  }

  async findUserWallet(
    userId: string,
    chainId = 42220
  ): Promise<WalletRecord | null> {
    const db = getDb()
    const [row] = await db
      .select()
      .from(schema.wallets)
      .where(
        and(
          eq(schema.wallets.userId, userId),
          eq(schema.wallets.type, "USER"),
          eq(schema.wallets.chainId, chainId)
        )
      )
      .limit(1)

    if (!row) return null

    return {
      id: row.id,
      userId: row.userId || undefined,
      agentId: row.agentId || undefined,
      type: row.type,
      address: asAddress(row.address),
      provider: row.provider,
      chainId: row.chainId,
      createdAt: row.createdAt,
    }
  }

  async findAgentById(
    agentId: string,
    ownerUserId?: string
  ): Promise<AgentRecord | null> {
    const db = getDb()

    const conditions = [eq(schema.agents.id, agentId)]
    if (ownerUserId) {
      conditions.push(eq(schema.agents.ownerUserId, ownerUserId))
    }

    const [row] = await db
      .select()
      .from(schema.agents)
      .where(and(...conditions))
      .limit(1)

    return row ? hydrateAgent(row) : null
  }

  async listAgentsByOwner(ownerUserId: string): Promise<AgentRecord[]> {
    const db = getDb()
    const rows = await db
      .select()
      .from(schema.agents)
      .where(eq(schema.agents.ownerUserId, ownerUserId))
      .orderBy(desc(schema.agents.createdAt))

    return Promise.all(rows.map(hydrateAgent))
  }

  async getLatestMandate(agentId: string): Promise<MandateRecord | null> {
    const db = getDb()

    const [agent] = await db
      .select({ timezone: schema.agents.timezone })
      .from(schema.agents)
      .where(eq(schema.agents.id, agentId))
      .limit(1)

    const [row] = await db
      .select()
      .from(schema.mandates)
      .where(
        and(
          eq(schema.mandates.agentId, agentId),
          isNull(schema.mandates.supersededAt)
        )
      )
      .orderBy(desc(schema.mandates.version))
      .limit(1)

    if (!row || !agent) return null

    const usage = await getUsageForMandate(row.id, agent.timezone)

    return {
      id: row.id,
      agentId: row.agentId,
      version: row.version,
      dailyLimitMinor: row.dailyLimitMinor,
      perPurchaseLimitMinor: row.perPurchaseLimitMinor,
      approvalThresholdMinor: row.approvalThresholdMinor,
      accountingCurrency: row.accountingCurrency,
      status: row.status,
      spentTodayMinor: usage.spentTodayMinor,
      reservedTodayMinor: usage.reservedTodayMinor,
      effectiveFrom: row.effectiveFrom,
      supersededAt: row.supersededAt,
      createdAt: row.createdAt,
    }
  }

  async saveAgent(agent: AgentRecord): Promise<void> {
    const db = getDb()
    await db
      .update(schema.agents)
      .set({
        name: agent.name,
        status: agent.status,
        accountingCurrency: agent.accountingCurrency,
        timezone: agent.timezone,
        walletId: agent.walletId,
        erc8004AgentId: agent.erc8004AgentId || null,
        updatedAt: agent.updatedAt,
      })
      .where(eq(schema.agents.id, agent.id))

    for (const symbol of agent.allowedAssets) {
      const token = assetConfig(symbol)
      await db
        .insert(schema.agentAssets)
        .values({
          id: `asset_${agent.id}_${symbol.toLowerCase()}`,
          agentId: agent.id,
          assetSymbol: symbol,
          assetAddress: token.address,
          chainId: 42220,
          enabled: true,
          minimumReserveRaw: agent.minimumReserves[symbol] || 0n,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.agentAssets.id,
          set: {
            enabled: true,
            minimumReserveRaw: agent.minimumReserves[symbol] || 0n,
            updatedAt: new Date(),
          },
        })
    }

    const configured = await db
      .select()
      .from(schema.agentAssets)
      .where(eq(schema.agentAssets.agentId, agent.id))

    for (const existing of configured) {
      if (!agent.allowedAssets.includes(existing.assetSymbol) && existing.enabled) {
        await db
          .update(schema.agentAssets)
          .set({ enabled: false, updatedAt: new Date() })
          .where(eq(schema.agentAssets.id, existing.id))
      }
    }
  }

  async createAgentBundle(input: {
    agent: AgentRecord
    wallet: WalletRecord
    mandate: MandateRecord
  }): Promise<void> {
    const db = getDb()
    const { agent, wallet, mandate } = input

    const assetStatements = agent.allowedAssets.map((symbol) => {
      const token = assetConfig(symbol)
      return db.insert(schema.agentAssets).values({
        id: `asset_${agent.id}_${symbol.toLowerCase()}`,
        agentId: agent.id,
        assetSymbol: symbol,
        assetAddress: token.address,
        chainId: 42220,
        enabled: true,
        minimumReserveRaw: agent.minimumReserves[symbol] || 0n,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })

    await db.batch([
      db.insert(schema.wallets).values({
        id: wallet.id,
        agentId: agent.id,
        type: "AGENT",
        address: wallet.address,
        provider: wallet.provider,
        chainId: wallet.chainId,
        createdAt: wallet.createdAt,
      }),
      db.insert(schema.agents).values({
        id: agent.id,
        ownerUserId: agent.ownerUserId,
        name: agent.name,
        status: agent.status,
        accountingCurrency: agent.accountingCurrency,
        timezone: agent.timezone,
        walletId: agent.walletId,
        erc8004AgentId: agent.erc8004AgentId || null,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      }),
      ...assetStatements,
      db.insert(schema.mandates).values({
        id: mandate.id,
        agentId: mandate.agentId,
        version: mandate.version,
        dailyLimitMinor: mandate.dailyLimitMinor,
        perPurchaseLimitMinor: mandate.perPurchaseLimitMinor,
        approvalThresholdMinor: mandate.approvalThresholdMinor || null,
        accountingCurrency: mandate.accountingCurrency,
        status: mandate.status,
        effectiveFrom: mandate.effectiveFrom,
        supersededAt: mandate.supersededAt || null,
        createdAt: mandate.createdAt,
      }),
    ] as any)
  }

  async createMandate(mandate: MandateRecord): Promise<void> {
    const db = getDb()

    const current = await db
      .update(schema.mandates)
      .set({ supersededAt: new Date() })
      .where(
        and(
          eq(schema.mandates.agentId, mandate.agentId),
          isNull(schema.mandates.supersededAt)
        )
      )

    void current

    await db.insert(schema.mandates).values({
      id: mandate.id,
      agentId: mandate.agentId,
      version: mandate.version,
      dailyLimitMinor: mandate.dailyLimitMinor,
      perPurchaseLimitMinor: mandate.perPurchaseLimitMinor,
      approvalThresholdMinor: mandate.approvalThresholdMinor || null,
      accountingCurrency: mandate.accountingCurrency,
      status: mandate.status,
      effectiveFrom: mandate.effectiveFrom,
      supersededAt: mandate.supersededAt || null,
      createdAt: mandate.createdAt,
    })
  }

  async savePurchase(purchase: PurchaseRecord): Promise<void> {
    const db = getDb()

    await db
      .insert(schema.purchases)
      .values({
        id: purchase.id,
        agentId: purchase.agentId,
        mandateId: purchase.mandateId,
        merchantUrl: purchase.merchantUrl,
        resourceUrl: purchase.resourceUrl,
        state: purchase.state,
        selectedAsset: purchase.selectedAsset || null,
        settlementAmountRaw: purchase.settlementAmountRaw || null,
        accountingCurrency: purchase.accountingCurrency,
        accountingAmountMinor: purchase.accountingAmountMinor || null,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
        completedAt: purchase.completedAt || null,
      })
      .onConflictDoUpdate({
        target: schema.purchases.id,
        set: {
          state: purchase.state,
          selectedAsset: purchase.selectedAsset || null,
          settlementAmountRaw: purchase.settlementAmountRaw || null,
          accountingAmountMinor: purchase.accountingAmountMinor || null,
          updatedAt: purchase.updatedAt,
          completedAt: purchase.completedAt || null,
        },
      })

    if (purchase.receipt) {
      await db
        .insert(schema.receipts)
        .values({
          id: `rcpt_${purchase.id}`,
          purchaseId: purchase.id,
          receiptVersion: 1,
          receiptJson: purchase.receipt,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.receipts.purchaseId,
          set: {
            receiptJson: purchase.receipt,
          },
        })
    }
  }

  async getPurchaseById(id: string): Promise<PurchaseRecord | null> {
    const db = getDb()

    const [row] = await db
      .select()
      .from(schema.purchases)
      .where(eq(schema.purchases.id, id))
      .limit(1)

    if (!row) return null

    const [receipt] = await db
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.purchaseId, id))
      .limit(1)

    return {
      id: row.id,
      agentId: row.agentId,
      mandateId: row.mandateId,
      merchantUrl: row.merchantUrl,
      resourceUrl: row.resourceUrl,
      state: row.state as OrchestrationState,
      selectedAsset: row.selectedAsset,
      settlementAmountRaw: row.settlementAmountRaw,
      accountingCurrency: row.accountingCurrency,
      accountingAmountMinor: row.accountingAmountMinor,
      receipt: (receipt?.receiptJson as OrchestratorReceipt | undefined) || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    }
  }

  async listActivityByOwner(
    ownerUserId: string,
    agentId?: string
  ): Promise<ActivityItem[]> {
    const db = getDb()

    const conditions = [eq(schema.agents.ownerUserId, ownerUserId)]
    if (agentId) {
      conditions.push(eq(schema.purchases.agentId, agentId))
    }

    const rows = await db
      .select({
        purchase: schema.purchases,
        agentName: schema.agents.name,
        receiptJson: schema.receipts.receiptJson,
      })
      .from(schema.purchases)
      .innerJoin(schema.agents, eq(schema.agents.id, schema.purchases.agentId))
      .leftJoin(schema.receipts, eq(schema.receipts.purchaseId, schema.purchases.id))
      .where(and(...conditions))
      .orderBy(desc(schema.purchases.createdAt))

    return rows.map(({ purchase, agentName, receiptJson }) => {
      const receipt = receiptJson as OrchestratorReceipt | null
      const isCompleted = purchase.state === "COMPLETED"
      const isBlocked = purchase.state === "POLICY_BLOCKED"

      return {
        id: `act_${purchase.id}`,
        purchaseId: purchase.id,
        agentId: purchase.agentId,
        agentName,
        merchantUrl: purchase.merchantUrl,
        type: isCompleted ? "COMPLETED" : isBlocked ? "BLOCKED" : "FAILED",
        accountingCurrency: purchase.accountingCurrency,
        accountingAmountFormatted: receipt?.accountingValueFormatted || "0.00",
        settlementAsset: purchase.selectedAsset || "NONE",
        settlementAmountFormatted: receipt?.settlementAmountFormatted || "0",
        txHash: receipt?.txHash || null,
        timestamp: purchase.createdAt,
        reasonDescription: receipt?.humanReadableReasons?.join("; ") || undefined,
      }
    })
  }

  async getIdempotencyResult(key: string): Promise<unknown | null> {
    const db = getDb()

    const [row] = await db
      .select()
      .from(schema.idempotencyKeys)
      .where(eq(schema.idempotencyKeys.key, key))
      .limit(1)

    if (!row) return null

    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      return null
    }

    return row.resultJson ?? null
  }

  async saveIdempotencyResult(input: {
    key: string
    operation: string
    resourceId: string
    requestHash: string
    resultReference: string
    result: unknown
    expiresAt?: Date
  }): Promise<void> {
    const db = getDb()

    await db
      .insert(schema.idempotencyKeys)
      .values({
        key: input.key,
        operation: input.operation,
        resourceId: input.resourceId,
        requestHash: input.requestHash,
        resultReference: input.resultReference,
        resultJson: input.result,
        createdAt: new Date(),
        expiresAt: input.expiresAt || null,
      })
      .onConflictDoNothing()
  }

  async reserveSpend(input: {
    purchaseId: string
    agentId: string
    mandateId: string
    amountMinor: bigint
  }): Promise<{ remainingAfterMinor: bigint }> {
    const db = getDb()
    const reservationId = `resv_${input.purchaseId}`

    const result = await db.execute<{
      remaining_after: string
    }>(sql`
      WITH usage AS (
        SELECT
          m.daily_limit_minor,
          m.per_purchase_limit_minor,
          a.timezone,
          COALESCE(SUM(CASE
            WHEN sr.status = 'COMMITTED'
              AND DATE(sr.created_at AT TIME ZONE a.timezone) = DATE(NOW() AT TIME ZONE a.timezone)
            THEN sr.amount_minor ELSE 0 END), 0) AS spent_today,
          COALESCE(SUM(CASE
            WHEN sr.status = 'RESERVED'
              AND DATE(sr.created_at AT TIME ZONE a.timezone) = DATE(NOW() AT TIME ZONE a.timezone)
            THEN sr.amount_minor ELSE 0 END), 0) AS reserved_today
        FROM mandates m
        JOIN agents a ON a.id = m.agent_id
        LEFT JOIN spend_reservations sr ON sr.mandate_id = m.id
        WHERE m.id = ${input.mandateId}
          AND m.agent_id = ${input.agentId}
          AND m.status = 'ACTIVE'
          AND m.superseded_at IS NULL
        GROUP BY m.daily_limit_minor, m.per_purchase_limit_minor, a.timezone
      ),
      inserted AS (
        INSERT INTO spend_reservations (
          id,
          purchase_id,
          agent_id,
          mandate_id,
          amount_minor,
          status,
          created_at
        )
        SELECT
          ${reservationId},
          ${input.purchaseId},
          ${input.agentId},
          ${input.mandateId},
          ${input.amountMinor},
          'RESERVED',
          NOW()
        FROM usage
        WHERE ${input.amountMinor} > 0
          AND ${input.amountMinor} <= per_purchase_limit_minor
          AND spent_today + reserved_today + ${input.amountMinor} <= daily_limit_minor
        ON CONFLICT (purchase_id) DO NOTHING
        RETURNING amount_minor
      )
      SELECT
        (usage.daily_limit_minor - usage.spent_today - usage.reserved_today - inserted.amount_minor)::text AS remaining_after
      FROM usage
      JOIN inserted ON TRUE
    `)

    const row = result.rows[0]
    if (!row) {
      throw new Error("SPEND_RESERVATION_REJECTED")
    }

    return {
      remainingAfterMinor: BigInt(row.remaining_after),
    }
  }

  async commitSpend(purchaseId: string): Promise<void> {
    const db = getDb()
    const result = await db.execute(sql`
      UPDATE spend_reservations
      SET status = 'COMMITTED', committed_at = NOW()
      WHERE purchase_id = ${purchaseId}
        AND status = 'RESERVED'
      RETURNING id
    `)

    if (result.rows.length === 0) {
      const existing = await db
        .select()
        .from(schema.spendReservations)
        .where(eq(schema.spendReservations.purchaseId, purchaseId))
        .limit(1)

      if (existing[0]?.status !== "COMMITTED") {
        throw new Error("SPEND_RESERVATION_COMMIT_FAILED")
      }
    }
  }

  async releaseSpend(purchaseId: string): Promise<void> {
    const db = getDb()
    await db.execute(sql`
      UPDATE spend_reservations
      SET status = 'RELEASED', released_at = NOW()
      WHERE purchase_id = ${purchaseId}
        AND status = 'RESERVED'
    `)
  }
}

export const repository = new PersistentRepository()
