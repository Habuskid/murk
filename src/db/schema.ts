/**
 * Neon Postgres Drizzle Database Schema
 * Implements all 16 tables defined in DATA_MODEL.md
 * Rule: NEVER use FLOAT, REAL, or DOUBLE PRECISION for money.
 */

import { sql } from "drizzle-orm"
import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core"

// 1. users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  providerUserId: text("provider_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// 2. wallets
export const wallets = pgTable(
  "wallets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    agentId: text("agent_id"),
    type: text("type", { enum: ["USER", "AGENT"] }).notNull(),
    address: text("address").notNull(),
    provider: text("provider").notNull(),
    chainId: integer("chain_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    walletChainUnique: uniqueIndex("wallet_address_chain_idx").on(table.address, table.chainId),
  })
)

// 3. agents
export const agents = pgTable("agents", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["DRAFT", "ACTIVE", "PAUSED", "DISABLED"] })
    .default("DRAFT")
    .notNull(),
  accountingCurrency: text("accounting_currency").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  walletId: text("wallet_id").references(() => wallets.id),
  erc8004AgentId: text("erc8004_agent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// 4. mandates
export const mandates = pgTable("mandates", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id).notNull(),
  version: integer("version").notNull(),
  dailyLimitMinor: bigint("daily_limit_minor", { mode: "bigint" }).notNull(),
  perPurchaseLimitMinor: bigint("per_purchase_limit_minor", { mode: "bigint" }).notNull(),
  approvalThresholdMinor: bigint("approval_threshold_minor", { mode: "bigint" }),
  accountingCurrency: text("accounting_currency").notNull(),
  status: text("status", { enum: ["ACTIVE", "PAUSED"] }).default("ACTIVE").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow().notNull(),
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// 5. agent_assets
export const agentAssets = pgTable("agent_assets", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id).notNull(),
  assetSymbol: text("asset_symbol").notNull(),
  assetAddress: text("asset_address").notNull(),
  chainId: integer("chain_id").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  minimumReserveRaw: bigint("minimum_reserve_raw", { mode: "bigint" }).default(sql`0`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// 6. purchases
export const purchases = pgTable("purchases", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id).notNull(),
  mandateId: text("mandate_id").references(() => mandates.id).notNull(),
  merchantUrl: text("merchant_url").notNull(),
  resourceUrl: text("resource_url").notNull(),
  state: text("state").notNull(),
  selectedAsset: text("selected_asset"),
  settlementAmountRaw: bigint("settlement_amount_raw", { mode: "bigint" }),
  accountingCurrency: text("accounting_currency").notNull(),
  accountingAmountMinor: bigint("accounting_amount_minor", { mode: "bigint" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
})

// 7. payment_requirements
export const paymentRequirements = pgTable("payment_requirements", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").references(() => purchases.id).notNull(),
  protocolVersion: integer("protocol_version").notNull(),
  network: text("network").notNull(),
  payTo: text("pay_to").notNull(),
  rawPayloadJson: jsonb("raw_payload_json").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
})

// 8. payment_requirement_assets
export const paymentRequirementAssets = pgTable("payment_requirement_assets", {
  id: text("id").primaryKey(),
  paymentRequirementId: text("payment_requirement_id").references(() => paymentRequirements.id).notNull(),
  assetSymbol: text("asset_symbol").notNull(),
  assetAddress: text("asset_address").notNull(),
  amountRaw: bigint("amount_raw", { mode: "bigint" }).notNull(),
  network: text("network").notNull(),
})

// 9. rate_quotes
export const rateQuotes = pgTable("rate_quotes", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").references(() => purchases.id).notNull(),
  baseAsset: text("base_asset").notNull(),
  quoteCurrency: text("quote_currency").notNull(),
  rateNumerator: bigint("rate_numerator", { mode: "bigint" }).notNull(),
  rateDenominator: bigint("rate_denominator", { mode: "bigint" }).notNull(),
  rateKind: text("rate_kind").notNull(),
  provider: text("provider").notNull(),
  providerReference: text("provider_reference"),
  quotedAt: timestamp("quoted_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rawResponseHash: text("raw_response_hash"),
})

// 10. policy_decisions
export const policyDecisions = pgTable("policy_decisions", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").references(() => purchases.id).notNull(),
  decision: text("decision", { enum: ["APPROVED", "BLOCKED"] }).notNull(),
  reasonCodesJson: jsonb("reason_codes_json").notNull(),
  dailyLimitMinor: bigint("daily_limit_minor", { mode: "bigint" }).notNull(),
  perPurchaseLimitMinor: bigint("per_purchase_limit_minor", { mode: "bigint" }).notNull(),
  spentBeforeMinor: bigint("spent_before_minor", { mode: "bigint" }).notNull(),
  reservedBeforeMinor: bigint("reserved_before_minor", { mode: "bigint" }).notNull(),
  purchaseValueMinor: bigint("purchase_value_minor", { mode: "bigint" }).notNull(),
  remainingBeforeMinor: bigint("remaining_before_minor", { mode: "bigint" }).notNull(),
  remainingAfterMinor: bigint("remaining_after_minor", { mode: "bigint" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// 11. spend_reservations
export const spendReservations = pgTable("spend_reservations", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").references(() => purchases.id).unique().notNull(),
  agentId: text("agent_id").references(() => agents.id).notNull(),
  mandateId: text("mandate_id").references(() => mandates.id).notNull(),
  amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
  status: text("status", { enum: ["RESERVED", "COMMITTED", "RELEASED"] })
    .default("RESERVED")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  committedAt: timestamp("committed_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
})

// 12. transactions
export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    purchaseId: text("purchase_id").references(() => purchases.id),
    walletId: text("wallet_id").references(() => wallets.id).notNull(),
    purpose: text("purpose").notNull(),
    chainId: integer("chain_id").notNull(),
    txHash: text("tx_hash").notNull(),
    assetAddress: text("asset_address"),
    amountRaw: bigint("amount_raw", { mode: "bigint" }),
    fromAddress: text("from_address").notNull(),
    toAddress: text("to_address"),
    status: text("status", {
      enum: ["CREATED", "SUBMITTED", "CONFIRMED", "REVERTED", "FAILED"],
    }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    blockNumber: bigint("block_number", { mode: "bigint" }),
    errorCode: text("error_code"),
  },
  (table) => ({
    txHashChainUnique: uniqueIndex("tx_hash_chain_idx").on(table.chainId, table.txHash),
  })
)

// 13. resources
export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").references(() => purchases.id).unique().notNull(),
  httpStatus: integer("http_status").notNull(),
  contentType: text("content_type").notNull(),
  resourceIdentifier: text("resource_identifier"),
  contentHash: text("content_hash"),
  safePreview: text("safe_preview"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
})

// 14. receipts
export const receipts = pgTable("receipts", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").references(() => purchases.id).unique().notNull(),
  receiptVersion: integer("receipt_version").default(1).notNull(),
  receiptJson: jsonb("receipt_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// 15. agent_events
export const agentEvents = pgTable("agent_events", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").references(() => agents.id).notNull(),
  purchaseId: text("purchase_id").references(() => purchases.id),
  eventType: text("event_type").notNull(),
  eventDataJson: jsonb("event_data_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// 16. idempotency_keys
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  operation: text("operation").notNull(),
  resourceId: text("resource_id").notNull(),
  requestHash: text("request_hash").notNull(),
  resultReference: text("result_reference").notNull(),
  resultJson: jsonb("result_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
})
