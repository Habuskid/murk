# BLOCKERS

This file records unresolved blockers that affect the locked Murk golden path.

Coding agents must not hide, bypass, simulate, or silently replace these blockers.

## B1. Independent external Celo x402 resource

Status: LIVE 402 CHALLENGE VERIFIED, PAID EXECUTION STILL REQUIRED

CI now verifies an independent external x402 resource:

`https://agent402.tools/api/answer?q=what%20is%20celo`

Verified:

- real HTTP 402 response;
- payment requirements parse successfully;
- `eip155:42220`;
- one live Celo payment requirement.

Still required before golden-demo lock:

- fund the real Murk execution wallet;
- successful paid retry;
- real settlement response with transaction hash;
- real resource returned.

The live merchant currently exposes one Celo requirement, so Murk must not claim multi-asset selection against this specific merchant unless that changes and Spike D proves it.

The local `/api/merchant/*` route remains a development fixture only. It is not valid hackathon evidence.

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

## B3. Package lock is stale after dependency migrations

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

## B4. Portal-managed authentication + embedded user wallet

Status: CODED, LIVE PORTAL CONFIGURATION / VERIFICATION REQUIRED

Murk no longer uses Coinbase CDP or Clerk.

Current architecture:

- Portal `EMAIL_MAGIC_LINK` authenticates the human user;
- Portal creates/reuses the user's Portal client during sign-in;
- Murk exchanges the single-use callback token server-side;
- Murk validates the returned Client Session Token against Portal's `/clients/me` endpoint;
- Murk stores only a signed HttpOnly application session containing the Portal end-user/client identity;
- Portal Web SDK authenticates through Murk's server `authUrl` using one-time Web OTPs;
- Portal Web MPC wallet is created/reused in the browser;
- Celo address is registered back to Murk;
- Portal backup/recovery and Eject must be verified before claiming portability.

Required configuration:

- `PORTAL_AUTH_ENVIRONMENT_ID`
- `PORTAL_AUTH_FROM_EMAIL`
- `PORTAL_AUTH_TEMPLATE_ID`
- `PORTAL_CUSTODIAN_API_KEY`
- `MURK_SESSION_SECRET`

Portal dashboard configuration additionally requires:

- Authentication enabled for the environment;
- `EMAIL_MAGIC_LINK` enabled;
- a verified sending domain;
- a Portal email template containing `{{{MAGIC_LINK}}}`;
- the deployed/local callback URL allowlisted as `/auth/callback`.

Live browser verification is still required.

## B5. User-wallet funding and withdrawal

Status: FAIL-CLOSED, NOT INTEGRATED

The endpoints now return HTTP 501 and `fundsMoved: false`.

This is intentional.

They must remain fail-closed until the authenticated Portal wallet signs real Celo transactions.

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
