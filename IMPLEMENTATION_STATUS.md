# IMPLEMENTATION STATUS

Last reviewed: 18 September 2026

This is a truth-status document, not a marketing document.

## Summary

Murk has completed the deterministic CORE, most runtime persistence work, the responsive product UI, and a substantial portion of INTEGRATE/HARDEN.

The full real hackathon golden path is still **not complete** because Portal credentials, a live funded human wallet, a live funded agent wallet, a successful paid external x402 execution, ERC-8004 registration, and final ERC-8021 proof still require live verification.

Current phase:

`INTEGRATE -> END-TO-END -> HARDEN`

UI implementation has been advanced by explicit owner instruction, but UI completion does not substitute for the missing live E2E gate.

## CI

Status: PASSING

Current GitHub Actions verifies:

- reproducible dependency install with `npm ci`;
- Vitest suite, including deterministic ERC-8004 signing/calldata coverage;
- Drizzle migration-history validation with `drizzle-kit check`;
- Next.js 16.3.3 production build;
- independent external Celo x402 challenge probe;
- live merchant payment-requirement inspection;
- live reference-FX coverage for all eight locked accounting currencies;
- stale-rate fail-closed verification;
- browser UI sandbox build;
- Chromium rendering and interaction tests.

Current UI browser coverage includes:

- 320px narrow mobile;
- 390px mobile;
- 768px tablet;
- 1280px desktop;
- navigation state;
- authority hide/show;
- allowed/over-limit selector;
- fund/return panel expansion;
- horizontal-overflow checks;
- email sign-in sandbox state;
- email-link confirmation state;
- first-agent onboarding and authority preview.

The UI sandbox is test-only and is not demo evidence.

## SPIKE

### Celo RPC and token reads

Status: CODED, BUILD-VERIFIED, LIVE APP VERIFICATION STILL REQUIRED

- Celo chain ID 42220 configured.
- Celo RPC client exists.
- Celo USDC and USDT token metadata/balance reads exist.
- Live funded-wallet verification remains part of final E2E.

### External x402 challenge

Status: PASSED

CI verifies a real independent Celo x402 challenge from:

`https://agent402.tools/api/answer?q=what%20is%20celo`

Verified:

- real HTTP 402;
- payment requirement parsing;
- Celo network `eip155:42220`;
- real merchant payment requirement.

This proves challenge discovery/parsing only. It does **not** prove paid settlement.

### Multi-asset merchant support

Status: CURRENT GOLDEN MERCHANT IS SINGLE-ASSET

The current independent merchant exposes one Celo payment requirement.

Murk must not claim multi-asset merchant selection against this merchant unless the live response changes and the spike proves multiple accepted assets.

The deterministic selector remains useful policy infrastructure, but demo claims must match observed merchant reality.

### Rate provider

Status: PASSED FOR LOCKED MVP CURRENCY COVERAGE

CI fetches live reference FX data and verifies all eight locked accounting currencies:

- NGN;
- KES;
- BRL;
- MXN;
- COP;
- AED;
- SAR;
- INR.

The gate also proves that a stale/expired quote is rejected.

This proves provider coverage and freshness validation. The final paid E2E must still persist and display the exact quote used for the real purchase.

### Human authentication and embedded wallet

Status: PORTAL-ONLY CODED, LIVE VERIFICATION PENDING

Implemented:

- Portal `EMAIL_MAGIC_LINK` architecture;
- server-side Portal callback-token exchange;
- Client Session Token validation;
- signed HttpOnly Murk application session;
- Portal Web SDK provider through server `authUrl`;
- server-issued Portal Web OTP route;
- Portal MPC wallet create/reuse flow;
- Celo address registration;
- sign-in and first-run UI.

Still required:

- real Portal dashboard configuration;
- verified sending domain/template;
- Custodian credential configuration;
- live email-link round trip;
- real Portal wallet creation/reuse on Celo;
- backup/recovery verification;
- Eject verification.

## CORE

Status: IMPLEMENTED

Implemented:

- bigint money model;
- rational-rate conversion;
- deterministic settlement selector;
- deterministic policy engine;
- daily authority;
- per-purchase limit;
- reserve handling;
- reason codes;
- deterministic purchase decision object;
- unit tests.

No LLM financial authorization path exists.

## INTEGRATE

Status: IN PROGRESS

Implemented in code:

- Celo RPC client;
- ERC-20 token balance reads;
- x402 v2 challenge parsing;
- x402 v2 Exact EVM executor;
- exact Murk-approved payment selection guard;
- external reference FX provider;
- Portal auth/session/wallet integration;
- user-wallet funding UI;
- onchain funding verification;
- server agent withdrawal;
- Neon runtime repository;
- persisted audit evidence;
- ERC-8021 suffix helper for Murk-originated direct transactions.

Still not live-verified:

- real Portal funding transaction;
- real server-agent withdrawal transaction;
- successful paid external x402 execution;
- final x402 settlement transaction;
- delivered paid resource;
- final ERC-8021 qualifying transaction proof.

## END-TO-END

Status: NOT PASSED

Required real path:

`Portal email magic link -> Portal user wallet -> create agent -> fund isolated execution wallet -> independent external 402 -> Murk selector/rate/policy -> atomic spend reservation -> live x402 settlement -> paid resource -> persisted receipt/audit trail -> oversized second request blocked with no second transaction`

This complete path has not yet been demonstrated with real credentials and funded mainnet wallets.

## PERSIST

Status: IMPLEMENTED IN CODE, MIGRATION COMMITTED, LIVE NEON VERIFICATION PENDING

The runtime repository is Neon/Drizzle-backed.

The initial migration is committed under `drizzle/` and CI verifies migration-history consistency with `npm run db:check`.

Persisted runtime domains include:

- users;
- human wallets;
- agent wallets;
- agents;
- agent asset configuration;
- mandates;
- purchases;
- receipts;
- spend reservations;
- transactions;
- idempotency keys/results;
- payment requirements;
- payment requirement assets;
- rate quotes;
- policy decisions;
- resource evidence.

Financial concurrency hardening includes:

- atomic idempotency-key claims;
- atomic spend reservation before payment signing;
- commit/release lifecycle for spend reservations;
- mandate replacement in a database batch.

Still required:

- provision a dedicated Murk Neon database through the Vercel-managed Neon integration;
- configure `DATABASE_URL`;
- apply the committed migration with `npm run db:migrate`;
- run real application flows against that database;
- verify restart persistence in the deployed environment.

Direct project creation through the Neon API is unavailable for the connected organization because it is managed by Vercel. Existing unrelated Neon projects must not be repurposed without explicit owner approval.

## Agent Execution Wallet

Status: IMPLEMENTED, LIVE FUNDED VERIFICATION PENDING

Current model:

- one protected 32-byte `AGENT_WALLET_MASTER_SECRET`;
- deterministic HMAC-SHA256 derivation using immutable agent ID;
- one isolated viem EOA per agent ID;
- derived signing key never reaches browser or database;
- runtime address re-derivation is checked against persisted wallet identity.

The hackathon product currently limits each user to one user-created execution agent.

## Funding

Status: IMPLEMENTED, LIVE PORTAL/Celo VERIFICATION PENDING

Current flow:

`Portal human wallet -> ERC-20 transfer -> Celo confirmation -> Murk verifies exact Transfer(from,to,amount,token) -> transaction evidence persisted -> DRAFT agent may become ACTIVE`

Murk does not trust a browser-supplied transaction claim without chain verification.

## Withdrawal / Recovery

Status: IMPLEMENTED, LIVE Celo VERIFICATION PENDING

Current flow:

- destination is fixed to the authenticated user's persisted Portal wallet;
- arbitrary browser-supplied destinations are not accepted;
- server agent EOA signs the ERC-20 return transaction;
- Celo fee currency may use the selected stablecoin;
- transaction status is persisted;
- uncertain money movement is not blindly retried.

## ERC-8004

Status: IMPLEMENTED IN CODE, LIVE MAINNET VERIFICATION PENDING

Implemented:

- current Celo Identity Registry address;
- public agent metadata endpoint;
- human Portal wallet registration transaction preparation;
- onchain Registered-event verification;
- real agent ID persistence;
- EIP-712 consent signed by the derived execution EOA;
- human-owner setAgentWallet transaction preparation;
- ownerOf/getAgentWallet post-transaction verification;
- registration/binding transaction persistence;
- deterministic unit test that recovers the execution-wallet consent signer.

Ownership model remains:

- human Portal wallet owns the ERC-8004 identity NFT;
- separate Murk execution EOA is bound as the verified agent wallet.

Still required:

- deployed public metadata origin;
- live Portal-signed Celo registration;
- live binding transaction;
- explorer evidence.

## ERC-8021

Status: PARTIALLY INTEGRATED, LIVE PROGRAM PROOF PENDING

Implemented:

- current ERC-8021-compatible suffix generation via the published `ox/erc8021` primitive;
- configured code validation;
- suffix append helper;
- transaction verification helper;
- direct Murk-originated withdrawal path can append the configured attribution suffix without making recovery dependent on attribution.

Still required:

- obtain/configure the actual hackathon/program-assigned Murk attribution code;
- prove the assigned code on a qualifying live Murk-originated transaction.

Attribution boundary:

- Murk app-originated contract transactions such as ERC-8004 registration/binding can carry the ERC-8021 suffix;
- the hosted x402 facilitator submits the final EIP-3009 settlement transaction, so Murk does not control that settlement calldata and must not claim it is Murk-tagged.

The preferred live attribution proof is the meaningful human-owned ERC-8004 registration or wallet-binding transaction.

Do not claim completed hackathon attribution until live proof exists.

## HARDEN

Status: PARTIAL

Implemented/tested:

- malformed requirement rejection;
- unsupported chain rejection;
- invalid/stale-rate rejection paths;
- deterministic policy;
- atomic budget reservation;
- idempotency conflict handling;
- duplicate financial-mutation protection;
- no random transaction fallback;
- no automatic repayment after settlement;
- exact onchain funding evidence;
- fixed withdrawal destination;
- 320px overflow tests;
- browser navigation and interaction checks.

Still required after live E2E:

- failure injection around real Portal signing;
- RPC interruption/retry behavior;
- facilitator timeout behavior;
- resource-delivery failure after real settlement;
- deployed restart/persistence test;
- live low-balance/gas-currency withdrawal test.

## UI

Status: IMPLEMENTED AND BROWSER-QA PASSED FOR TEST STATES

Current product system:

- warm light-gray canvas;
- Manrope product typography;
- IBM Plex Mono technical identifiers;
- near-black text;
- blue primary action/accent;
- restrained green/red states;
- consistent Lucide interface icons;
- Murk brand mark;
- daily authority as the hero object;
- stablecoin details secondary;
- compact agent-wallet surface;
- collapsible add/return forms;
- compact decision ledger;
- first-run email sign-in;
- first-agent authority setup and live preview;
- mobile fixed dark-pill navigation;
- tablet/desktop in-flow dark-pill navigation.

Browser QA passes at 320, 390, 768, and 1280 widths without horizontal overflow in the covered states.

This does not prove live Portal or live financial integrations.

## POLISH

Status: PARTIAL

Visual hierarchy, typography, icons, responsive composition, and first-run UX have been refined.

Remaining polish must be driven by the real E2E flow and final demo recording, not invented states.

## DEMO LOCK

Status: NOT READY

Do not lock or record the final demo until all of these are real:

- Portal email sign-in;
- Portal user wallet;
- funded agent execution wallet;
- paid independent x402 settlement;
- delivered resource;
- persisted receipt/audit evidence;
- blocked second request with zero funds moved;
- ERC-8004 evidence if required for the chosen submission path;
- ERC-8021 qualifying attribution evidence.

The local merchant fixture and the UI sandbox are never valid external-merchant/demo evidence.
