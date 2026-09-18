# API Contracts

All input is validated server-side with Zod.

Do not expose vendor-specific raw errors to the frontend.

## POST /api/agents

Creates a DRAFT agent.

Input concept:

```json
{
  "name": "Research Agent",
  "accountingCurrency": "NGN",
  "timezone": "Africa/Lagos",
  "dailyLimitMinor": "500000",
  "perPurchaseLimitMinor": "200000",
  "allowedAssets": ["USDT", "USDC"]
}
```

Server validates currencies/assets against locked configuration.

## GET /api/agents/:id

Returns owner-scoped public agent state.

Must not return signing material.

## PATCH /api/agents/:id

Only approved mutable fields.

Financial policy changes create a new mandate version.

## POST /api/agents/:id/fund

Human-authorized funding flow.

Must be idempotent.

## POST /api/agents/:id/pause

Immediately prevents new autonomous purchases.

## POST /api/agents/:id/resume

Human-authorized resume.

## POST /api/agents/:id/withdraw

Returns delegated funds to the owner's human wallet.

Human-sensitive action. Idempotent.

## GET /api/agents/:id/balances

Returns verified onchain balances for enabled assets.

## POST /api/agents/:id/purchases

Creates a purchase workflow.

Input should remain narrow. For hackathon MVP, prefer verified resource targets rather than unrestricted URLs until SSRF protections are complete.

Response immediately returns `purchaseId` and initial state.

## GET /api/purchases/:id

Returns persisted normalized purchase state for the owner.

## GET /api/purchases/:id/receipt

Returns persisted server-generated receipt.

Do not calculate historical receipt values from current FX or frontend values.

## GET /api/activity

Owner-scoped paginated activity.

Includes:

- completed;
- blocked;
- failed.

## GET /api/health

Internal operational health summary:

- app;
- database;
- Celo RPC;
- rate provider.

Must not move funds.
