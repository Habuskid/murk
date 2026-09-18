# Murk

Murk is a spending authority layer for autonomous agents on Celo.

A user defines financial authority in an accounting currency they understand, such as NGN, AED, BRL, KES, MXN, COP, SAR, or INR. The agent can then purchase compatible machine services with permitted stablecoins, but only when deterministic policy says the purchase fits inside that authority.

> Give an AI agent a budget in the currency you understand, and let it spend stablecoins only inside that boundary.

## Product Thesis

People increasingly delegate tasks to autonomous agents that may need to purchase APIs, data, compute, inference, and other machine-accessible services.

Payment rails can already let agents spend stablecoins. The control problem is different: a human may budget in NGN or AED while the machine settles in USDC or USDT.

Murk separates those two layers:

```text
Human accounting authority
NGN 5,000 / day
        |
        v
Deterministic Murk policy
        |
        v
Approved machine settlement
USDC / USDT when actually supported
        |
        v
x402 on Celo
```

The LLM does not control the financial boundary.

## Current Status

The repository is actively being brought back into alignment with the locked build specification after an early demo-oriented MVP.

Read:

- [AGENTS.md](./AGENTS.md)
- [LOCKED_DECISIONS.md](./LOCKED_DECISIONS.md)
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)
- [BLOCKERS.md](./BLOCKERS.md)

The full live golden path is **not yet complete**.

### Implemented

- deterministic bigint money model;
- settlement eligibility/selection logic;
- local-currency daily mandate;
- per-purchase limit;
- reserve-aware policy rules;
- reason-coded approve/block decisions;
- Celo mainnet RPC and ERC-20 balance reads;
- reference FX-rate adapter;
- x402 v2 challenge parsing;
- x402 v2 Exact EVM client executor constrained to the exact Murk-approved terms;
- wallet-style responsive UI shell;
- blocked-purchase path with no payment execution;
- unit/integration-style tests for core policy behavior.

### Integration still required or still needs live verification

- independent external Celo x402 merchant;
- a real successful x402 payment and delivered resource;
- email OTP embedded user wallet;
- real human-wallet funding;
- real human-wallet withdrawal;
- Neon-backed runtime persistence;
- real ERC-8004 agent registration;
- correct current-hackathon ERC-8021 attribution;
- secure embedded-wallet export/recovery;
- final golden-demo evidence.

Murk deliberately fails closed where these integrations are not yet wired. It does not fabricate success.

## Golden Path

The target live demo is:

```text
Email OTP
-> embedded user wallet
-> create Research Agent
-> choose accounting currency
-> define daily mandate
-> fund agent execution wallet
-> request independent x402 resource
-> parse merchant payment options
-> inspect real agent balances
-> select a valid permitted settlement asset
-> resolve accounting reference value
-> deterministic policy APPROVES
-> x402 v2 settlement on Celo mainnet
-> paid resource delivered
-> receipt persisted
-> remaining mandate updated
-> oversized second request
-> deterministic policy BLOCKS
-> no second transaction
```

No local self-merchant may be presented as external golden-demo evidence.

## Supported Accounting Currencies

The locked MVP list is:

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

These are accounting units. They do not all need an onchain local stablecoin.

## Settlement Assets

Candidate MVP settlement assets are USDC, USDT, and USAT.

Only assets that are actually verified for the selected Celo x402 merchant/facilitator path may be exposed as supported in the live product.

The current token registry includes Celo USDC and USDT. Multi-asset x402 support is treated as an observed merchant property, not an assumption.

## Architecture

```text
Responsive web app
        |
        v
Authenticated human
        |
        v
Embedded user wallet
        |
   delegated funds
        v
Agent execution wallet
        |
        v
Murk policy engine
  |              |
  |              +-> Rate provider
  |
  +-> x402 v2 client
        |
        v
Celo mainnet
        |
        v
Independent paid resource
```

The human wallet and agent wallet are intentionally separate.

The agent can only spend the assets delegated to its execution wallet.

## Financial Safety Rules

Murk follows these invariants:

1. No valid rate means no autonomous payment.
2. No valid settlement asset means no autonomous payment.
3. A blocked purchase never calls the payment executor.
4. The LLM cannot increase or bypass a mandate.
5. Monetary arithmetic uses integer/rational representations, not floating-point money math.
6. The x402 executor may only settle the exact token, amount, payTo, scheme, and network approved by Murk.
7. If merchant terms change after policy approval, payment is refused.
8. A settled transaction is never replaced by a fabricated success state.
9. Resource failure after settlement must never trigger a second payment automatically.
10. Unimplemented money-moving routes fail closed.

## x402

The runtime has been migrated to the current x402 v2 TypeScript package family:

- `@x402/core`
- `@x402/evm`
- `@x402/fetch`

The client registers the Exact EVM scheme for `eip155:42220`.

Murk first evaluates the merchant requirement itself. The x402 client's payment-requirement selector is then constrained to the exact requirement already approved by Murk.

This prevents the protocol client from silently selecting a different settlement option after policy approval.

## Local Merchant Fixture

`/api/merchant/*` is a development-only x402-shaped fixture.

It is disabled unless:

```text
ENABLE_LOCAL_X402_FIXTURE=true
```

It is not an independent merchant, does not prove real facilitator settlement, and must never be used as submission evidence.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- viem
- x402 v2
- Neon Postgres + Drizzle schema
- Zod
- Vitest
- Celo mainnet

The Neon schema exists, but the runtime repository is still being migrated from the current in-memory implementation. See [BLOCKERS.md](./BLOCKERS.md).

## Environment

Copy:

```bash
cp .env.example .env.local
```

Important current variables include:

```text
CELO_RPC_URL=
DATABASE_URL=

AGENT_WALLET_PRIVATE_KEY=

X402_FACILITATOR_URL=
X402_PROBE_RESOURCE_URL=
NEXT_PUBLIC_X402_RESOURCE_URL=
NEXT_PUBLIC_X402_BLOCKED_RESOURCE_URL=

EXCHANGE_RATE_API_URL=
```

Additional CDP variables exist for the upcoming embedded-wallet integration.

## Install

The x402 dependency family was recently migrated to v2. Regenerate the lock file in the development environment:

```bash
npm install
```

Then run:

```bash
npm test
npm run build
```

Do not claim a passing build until those commands have actually run after the current migration.

## Live Spike Gate

The spike runner is intentionally strict:

```bash
npm run spikes
```

The x402 spikes require:

```text
X402_PROBE_RESOURCE_URL
```

to point to a real independent x402-protected Celo resource.

A simulated 402 body is not accepted as proof.

## UI Direction

Murk uses a consumer-finance wallet visual system:

- warm light-gray canvas;
- white rounded financial surfaces;
- near-black typography;
- restrained blue accent;
- restrained green/red status colors;
- dark floating navigation pill;
- responsive mobile/tablet/desktop composition.

The locked MVP does not include dark mode, a physical card visual, gradients, glow, glassmorphism-heavy styling, crypto-casino visuals, or a generic SaaS sidebar.

## Demo Evidence Standard

A successful live purchase must preserve enough evidence to show:

- the original external 402;
- accepted payment requirement(s);
- selected asset and why it was eligible;
- rate source and timestamp;
- policy decision;
- Celo settlement transaction hash;
- delivered resource evidence;
- remaining local-currency mandate.

A blocked purchase must show:

- requested accounting value;
- remaining authority;
- reason code;
- no signing/payment execution;
- no transaction hash;
- zero funds moved.

## License

Apache-2.0
