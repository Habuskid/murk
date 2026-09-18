# Murk

Murk is a spending authority layer for autonomous agents on Celo.

A user defines financial authority in an accounting currency they understand, such as NGN or AED. The agent may then settle compatible machine purchases in permitted stablecoins, but only when deterministic Murk policy says the purchase fits inside that authority.

> Humans define the economic boundary. Machines choose how to operate inside it.

## Why Murk

Machine payment rails can let software spend stablecoins. Human budgets usually do not work in settlement-token units.

A user may think:

```text
NGN 5,000 per day
NGN 2,000 per purchase
```

while an external service invoices:

```text
1.00 USDC
```

Murk separates the two concepts:

```text
Human accounting authority
        |
        v
Rate evidence
        |
        v
Deterministic policy
        |
        v
Approved stablecoin settlement
        |
        v
x402 on Celo
```

An LLM does not control the financial boundary.

## Current Status

The deterministic core, Neon-backed runtime repository, Portal integration code, responsive product UI, funding/withdrawal code, and external x402 challenge discovery are implemented.

The full live golden path is **not complete yet**.

### Verified in CI

- Next.js 16.3.3 production build;
- Vitest suite;
- Celo/x402 external 402 challenge discovery;
- current merchant payment-requirement inspection;
- Chromium UI rendering;
- 320px, 390px, 768px, and 1280px responsive checks;
- horizontal-overflow checks;
- navigation interactions;
- authority hide/show;
- allowed/over-limit selector;
- add/return wallet panels;
- email-sign-in sandbox flow;
- first-agent onboarding and authority preview.

### Still requires live verification

- real Portal email magic-link round trip;
- real Portal MPC wallet creation/reuse on Celo;
- real Portal-wallet funding transaction;
- real paid external x402 settlement;
- delivered paid resource;
- real agent withdrawal to the bound Portal wallet;
- production Neon provisioning/schema verification;
- ERC-8004 registration;
- final program-assigned ERC-8021 attribution proof;
- public demo deployment.

See:

- [AGENTS.md](./AGENTS.md)
- [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md)
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
- [BLOCKERS.md](./BLOCKERS.md)

## Locked Product Model

### Accounting currencies

The MVP accounting currencies are:

| Code | Currency |
| --- | --- |
| NGN | Nigerian Naira |
| KES | Kenyan Shilling |
| BRL | Brazilian Real |
| MXN | Mexican Peso |
| COP | Colombian Peso |
| AED | UAE Dirham |
| SAR | Saudi Riyal |
| INR | Indian Rupee |

These are accounting units. They do not require matching local stablecoins.

### Settlement assets

Candidate MVP settlement assets:

- USDC
- USDT
- USAT

The current runtime token registry/UI uses verified Celo USDC/USDT metadata.

Murk must not claim that a merchant accepts multiple assets unless the real merchant response proves it.

## Human Authentication and Wallet

Murk uses Portal for both human authentication and the embedded human wallet.

```text
Email
  |
  v
Portal magic link
  |
  v
Portal end-user/client
  |
  v
Signed Murk HttpOnly session
  |
  v
Portal Web MPC wallet
  |
  v
Celo address
```

Murk does not require MetaMask, Rabby, WalletConnect, Coinbase Wallet, or another external wallet for normal onboarding.

The Portal Custodian API key remains server-only.

Portal backup/recovery and Eject still require live verification before Murk claims verified wallet portability.

## Agent Execution Wallet

The human wallet and autonomous execution wallet are separate.

Each Murk agent address is deterministically derived server-side from:

- `AGENT_WALLET_MASTER_SECRET`;
- the immutable Murk agent ID;
- a versioned derivation domain.

The signing key is never persisted in Neon and never reaches the browser.

The current hackathon app still limits each user to one user-created execution agent.

## Funding

The intended live funding path is:

```text
Portal human wallet
        |
        v
ERC-20 transfer on Celo
        |
        v
Confirmed transaction receipt
        |
        v
Murk verifies exact Transfer
from + to + token + amount
        |
        v
Persist transaction evidence
        |
        v
Agent funds become usable
```

A browser-provided transaction hash alone is not trusted.

## Financial Policy

Murk enforces:

- daily authority in the user's accounting currency;
- per-purchase authority in the user's accounting currency;
- allowed settlement assets;
- reserve constraints;
- agent pause state;
- fresh rate evidence;
- atomic spend reservation before signing.

Money math uses integer/rational representations.

An LLM cannot approve payments, modify limits, estimate FX, or bypass policy.

## x402

Murk uses the x402 v2 TypeScript package family:

- `@x402/core`
- `@x402/evm`
- `@x402/fetch`

The external challenge probe currently verifies:

`https://agent402.tools/api/answer?q=what%20is%20celo`

The merchant currently exposes one Celo payment requirement.

That proves challenge discovery and parsing, not a paid settlement.

Murk's executor is constrained to the exact token, amount, recipient, network, and scheme already approved by Murk policy.

## Persistence

Runtime state is implemented with Neon Postgres and Drizzle.

Persisted domains include:

- users;
- human and agent wallets;
- agents;
- settlement-asset configuration;
- mandates;
- purchases;
- spend reservations;
- receipts;
- transactions;
- idempotency records;
- original payment requirements;
- rate evidence;
- policy decisions;
- delivered-resource evidence.

A real Neon database still needs to be provisioned and tested in the deployed environment.

## Financial Concurrency

Before payment signing, Murk performs an atomic spend reservation.

This prevents two concurrent requests from independently observing the same remaining daily authority and both spending it.

Money-moving idempotency keys are also atomically claimed before execution.

## Withdrawal / Recovery

Agent funds may only be returned to the authenticated user's bound Portal wallet.

The browser cannot choose an arbitrary destination address.

The server-side agent EOA signs the return transaction.

Live Celo verification of this path is still pending.

## ERC-8004

The locked ownership model is:

- human Portal wallet owns the identity NFT;
- separate Murk execution EOA is bound as the agent wallet.

Live registration is not implemented yet and must not be claimed as complete.

## ERC-8021

Murk includes ERC-8021-compatible attribution helpers using the published `ox/erc8021` primitive.

The direct transaction path can append a configured attribution suffix.

Still required:

- obtain the actual hackathon/program-assigned Murk code;
- configure `CELO_ATTRIBUTION_CODE`;
- prove the code on a qualifying live transaction;
- verify attribution in the final x402 settlement path.

## Golden Demo Path

The target real demo is:

```text
Portal email sign-in
-> Portal human wallet
-> create Research Agent
-> choose accounting currency
-> set daily/per-purchase authority
-> fund isolated agent wallet
-> request independent x402 resource
-> preserve original 402
-> inspect real accepted requirement(s)
-> inspect real agent balances
-> resolve accounting rate
-> deterministic policy APPROVES
-> atomic spend reservation
-> live x402 settlement on Celo
-> real paid resource delivered
-> transaction/rate/policy/resource evidence persisted
-> remaining authority updated
-> second external request exceeds policy
-> deterministic policy BLOCKS
-> no second transaction
-> zero funds moved
```

## UI

Murk uses a consumer-finance wallet system:

- warm light-gray canvas;
- white financial surfaces;
- Manrope product typography;
- IBM Plex Mono technical identifiers;
- near-black text;
- restrained blue accent;
- restrained green/red status states;
- consistent Lucide interface icons;
- dark pill navigation;
- daily authority as the hero financial object;
- stablecoins as secondary execution details.

Mobile navigation is fixed near the bottom.

Tablet and desktop navigation remains in document flow so it does not cover content.

The product is browser-tested from 320px mobile through 1280px desktop.

## Test-Only UI Sandbox

The repository contains test-only browser routes under:

`/ui-sandbox`

They are available only when:

```text
UI_SANDBOX_MODE=true
```

Production must not enable this variable.

Sandbox fixture state is only for UI/browser QA. It is never transaction or hackathon demo evidence.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Portal Web SDK
- viem
- x402 v2
- Neon Postgres
- Drizzle ORM
- Zod
- Vitest
- Playwright
- Celo mainnet

## Environment

Copy:

```bash
cp .env.example .env.local
```

Important variables include:

```text
CELO_RPC_URL=
NEXT_PUBLIC_CELO_RPC_URL=
CELO_CHAIN_ID=42220
CELO_ATTRIBUTION_CODE=

DATABASE_URL=

PORTAL_AUTH_ENVIRONMENT_ID=
PORTAL_AUTH_FROM_EMAIL=
PORTAL_AUTH_TEMPLATE_ID=
PORTAL_CUSTODIAN_API_KEY=
MURK_SESSION_SECRET=

AGENT_WALLET_MASTER_SECRET=

X402_FACILITATOR_URL=
X402_PROBE_RESOURCE_URL=
NEXT_PUBLIC_X402_RESOURCE_URL=
NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL=

EXCHANGE_RATE_API_URL=

ENABLE_LOCAL_X402_FIXTURE=false
```

See [.env.example](./.env.example) for details.

## Install

The committed `package-lock.json` is currently stale and still reflects the old dependency stack.

Until it is regenerated, use:

```bash
npm install
```

Then:

```bash
npm test
npm run build
```

After regenerating and committing the lockfile, clean installs should move back to:

```bash
npm ci
```

## Spikes

Useful integration probes:

```bash
npm run spike:a
npm run spike:b
npm run spike:c
npm run spike:d
npm run spike:e
```

The external x402 spike must use a real independent Celo x402 resource.

A simulated 402 body is not accepted as live proof.

## Local Merchant Fixture

`/api/merchant/*` is development-only and disabled unless:

```text
ENABLE_LOCAL_X402_FIXTURE=true
```

It must never be shown as independent golden-demo evidence.

## Demo Evidence Standard

A successful paid purchase must preserve:

- purchase ID;
- original external 402;
- real accepted payment requirement;
- selected settlement asset;
- rate source and timestamp;
- policy decision/reason codes;
- Celo transaction hash;
- delivered-resource evidence;
- remaining accounting authority.

A blocked purchase must preserve:

- external request/402;
- accounting value;
- policy reason code;
- no signing/payment execution;
- no transaction hash;
- zero funds moved.

## License

Apache-2.0
