# Murk

> **Spending authority layer for autonomous AI agents.**  
> Give an AI agent a budget in the currency you understand, and let it safely spend stablecoins inside that authority.

---

## The Problem & Insight

People increasingly delegate tasks to autonomous agents that need to buy APIs, compute, data, inference, and machine-accessible services.

Existing agent payment systems express financial controls in machine settlement assets (e.g. USDC or USDT). Humans, however, budget in their everyday accounting currencies—such as **NGN, AED, BRL, KES, MXN, COP, SAR, or INR**. A user should not have to maintain separate stablecoin budgets just to control one agent's economic authority.

**Murk decouples accounting authority from execution settlement:**
- **The Human Boundary**: Defined in local fiat accounting currency (e.g., Daily Mandate: `NGN 5,000`, Per-Purchase Limit: `NGN 2,000`).
- **The Agent Boundary**: Settled autonomously on **Celo mainnet** using permitted stablecoins (`USDC`, `USDT`) via the open **x402 payment protocol**.

Every payment request is converted into the user's accounting currency in real time and evaluated deterministically before any funds can move.

---

## Core Pillars

### 1. Deterministic Financial Policy Engine
- **Zero LLM Discretion**: The LLM has zero authority to approve payments, increase spending caps, or bypass rules.
- **Zero Floating-Point Arithmetic**: All financial math uses integer minor units and exact rational fractions (`bigint` numerator and denominator) with ceiling division to ensure spending authority is never understated.
- **Atomic Spend Reservations**: Funds are reserved against daily authority before transaction broadcast; on failure, reservations are released immediately.

### 2. Dual-Wallet Architecture & Key Isolation
- **Human Wallet**: Email OTP onboarding with Coinbase CDP Embedded Wallet EOA. Private key export is handled strictly within provider-isolated frames—application JavaScript and the server never receive or store the private key.
- **Agent Wallet**: A dedicated server-controlled execution EOA holding only physically delegated funds. Browser clients only ever receive the agent's public address.

### 3. Celo Mainnet & Native x402 Protocol
- Operates on **Celo Mainnet (Chain ID `42220`)** utilizing low-latency, gasless settlement.
- Natively connects with the Celo x402 Facilitator (`api.x402.celo.org`) to parse HTTP 402 challenges and settle payments.
- **ERC-8004** agent identity support and **ERC-8021** builder attribution at transaction boundaries.

---

## Canonical State Machine

```text
CREATED
   │
   ▼
PAYMENT_REQUIRED  ──► Detects HTTP 402 challenge from merchant
   │
   ▼
ASSET_SELECTED    ──► Selects valid permitted asset held by agent
   │
   ▼
RATE_RESOLVED     ──► Resolves live rational FX quote (source + timestamp)
   │
   ▼
POLICY_EVALUATION
   ├──► [BLOCKED]   ──► Exceeds limits ──► 0 funds moved, 0 signing calls, no TX
   └──► [APPROVED]  ──► Atomically reserves spend against mandate
            │
            ▼
      PAYMENT_SUBMITTED ──► Signs & broadcasts payment on Celo
            │
            ▼
      PAYMENT_SETTLED   ──► Confirmed onchain with TX hash
            │
            ▼
      RESOURCE_DELIVERED ──► Retries original request with payment proof
            │
            ▼
      COMPLETED         ──► Commits reservation, generates audit receipt
```

---

## Supported Currencies & Assets

| Category | Supported Assets |
| :--- | :--- |
| **MVP Accounting Currencies** | `NGN` (Nigerian Naira), `KES` (Kenyan Shilling), `BRL` (Brazilian Real), `MXN` (Mexican Peso), `COP` (Colombian Peso), `AED` (UAE Dirham), `SAR` (Saudi Riyal), `INR` (Indian Rupee) |
| **Settlement Tokens (Celo)** | `USDC` (`0xcebA9300f2b948710d2653dD7B07f33A8B32118C`)<br>`USDT` (`0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`) |
| **Network** | Celo Mainnet (`eip155:42220`) |

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router), React, TypeScript
- **Styling**: Tailwind CSS (custom consumer-finance design system, warm light-gray `#F4F4F2` canvas, dark floating navigation pill, tabular numerals)
- **EVM Client**: [viem](https://viem.sh/)
- **Protocol**: [x402 Payment Protocol](https://github.com/x402-foundation/x402)
- **Database & ORM**: Neon Serverless Postgres with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: Zod
- **Testing**: Vitest

---

## Getting Started

### 1. Prerequisites
- Node.js `v20.18.0` or higher
- npm

### 2. Installation
```bash
git clone https://github.com/Habuskid/murk.git
cd murk
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env.local` and configure your keys:
```bash
cp .env.example .env.local
```

| Variable | Description |
| :--- | :--- |
| `CELO_RPC_URL` | Celo RPC endpoint (default: `https://forno.celo.org`) |
| `CELO_CHAIN_ID` | `42220` |
| `DATABASE_URL` | Neon Postgres connection string |
| `CDP_PROJECT_ID` | Coinbase Developer Platform Project ID |
| `AGENT_WALLET_PRIVATE_KEY` | Server-controlled agent fallback private key |
| `X402_FACILITATOR_URL` | `https://api.x402.celo.org` |
| `EXCHANGE_RATE_API_URL` | Reference exchange rate provider endpoint |

### 4. Running Verification Suites
Run the automated unit, integration, and security test suites (28 tests):
```bash
npm run test
```

Run the live Phase 0 Celo mainnet verification runner (Spikes A through E):
```bash
npm run spikes
```

### 5. Running the Application
```bash
# Start development server
npm run dev

# Build for production
npm run build
npm run start
```
Navigate to `http://localhost:3000` to interact with the responsive wallet.

---

## Security & Reliability Principles

1. **Fail-Closed Safety**: Any uncertain state (stale rate, RPC dropout, malformed requirement) stops execution immediately before money moves.
2. **Post-Payment Protection**: If an external resource fails after onchain payment, a second payment is never triggered automatically.
3. **Owner Scoping**: All API operations are strictly scoped to the authenticated human owner.
4. **No Simulated Assets**: If a merchant only accepts USDC, Murk does not fabricate choices.

---

## License

Apache-2.0
