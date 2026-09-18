# Product Thesis

## Problem

People increasingly delegate tasks to autonomous agents that may need to buy APIs, research, compute, data, AI inference, and other machine-accessible services.

Existing agent payment systems often express financial controls in machine settlement assets such as USDC or USDT. Humans usually budget in currencies such as NGN, AED, SAR, BRL, KES, or INR.

A user should not have to maintain separate stablecoin budgets just to control one agent's economic authority.

## Insight

Human accounting currency and machine settlement currency should be separate layers.

A user can define:

```text
Research Agent
Daily mandate: NGN 10,000
Per-purchase limit: NGN 2,000
```

while the agent's execution wallet may hold permitted stablecoins.

Every attempted purchase is valued in the user's accounting currency at decision time and charged against one shared mandate.

## Product

Murk is a spending authority layer for autonomous agents.

Murk lets a human:

- sign in using email OTP;
- receive an embedded EVM wallet without installing a Web3 extension;
- create an autonomous agent;
- choose an accounting currency;
- set daily and per-purchase financial authority;
- fund a separate execution wallet;
- let the agent make compatible x402 purchases autonomously inside the mandate;
- inspect approved, blocked, failed, and completed purchases;
- withdraw unused agent funds;
- securely export the human wallet if needed.

## Core Decision

For every paid service Murk determines:

1. what the merchant accepts;
2. which accepted assets are allowed;
3. which allowed assets the agent actually holds;
4. whether reserve requirements remain satisfied;
5. the accounting-currency value of the purchase;
6. whether per-purchase and daily mandates permit it;
7. whether the agent is active;
8. whether the transaction should proceed.

The result is deterministic:

```text
APPROVED
```

or:

```text
BLOCKED
```

## Differentiation

Do not claim Murk invented:

- agent wallets;
- spending caps;
- x402;
- stablecoin payments;
- multi-stablecoin routing;
- fiat-valued budgets in general;
- local stablecoins.

The defensible product composition is:

> One human-selected local accounting-currency mandate governs autonomous x402 purchases across permitted machine settlement assets.

The human controls economic authority. The agent controls execution only inside that authority.

## User Types

### Individual

A person gives a personal agent controlled spending authority for machine-accessible services.

### Team or Business

A team gives separate agents their own mandates while continuing to budget in its normal accounting currency.

Do not build separate personal and business products for the hackathon.

## One-Sentence Product

Give an AI agent a budget in the currency you understand, and let it safely spend stablecoins inside that authority.

## Product Principle

Humans define the economic boundary. Machines operate inside it.
