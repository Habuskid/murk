# Engineering 5: HARDEN

## Goal

Attack the system before UI polish.

The system must fail closed.

## Required Failure Tests

### Financial

- daily mandate exceeded;
- per-purchase limit exceeded;
- paused agent;
- concurrent overspend;
- duplicate request;
- reserve violation;
- balance changed after evaluation;
- mandate changed before settlement.

### Merchant / x402

- malformed 402;
- missing payTo;
- zero/negative amount;
- unsupported asset;
- wrong chain;
- changed terms;
- unsupported scheme;
- resource failure after payment.

### Rates

- stale rate;
- provider timeout;
- invalid JSON;
- unsupported pair;
- zero or negative rate;
- material stablecoin deviation if a valuation policy is configured.

### Infrastructure

- RPC unavailable before send;
- RPC timeout after submission;
- reverted transaction;
- database unavailable before payment;
- database failure after transaction submission;
- auth session expiration;
- mobile network loss;
- browser background/restore.

## Critical Rules

- uncertain transaction status must be reconciled, not blindly retried;
- post-payment resource failure must never trigger an automatic second payment;
- user must always be told whether funds moved;
- refresh must recover persisted state;
- frontend button disabling is not idempotency protection;
- blocked purchase must cause zero signing and zero broadcast.

## Security Controls

- owner scoping on every agent/resource query;
- server-side Zod validation;
- URL restrictions to prevent SSRF if arbitrary resource URLs are allowed;
- explicit timeouts;
- conservative retry rules;
- security headers compatible with auth/export provider iframe requirements;
- no secrets in logs.

## Human Emergency Controls

- pause agent;
- withdraw agent funds back to human wallet.

## Hardening Exit Gate

A valid golden-path purchase still works while all known failure cases fail safely and leave recoverable evidence.
