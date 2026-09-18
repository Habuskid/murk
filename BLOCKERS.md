# BLOCKERS

This file records unresolved blockers that affect the locked Murk golden path.

Coding agents must not hide, bypass, simulate, or silently replace these blockers.

## B1. Real paid x402 execution

Status: BLOCKING LIVE END-TO-END

CI verifies a real independent 402 challenge from:

`https://agent402.tools/api/answer?q=what%20is%20celo`

Already verified:

- real HTTP 402;
- Celo network requirement;
- payment-requirement parsing;
- current merchant discovery.

Murk now has a guarded Celo Sepolia settlement harness using the official x402 server packages. It can prove the buyer, policy, signing, facilitator settlement, onchain transfer, accounting, and delivery path once staging is funded. Because Murk hosts that endpoint, it is not independent merchant evidence.

Still required:

- deploy/fund a real Murk Sepolia execution wallet;
- execute the exact Murk-approved x402 payment against the Sepolia engineering harness;
- preserve that transaction as engineering evidence;
- execute the final independent-merchant payment proof (Sepolia if available, otherwise the smallest mainnet canary);
- obtain confirmed Celo settlement evidence;
- obtain the real paid resource;
- persist the resulting receipt/audit evidence;
- prove no duplicate payment occurs if resource delivery fails after settlement.

The local `/api/merchant/*` route is a development fixture only and is never valid external-merchant evidence.

## B2. Privy configuration and live browser proof

Status: BLOCKING HUMAN-WALLET E2E

Privy auth/wallet integration is implemented and passes install, tests, migration checks, and production build on the feature branch.

Still required outside the repository:

- create/configure the Murk Privy app;
- enable the intended email and wallet login methods;
- allow the deployed Murk origin;
- configure `NEXT_PUBLIC_PRIVY_APP_ID`;
- configure server-only `PRIVY_APP_SECRET`;
- perform a real login round trip;
- verify Privy embedded wallet create/reuse on Celo Sepolia;
- confirm the wallet address survives reload and is persisted in Neon;
- execute one real human-signed Celo Sepolia transaction.

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

## B5. Live Privy-wallet funding transaction

Status: IMPLEMENTED, LIVE VERIFICATION REQUIRED

Current code path:

`Privy human wallet -> ERC-20 transfer -> Celo receipt -> Murk exact Transfer verification -> persisted transaction -> agent activation`

Still required:

- real funded Privy wallet;
- real USDC/USDT transfer on Celo;
- successful exact `from/to/token/amount` verification;
- persisted transaction evidence;
- updated live agent balance.

A browser-supplied transaction hash without matching onchain evidence must continue to fail.

## B6. Live agent withdrawal / recovery transaction

Status: IMPLEMENTED, LIVE VERIFICATION REQUIRED

Current code restricts the destination to the authenticated user's persisted Privy wallet.

Still required:

- fund a real agent EOA;
- execute a small return transaction;
- verify Celo fee-currency behavior using the selected stablecoin;
- confirm the user Privy wallet receives the funds;
- confirm transaction persistence and explorer evidence;
- test insufficient fee-balance behavior.

Do not add arbitrary withdrawal destinations.

## B7. Live ERC-8004 registration and binding

Status: IMPLEMENTED IN CODE, SEPOLIA VERIFICATION REQUIRED NEXT

Implemented:

- registration against the current Celo Identity Registry;
- public metadata endpoint;
- Privy-wallet-owner registration transaction preparation;
- Registered-event verification and real agent ID persistence;
- execution-wallet EIP-712 consent;
- owner-submitted setAgentWallet transaction preparation;
- owner/wallet binding verification;
- transaction evidence persistence.

Still required:

- deploy Murk so the metadata URI is publicly resolvable;
- register on Celo Sepolia through the real Privy wallet;
- bind the real derived execution wallet;
- preserve Sepolia explorer evidence;
- repeat on mainnet before claiming mainnet completion.

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

Preferred live proof:

- use the same verified external merchant/resource as the successful purchase;
- lower the per-purchase authority below the resource's live accounting value;
- request the same real resource again;
- prove the request is blocked before signing.

Alternative proof:

- a separately verified external resource whose accounting value exceeds the per-purchase limit; or
- a later real request that exceeds remaining daily authority.

Required evidence:

- original external 402;
- accounting conversion/rate evidence;
- deterministic reason code;
- zero payment execution;
- no transaction hash;
- zero funds moved.

Do not use the UI sandbox or local self-merchant as final blocked-scenario evidence.

## B11. Hosted staging and final deployment environment

Status: NOT DEPLOYED

Murk has not yet been deployed to the public production/demo URL.

Before Sepolia deployment:

- create/link the dedicated Murk staging Vercel project;
- provision/verify an isolated staging Neon database through the Vercel-managed integration;
- configure the GitHub `staging` environment secrets;
- configure the deployed staging origin in Privy;
- configure the Celo x402 Sepolia API key and seller address;
- run the guarded staging workflow.

Before mainnet deployment:

- configure production environment variables;
- provision/verify the dedicated Murk Neon database and apply the committed migration;
- allow the deployed origin in Privy;
- set `PUBLIC_APP_ORIGIN` to the deployed HTTPS origin;
- run `npm run preflight:deploy`;
- ensure `UI_SANDBOX_MODE` is unset/false;
- verify `ENABLE_LOCAL_X402_FIXTURE=false`;
- verify no test secrets or CI placeholders are present.

Before final demo lock, run `npm run preflight:demo` as an additional gate.

Deployment is not considered ready merely because `next build` passes.
