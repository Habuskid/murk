# System Design

## Components

```text
Responsive Web App
    |
    v
Next.js Server
    |
    +--> Authentication / User Wallet Adapter
    +--> Agent Controller
    +--> Agent Orchestrator
    +--> Settlement Selector
    +--> Rate Provider
    +--> Policy Engine
    +--> Mandate Ledger
    +--> x402 Client
    +--> Celo Client
    +--> Persistence Repositories
    |
    v
Neon Postgres
```

External boundaries:

```text
CDP Embedded Wallet
CDP Server Wallet or approved fallback
Celo Mainnet RPC
External x402 merchant
Mento where a valid route exists
External reference FX provider
ERC-8004 infrastructure
ERC-8021 attribution helper
```

## Human Wallet

- email OTP onboarding;
- embedded EVM EOA;
- human-controlled funds;
- funding agent wallet;
- manual withdrawals/transfers;
- secure export/recovery;
- no seed phrase required during onboarding.

## Agent Wallet

- separate from user wallet;
- server-controlled execution boundary;
- holds only delegated funds;
- signs autonomous x402 payments after policy approval;
- public address visible to UI;
- signing material never exposed to browser.

## Orchestrator

Canonical workflow:

```text
request resource
receive 402
persist 402
read balances
select asset
resolve rate
convert accounting value
evaluate policy
reserve spend
execute approved payment
confirm settlement
retry resource
persist resource evidence
commit/release reservation
generate receipt
```

## State Machine

```text
CREATED
PAYMENT_REQUIRED
ASSET_SELECTED
RATE_RESOLVED
POLICY_APPROVED or POLICY_BLOCKED
SPEND_RESERVED
PAYMENT_SUBMITTED
PAYMENT_SETTLED
RESOURCE_RECEIVED
COMPLETED
```

Failure states:

```text
PAYMENT_FAILED
RESOURCE_FAILED
```

## Trust Boundaries

### Browser

Untrusted for financial authority.

Never contains:

- agent private keys;
- server-wallet secrets;
- database credentials;
- rate provider secrets;
- application signing secrets.

### Server

Trusted application execution boundary for:

- deterministic policy;
- orchestration;
- rate resolution;
- agent signing adapter;
- persistence;
- x402 execution.

### Celo

Authoritative for whether an onchain transaction actually settled.

### External Merchant

Untrusted input source. Validate all payment requirements before use.

## Failure Principle

When financial state is uncertain, stop and reconcile. Do not guess and do not resubmit blindly.
