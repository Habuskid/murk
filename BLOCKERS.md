# BLOCKERS

This file records unresolved blockers that affect the locked Murk golden path.

Coding agents must not hide, bypass, simulate, or silently replace these blockers.

## B1. Independent external Celo x402 resource

Status: BLOCKING LIVE SPIKE AND GOLDEN DEMO

Murk requires an independent external x402-protected resource on Celo mainnet.

Required evidence:

- real HTTP 402 response;
- payment requirements parse successfully;
- eip155:42220;
- real accepted asset contract(s);
- real payTo address;
- real amount;
- successful paid retry;
- real settlement response with transaction hash;
- real resource returned.

Configuration:

`X402_PROBE_RESOURCE_URL`
`NEXT_PUBLIC_X402_RESOURCE_URL`

The local `/api/merchant/*` route is a development fixture only. It is not valid hackathon evidence.

## B2. Live x402 v2 execution has not been runtime-verified

Status: IMPLEMENTED IN CODE, NOT VERIFIED

The repo now uses the current x402 v2 package family and includes a policy-bound executor in:

`src/services/x402-payment.ts`

The executor:

- registers Exact EVM on eip155:42220;
- uses the server agent EOA;
- disables the SDK's generic spend-control layer because Murk policy already authorizes the exact payment;
- constrains x402 selection to the exact token, amount, payTo, network, and scheme Murk approved;
- extracts settlement evidence from the x402 payment response;
- fails if settlement evidence is missing.

This is not considered passed until `npm install`, `npm run build`, and a real live purchase succeed.

## B3. Package lock is stale after x402 v2 migration

Status: BLOCKING CLEAN INSTALL WITH npm ci

`package.json` has been migrated from the legacy `x402` package to:

- `@x402/core`
- `@x402/evm`
- `@x402/fetch`

The current `package-lock.json` has not yet been regenerated.

Required action in the development environment:

```bash
npm install
```

Then commit the regenerated `package-lock.json`.

Do not revert to the legacy x402 package to avoid this step.

## B4. Email OTP embedded user wallet

Status: NOT INTEGRATED

The current runtime still uses a seeded demo user and does not implement the locked email OTP onboarding.

Required:

- verified email OTP;
- embedded EVM EOA;
- same authenticated identity resolves to the same application user;
- user wallet address persisted;
- Celo signing verified;
- secure provider-isolated wallet export/recovery.

Do not claim this is working until live verified.

## B5. User-wallet funding and withdrawal

Status: FAIL-CLOSED, NOT INTEGRATED

The endpoints now return HTTP 501 and `fundsMoved: false`.

This is intentional.

They must remain fail-closed until the authenticated embedded user wallet signs real Celo transactions.

## B6. Neon runtime persistence

Status: SCHEMA EXISTS, RUNTIME NOT WIRED

`src/db/schema.ts` and `src/db/index.ts` exist.

The active application repository is still an in-memory singleton in `src/db/repository.ts`.

Until replaced:

- state does not survive production restart;
- owner identity is demo-seeded;
- spend reservations are not database-atomic;
- implementation does not satisfy PERSIST.

Do not describe Neon as active runtime persistence until this is fixed.

## B7. Real ERC-8004 registration

Status: NOT INTEGRATED

The seeded demo record contains a placeholder-like agent ID.

The UI no longer presents it as verified.

Required before claim:

- real Celo registration;
- agent ID;
- registration transaction;
- explorer evidence.

## B8. Correct ERC-8021 attribution

Status: NOT INTEGRATED

The old helper that hashes a local string is not sufficient evidence of the current Celo hackathon attribution requirement.

Required:

- register Murk for the current Celo builder attribution flow;
- obtain the assigned builder tag;
- integrate the current official attribution-tag mechanism;
- prove it on an actual qualifying transaction.

Do not claim ERC-8021 attribution until onchain verified.

## B9. Multi-asset x402 selection

Status: UNKNOWN UNTIL LIVE MERCHANT PROBE

Murk supports deterministic selection logic, but the golden demo may only claim multi-asset selection if the configured independent merchant actually exposes more than one supported Celo asset.

`spike-d-multi-asset.ts` now observes merchant reality rather than hard-coding an answer.

If the live merchant exposes one asset, do not fabricate another.
