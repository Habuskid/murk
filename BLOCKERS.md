# BLOCKERS

This file records unresolved blockers that affect the locked Murk golden path.

Coding agents must not hide, bypass, simulate, or silently replace these blockers.

## B1. Real paid external Celo x402 execution

Status: BLOCKING END-TO-END

CI verifies a real independent 402 challenge from:

`https://agent402.tools/api/answer?q=what%20is%20celo`

Already verified:

- real HTTP 402;
- Celo network requirement;
- payment-requirement parsing;
- current merchant discovery.

Still required:

- fund a real Murk execution wallet;
- execute the exact Murk-approved x402 payment;
- obtain confirmed Celo settlement evidence;
- obtain the real paid resource;
- persist the resulting receipt/audit evidence;
- prove no duplicate payment occurs if resource delivery fails after settlement.

The local `/api/merchant/*` route is a development fixture only and is never valid external-merchant evidence.

## B2. Portal production configuration and live browser proof

Status: BLOCKING HUMAN-WALLET E2E

Portal-only auth/wallet code is implemented.

Still required outside the repository:

- enable Authentication for the Portal environment;
- enable `EMAIL_MAGIC_LINK`;
- verify the sending domain;
- create the email template containing `{{{MAGIC_LINK}}}`;
- allowlist local/deployed `/auth/callback`;
- configure `PORTAL_AUTH_ENVIRONMENT_ID`;
- configure `PORTAL_AUTH_FROM_EMAIL`;
- configure `PORTAL_AUTH_TEMPLATE_ID`;
- configure server-only `PORTAL_CUSTODIAN_API_KEY`;
- configure `MURK_SESSION_SECRET`;
- perform a real email-link round trip;
- verify Portal MPC wallet create/reuse on Celo;
- verify backup/recovery;
- verify Portal Eject before claiming wallet portability.

Do not introduce another identity/wallet provider to avoid this configuration.

## B4. Real Neon database provisioning and schema verification

Status: BLOCKING DEPLOYED PERSISTENCE PROOF

Runtime persistence is implemented through Neon/Drizzle in code.

Already completed:

- committed initial Drizzle migration;
- reproducible `npm ci`;
- CI migration-history validation.

Still required:

- provision a dedicated Murk database through the Vercel-managed Neon integration;
- configure `DATABASE_URL`;
- apply the committed migration with `npm run db:migrate`;
- create a user/agent/mandate through the real app;
- restart/redeploy the app;
- verify state survives restart;
- verify atomic spend reservation against the real database.

Direct Neon project creation is restricted for the connected Vercel-managed organization. Do not repurpose an unrelated existing database without explicit owner approval.

Do not describe deployed persistence as proven until this is completed.

## B5. Live Portal funding transaction

Status: IMPLEMENTED, LIVE VERIFICATION REQUIRED

Current code path:

`Portal human wallet -> ERC-20 transfer -> Celo receipt -> Murk exact Transfer verification -> persisted transaction -> agent activation`

Still required:

- real funded Portal wallet;
- real USDC/USDT transfer on Celo;
- successful exact `from/to/token/amount` verification;
- persisted transaction evidence;
- updated live agent balance.

A browser-supplied transaction hash without matching onchain evidence must continue to fail.

## B6. Live agent withdrawal / recovery transaction

Status: IMPLEMENTED, LIVE VERIFICATION REQUIRED

Current code restricts the destination to the authenticated user's persisted Portal wallet.

Still required:

- fund a real agent EOA;
- execute a small return transaction;
- verify Celo fee-currency behavior using the selected stablecoin;
- confirm the user Portal wallet receives the funds;
- confirm transaction persistence and explorer evidence;
- test insufficient fee-balance behavior.

Do not add arbitrary withdrawal destinations.

## B7. Live ERC-8004 registration and binding

Status: IMPLEMENTED IN CODE, LIVE VERIFICATION REQUIRED

Implemented:

- registration against the current Celo Identity Registry;
- public metadata endpoint;
- Portal-owner registration transaction preparation;
- Registered-event verification and real agent ID persistence;
- execution-wallet EIP-712 consent;
- owner-submitted setAgentWallet transaction preparation;
- owner/wallet binding verification;
- transaction evidence persistence.

Still required:

- deploy Murk so the metadata URI is publicly resolvable;
- register on Celo mainnet through the real Portal wallet;
- bind the real derived execution wallet;
- preserve explorer evidence.

Do not seed or display a placeholder agent ID as verified.

## B8. Final ERC-8021 hackathon attribution proof

Status: PARTIALLY INTEGRATED, LIVE PROOF REQUIRED

Implemented:

- ERC-8021-compatible suffix generation via `ox/erc8021`;
- configured code validation;
- direct transaction suffix append helper;
- verification helper;
- withdrawal path can append/verify the configured code without making recovery depend on attribution.

Still required:

- obtain the actual program-assigned Murk attribution code;
- configure `CELO_ATTRIBUTION_CODE`;
- prove the assigned code on a qualifying live Murk-originated transaction.

The hosted x402 facilitator submits the final EIP-3009 settlement transaction, so Murk cannot honestly append its suffix to that facilitator-owned calldata. The preferred qualifying proof is the Murk-generated ERC-8004 registration or binding transaction.

Do not use a hostname-derived code as a substitute for a program-assigned hackathon code.

## B9. Current golden merchant is single-asset

Status: VERIFIED LIMITATION

The independent merchant currently exposes one Celo payment requirement.

Therefore:

- do not claim the golden merchant offers multiple accepted stablecoins;
- do not fabricate a second accepted asset;
- do not present deterministic multi-asset selection as live merchant proof.

If a different independent merchant with multiple verified Celo requirements is found, rerun the spike before changing the demo claim.

## B10. Golden blocked scenario still needs live proof

Status: BLOCKING DEMO LOCK

Murk has deterministic block logic and browser/UI proof, but the final demo must show a real external request that is rejected before signing.

Acceptable live proof:

- a real merchant request whose accounting value exceeds the per-purchase limit; or
- a second real request that exceeds the remaining daily authority after the first successful purchase.

Required evidence:

- original external 402;
- accounting conversion/rate evidence;
- deterministic reason code;
- zero payment execution;
- no transaction hash;
- zero funds moved.

Do not use the UI sandbox or local self-merchant as final blocked-scenario evidence.

## B11. Final deployment environment

Status: NOT DEPLOYED

Murk has not yet been deployed to the public production/demo URL.

Before deployment:

- configure production environment variables;
- provision/verify the dedicated Murk Neon database and apply the committed migration;
- configure Portal callback allowlist for the deployed origin;
- set `PUBLIC_APP_ORIGIN` to the deployed HTTPS origin;
- run `npm run preflight:deploy`;
- ensure `UI_SANDBOX_MODE` is unset/false;
- verify `ENABLE_LOCAL_X402_FIXTURE=false`;
- verify no test secrets or CI placeholders are present.

Before final demo lock, run `npm run preflight:demo` as an additional gate.

Deployment is not considered ready merely because `next build` passes.
