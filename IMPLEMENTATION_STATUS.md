# IMPLEMENTATION STATUS

Last reviewed: 18 September 2026

This is a truth-status document, not a marketing document.

## Summary

Murk currently has a substantial deterministic policy/core implementation and a wallet-style UI shell, but the full live hackathon golden path is NOT complete yet.

The project is currently between INTEGRATE and END-TO-END.

## SPIKE

### Celo RPC and token reads

Status: CODE EXISTS

- Celo chain ID 42220 configured.
- USDC and USDT token reads implemented.
- Live environment verification still required after current dependency migration.

### External x402 challenge

Status: PASSED

CI successfully verified a real independent Celo x402 challenge from:

`https://agent402.tools/api/answer?q=what%20is%20celo`

The live response exposed one Celo payment requirement. This proves discovery/parsing, not paid settlement.

### Multi-asset merchant support

Status: CURRENT GOLDEN MERCHANT IS SINGLE-ASSET

Spike D inspects the live merchant. Murk must not claim multi-asset selection against this merchant unless the live response changes and the spike proves multiple accepted Celo assets.

### Rate provider

Status: CODE EXISTS

Reference FX adapter exists for the accounting layer.

Live support for all eight currencies still needs one verification run.

### Embedded user wallet

Status: PORTAL-ONLY AUTH + WALLET CODED, LIVE VERIFICATION PENDING

Implemented in code:

- Portal-managed email magic-link authentication;
- server-side exchange of the single-use Portal callback token;
- Portal Client Session Token validation against Portal client details;
- signed HttpOnly Murk application session;
- Portal Web SDK provider using a server `authUrl`;
- server-issued Portal Web OTP route;
- Portal MPC wallet create/reuse flow;
- Portal Celo address registration;
- Portal backup/Eject verification gates.

Still requires real Portal authentication configuration, Custodian credentials, and browser verification.

### Production build

Status: PASSED

CI passes on Next.js 16.3.3 after the migration from the older Next file-tracing path.

Verified in CI:

- dependency install;
- test suite;
- production Next build;
- external x402 challenge probe.

## CORE

Status: SUBSTANTIALLY IMPLEMENTED

Implemented:

- bigint money model;
- deterministic settlement selector;
- deterministic policy engine;
- daily mandate;
- per-purchase limit;
- reserve handling;
- reason codes;
- unit tests.

No LLM authorization path is present.

## INTEGRATE

Status: IN PROGRESS

Implemented in code:

- Celo RPC client;
- real token balance reads;
- x402 v2 challenge parsing;
- x402 v2 Exact EVM live executor;
- exact approved-payment selection guard;
- reference FX provider.

Not yet live verified:

- external x402 paid request;
- settlement transaction;
- resource delivery;
- live Portal embedded wallet verification;
- Portal-signed funding;
- Portal-signed withdrawal;
- ERC-8004;
- ERC-8021.

## END-TO-END

Status: NOT PASSED

A full real path from:

`Portal email magic link -> Portal user wallet -> fund agent -> real external 402 -> Murk policy -> live x402 settlement -> resource -> persisted receipt`

has not yet been demonstrated.

## PERSIST

Status: NOT PASSED

Drizzle schema exists, but runtime repository is still in memory.

## HARDEN

Status: PARTIAL

Implemented/tested at logic level:

- malformed requirements;
- unsupported chain rejection;
- invalid rate rejection;
- concurrent policy reasoning;
- post-payment no-double-payment intent;
- no random success transaction fallback.

Still requires live E2E hardening after integrations are real.

## UI

Status: PARTIAL

Current direction is aligned with locked light wallet styling.

Recent corrections:

- dark mode removed;
- hard-coded wallet balances removed from page state;
- fake fiat asset valuation removed;
- invented merchant names removed;
- blocked activity no longer looks like funds moved;
- local self-merchant removed from runtime golden path;
- fake withdrawal control disabled.

Remaining:

- live Portal magic-link onboarding verification;
- create-agent onboarding;
- real user-wallet surface;
- real funding flow;
- receipt/detail screens;
- final responsive refinement.

## POLISH

Status: NOT STARTED AS A COMPLETE PHASE

Some microinteraction styling exists, but polish must wait until E2E is real.

## DEMO LOCK

Status: NOT READY

Do not demo the current local merchant fixture or synthetic wallet/user state as final hackathon evidence.
