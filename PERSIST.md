# Engineering 4: PERSIST

## Goal

Ensure Murk can prove what happened after refresh, re-login, browser close, deployment, or server restart.

## Truth Sources

- Postgres is the application record.
- Celo is the settlement record.
- Frontend state is not authoritative.
- Logs are not a substitute for financial persistence.

## Persist

- user relationship;
- wallet public addresses and provider type;
- agents;
- versioned mandates;
- allowed assets and reserve rules;
- purchases;
- original payment requirements;
- rate quotes;
- policy decisions;
- spend reservations;
- transaction records;
- resource-delivery metadata;
- receipts;
- audit/event timeline.

## Versioned Mandates

Changing a mandate creates a new version. Historical purchases continue referencing the mandate version used at decision time.

## Historical Rates

Never recalculate an old receipt using today's FX rate.

Every purchase stores the exact quote used.

## Spend Reservations

Use database transactions/row locking so concurrent requests cannot reserve more than remaining authority.

Statuses:

```text
RESERVED
COMMITTED
RELEASED
```

## Transaction Status

```text
CREATED
SUBMITTED
CONFIRMED
REVERTED
FAILED
```

Do not mark `CONFIRMED` before chain evidence.

## Idempotency

Money-moving operations require idempotency protection.

At minimum:

- fund agent;
- execute purchase;
- withdraw;
- submit x402 payment.

## Recovery

For `PAYMENT_SUBMITTED`, reconcile transaction hash with Celo instead of resubmitting blindly.

For `PAYMENT_SETTLED` plus resource failure, do not create a second payment automatically.

## Timezone

Store a timezone for mandate period calculations.

Daily authority uses the user's selected/local day boundary, converted to UTC for querying.

## Persistence Exit Gate

A completed or blocked purchase can be reconstructed without calling a live external API.
