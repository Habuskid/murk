# Engineering 1: CORE

## Goal

Build Murk's deterministic financial logic independently from UI, blockchain, database, wallet provider, x402 provider, and LLM.

## Modules

```text
Money
RateProvider interface
SettlementSelector
PolicyEngine
MandateLedger interface
PurchaseDecision
```

## Money

Never use JS floating-point arithmetic for money.

Use integer amounts and explicit decimals.

```ts
type Money = {
  amount: bigint
  currency: string
  decimals: number
}
```

Accounting values use integer minor units.

## Rate Quote

```ts
type RateKind = "EXECUTABLE_ONCHAIN" | "REFERENCE_FX" | "PEG_REFERENCE"

type RateQuote = {
  baseAsset: string
  quoteCurrency: string
  rateNumerator: bigint
  rateDenominator: bigint
  kind: RateKind
  source: string
  timestamp: Date
  expiresAt: Date
}
```

Reject:

- stale rate;
- zero/negative rate;
- wrong base;
- wrong quote;
- missing source;
- invalid timestamp.

## Settlement Selector

Inputs:

- merchant accepted assets;
- wallet balances;
- allowed assets;
- reserve rules.

Rules:

1. merchant must accept asset;
2. asset must be enabled;
3. user policy must allow asset;
4. wallet balance must be sufficient;
5. reserve must remain satisfied;
6. prefer direct settlement;
7. do not swap in MVP;
8. choose deterministically.

Output must include selected asset and rejected candidate reasons.

## Spending Mandate

```ts
type SpendingMandate = {
  accountingCurrency: string
  dailyLimitMinor: bigint
  perPurchaseLimitMinor: bigint
  spentTodayMinor: bigint
  status: "ACTIVE" | "PAUSED"
}
```

## Policy Engine

Evaluation order:

1. agent active;
2. mandate active;
3. purchase value positive;
4. settlement asset allowed;
5. per-purchase limit respected;
6. daily authority sufficient.

Result:

```ts
type PolicyDecision = {
  decision: "APPROVED" | "BLOCKED"
  reasonCodes: string[]
  accountingCurrency: string
  purchaseValueMinor: bigint
  spentBeforeMinor: bigint
  remainingBeforeMinor: bigint
  spentAfterMinor?: bigint
  remainingAfterMinor?: bigint
}
```

## Reason Codes

At minimum:

```text
AGENT_PAUSED
MANDATE_INACTIVE
INVALID_PURCHASE_AMOUNT
ASSET_NOT_ALLOWED
PER_PURCHASE_LIMIT_EXCEEDED
DAILY_MANDATE_EXCEEDED
INSUFFICIENT_BALANCE
RESERVE_VIOLATION
NO_VALID_SETTLEMENT_ASSET
RATE_UNAVAILABLE
RATE_EXPIRED
```

## Spend Reservation

Before payment, approved accounting value must be reserved atomically.

On payment confirmation: commit.

On payment failure: release.

Two simultaneous purchases must not overspend the same remaining authority.

## Core Exit Tests

Must pass:

- valid approved purchase;
- daily limit exceeded;
- per-purchase exceeded;
- paused agent;
- unsupported asset;
- insufficient balance;
- reserve violation;
- expired rate;
- exact-boundary amount;
- one minor unit over boundary;
- concurrent overspend attempt;
- deterministic repeated input.
