/**
 * Zod Validation Schemas for Murk API Contracts
 * Strictly enforces locked configuration per API_CONTRACTS.md and LOCKED_DECISIONS.md
 */

import { z } from "zod"

export const MVP_CURRENCIES = [
  "NGN",
  "KES",
  "BRL",
  "MXN",
  "COP",
  "AED",
  "SAR",
  "INR",
] as const

export const MVP_SETTLEMENT_ASSETS = ["USDC", "USDT"] as const

export const EvmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address format")

export const BigIntStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be an integer numeric string")
  .refine((val) => BigInt(val) > 0n, "Amount must be strictly positive")

export const NonNegativeBigIntStringSchema = z
  .string()
  .regex(/^\d+$/, "Must be an integer numeric string")

// POST /api/agents
export const CreateAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required").max(64, "Name is too long"),
  accountingCurrency: z.enum(MVP_CURRENCIES, {
    errorMap: () => ({ message: "Currency must be one of the 8 MVP accounting currencies" }),
  }),
  timezone: z.string().default("UTC"),
  dailyLimitMinor: BigIntStringSchema,
  perPurchaseLimitMinor: BigIntStringSchema,
  allowedAssets: z
    .array(z.enum(MVP_SETTLEMENT_ASSETS))
    .min(1, "At least one settlement asset must be allowed"),
})

// PATCH /api/agents/:id
export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  dailyLimitMinor: BigIntStringSchema.optional(),
  perPurchaseLimitMinor: BigIntStringSchema.optional(),
  approvalThresholdMinor: NonNegativeBigIntStringSchema.optional(),
  allowedAssets: z.array(z.enum(MVP_SETTLEMENT_ASSETS)).optional(),
})

// POST /api/agents/:id/fund
export const FundAgentSchema = z.object({
  assetSymbol: z.enum(MVP_SETTLEMENT_ASSETS),
  amountRaw: BigIntStringSchema,
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid Celo transaction hash"),
  idempotencyKey: z.string().min(8, "Idempotency key required for financial mutation"),
})

// POST /api/agents/:id/withdraw
export const WithdrawAgentSchema = z.object({
  assetSymbol: z.enum(MVP_SETTLEMENT_ASSETS),
  amountRaw: BigIntStringSchema,
  idempotencyKey: z.string().min(8, "Idempotency key required for financial mutation"),
})

// POST /api/agents/:id/purchases
export const CreatePurchaseSchema = z.object({
  merchantUrl: z.string().url("Invalid merchant URL"),
  resourceUrl: z.string().url("Invalid resource URL"),
  idempotencyKey: z.string().min(8, "Idempotency key required"),
})

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>
export type FundAgentInput = z.infer<typeof FundAgentSchema>
export type WithdrawAgentInput = z.infer<typeof WithdrawAgentSchema>
export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>
