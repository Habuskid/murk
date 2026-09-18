# Murk Live E2E Runbook

This runbook is the approved sequence for the first real Murk mainnet proof. Complete `TESTNET_TO_MAINNET.md` first and promote the exact tested commit.

Do not improvise around a failed gate. Stop, preserve evidence, fix the failing layer, then resume from the last confirmed state.

## Objective

Prove this exact chain with real infrastructure:

```text
Portal email sign-in
-> Portal MPC human wallet
-> persisted Murk user
-> isolated derived agent EOA
-> human funds agent
-> Murk verifies the exact funding transfer
-> external x402 returns a real 402
-> Murk resolves FX
-> deterministic policy approves
-> atomic Neon spend reservation succeeds
-> agent signs exactly one x402 payment
-> Celo settlement confirms
-> paid resource is delivered
-> audit evidence persists
-> a later real request is blocked before signing
-> no second payment occurs
```

## Safety Boundary

For the first live proof:

- use only Celo mainnet;
- use only the dedicated Portal wallet created for Murk;
- use only the derived Murk agent EOA;
- do not use a personal treasury wallet as the agent wallet;
- do not enable arbitrary withdrawal destinations;
- do not retry a payment whose settlement outcome is uncertain;
- do not use the local x402 fixture as demo evidence;
- do not claim multi-asset merchant selection against the current golden merchant.

### First-Test Funding Cap

Immediately before funding, rerun the external 402 probe.

The most recently observed golden merchant requirement is:

- resource: `https://agent402.tools/api/answer?q=what%20is%20celo`
- network: `eip155:42220`
- asset: Celo USDC
- amount: `80000` raw units
- observed human amount: `0.08 USDC`

This amount is live external state and may change.

For the first real execution, do not delegate more than **0.25 USDC** to the agent unless the live 402 probe changes and the amount is deliberately recalculated.

## Gate 0: Repository Baseline

Required before external configuration:

```bash
npm ci
npm test
npm run db:check
npm run build
npm run spike:c
npm run spike:d
npm run spike:e
```

Required result:

- tests pass;
- migration history passes;
- production build passes;
- external Celo 402 is observed;
- current merchant asset reality is recorded;
- all eight locked accounting currencies return valid fresh quotes.

Stop if any gate fails.

## Gate 1: Production Secrets

Configure real values only.

Required:

```text
PORTAL_AUTH_ENVIRONMENT_ID
PORTAL_AUTH_FROM_EMAIL
PORTAL_AUTH_TEMPLATE_ID
PORTAL_CUSTODIAN_API_KEY
MURK_SESSION_SECRET
AGENT_WALLET_MASTER_SECRET
DATABASE_URL
PUBLIC_APP_ORIGIN
CELO_RPC_URL
NEXT_PUBLIC_CELO_RPC_URL
CELO_CHAIN_ID=42220
EXCHANGE_RATE_API_URL
NEXT_PUBLIC_X402_RESOURCE_URL
X402_PROBE_RESOURCE_URL
```

For demo lock also require:

```text
CELO_ATTRIBUTION_CODE
PORTAL_USER_WALLET_VERIFIED_ADDRESS
PORTAL_USER_WALLET_EVIDENCE_REFERENCE
PORTAL_USER_WALLET_BACKUP_VERIFIED=true
PORTAL_USER_WALLET_EJECT_VERIFIED=true
```

Generate secrets locally.

```bash
openssl rand -hex 32
```

Use different random values for the Murk session secret and agent wallet master secret.

Never use:

- CI placeholders;
- UI sandbox values;
- repeated-character private material;
- repository examples.

Run:

```bash
npm run preflight:deploy
```

Do not deploy unless it passes.

## Gate 2: Neon

1. Provision the dedicated Murk Neon database.
2. Set `DATABASE_URL`.
3. Apply the committed migration:

```bash
npm run db:migrate
```

4. Confirm migration success.
5. Do not seed fake users, wallets, agents, purchases, receipts, or transaction evidence.

## Gate 3: Portal Authentication

Portal environment must have:

- Authentication enabled;
- `EMAIL_MAGIC_LINK` enabled;
- verified sending domain;
- email template containing `{{{MAGIC_LINK}}}`;
- deployed `/auth/callback` allowlisted.

Perform one real sign-in.

Required evidence:

- email actually received;
- magic link works once;
- callback returns to Murk;
- signed Murk HttpOnly session is established;
- tampered/expired session is rejected;
- no Portal Custodian key appears in browser source, storage, logs, or network payloads sent by Murk.

## Gate 4: Portal MPC Wallet

After login:

1. Portal client is created or reused.
2. MPC wallet is created or reused.
3. Celo address appears in Murk.
4. Address persists against the authenticated Murk user.

Required evidence:

- wallet address;
- Celo mainnet identity;
- reload preserves the same address.

Before claiming portability:

- verify Portal backup/recovery;
- verify Portal Eject;
- never send ejected key material to Murk backend or logs.

## Gate 5: Agent Creation

Create the Research Agent with the golden policy:

```text
Accounting currency: NGN
Daily authority: NGN 5,000
Per-purchase limit: NGN 2,000
Allowed settlement asset: only actually supported merchant asset(s)
```

Required evidence:

- one persisted agent;
- derived EOA address;
- same immutable agent ID resolves to the same EOA after restart;
- different agent ID derivation test remains isolated;
- no derived private key stored in Neon or browser.

## Gate 6: Funding

Before moving funds:

1. rerun `npm run spike:c`;
2. record current x402 amount, asset, payTo and network;
3. verify the amount is still acceptable;
4. keep first agent delegation at or below the safety cap unless deliberately revised.

Funding sequence:

```text
Portal human wallet
-> Celo ERC-20 transfer
-> agent execution EOA
-> Celo confirmation
-> Murk verifies exact token/from/to/amount
-> transaction persisted
-> agent activated
```

Do not treat a browser-supplied tx hash as sufficient.

Required evidence:

- Celo tx hash;
- exact Transfer log;
- persisted transaction row;
- updated agent balance.

## Gate 7: Golden x402 Purchase

Use the configured independent resource only.

Expected sequence:

1. external resource returns genuine 402;
2. Murk persists the requirement;
3. Murk selects only a real accepted allowed asset;
4. fresh USD -> NGN reference rate resolves;
5. accounting value is computed with integer math;
6. deterministic policy approves;
7. Neon spend reservation succeeds;
8. only then may signing occur;
9. exactly one payment is created;
10. settlement confirms on Celo;
11. spend reservation is committed;
12. resource is delivered;
13. normalized audit evidence and receipt persist.

Evidence to preserve:

- original 402;
- payment requirement;
- selected settlement asset;
- raw settlement amount;
- NGN accounting value;
- FX source/timestamp;
- policy decision;
- reservation result;
- settlement tx hash;
- Celo explorer link;
- resource-delivery proof;
- receipt;
- remaining daily authority.

### Critical No-Retry Rule

If a transaction hash exists or settlement may already have occurred, do not blindly resubmit payment.

A resource-delivery failure after settlement must result in:

```text
RESOURCE_FAILED
payment count = 1
spend = committed
tx hash preserved
no automatic repayment
```

## Gate 8: Golden Blocked Request

The final demo must show a real external request blocked before signing.

Preferred proof:

- use the same already-verified external x402 resource;
- after the successful purchase, lower the per-purchase authority below that resource's current accounting value;
- request the same external resource again;
- Murk must receive the genuine 402 and block before any signing.

A separately verified higher-value external resource is optional, not required.

Required result:

```text
decision = BLOCKED
tx hash = null
signing calls = 0
funds moved = 0
remaining authority unchanged
deterministic reason code persisted
```

Do not use UI sandbox fixtures as final proof.

## Gate 9: ERC-8004

Ownership model:

```text
human Portal wallet
-> owns ERC-8004 identity NFT

derived Murk agent EOA
-> bound as verified agentWallet
```

Required live proof:

- public Murk metadata URL;
- Portal owner signs registration;
- real Celo agent ID;
- identity NFT owner is the Portal wallet;
- derived agent EOA signs wallet-binding consent;
- Portal owner submits binding transaction;
- registry reports the derived EOA as `agentWallet`;
- transaction evidence persists.

Never display a placeholder agent ID as verified.

## Gate 10: ERC-8021

Use only the assigned hackathon/program attribution code.

Do not substitute:

- hostname-derived code;
- guessed code;
- generic `murk` string unless that is actually the assigned program code.

Preferred qualifying proof:

- Murk-generated ERC-8004 registration or binding transaction carrying the ERC-8021 suffix.

Do not claim the hosted facilitator's x402 settlement transaction is Murk-attributed when Murk does not control that transaction calldata.

## Gate 11: Restart Persistence

After completing at least one real workflow:

1. record user, wallet, agent, mandate, purchase and receipt state;
2. restart/redeploy;
3. log back in;
4. verify the same persisted state is returned;
5. verify daily spent/reserved accounting remains correct;
6. verify no duplicate purchase is created by replaying the same idempotency key.

## Gate 12: Demo Preflight

Run:

```bash
npm run preflight:demo
```

Required:

- no sandbox mode;
- no local merchant fixture;
- real production origin;
- real Portal configuration;
- real Neon database;
- real agent wallet master secret;
- real external x402 resources;
- real assigned attribution code;
- wallet backup/eject evidence recorded.

Only after this passes may DEMO LOCK begin.

## Stop Conditions

Stop immediately if any of these occur:

- merchant challenge changes unexpectedly;
- wrong chain;
- wrong token;
- wrong payTo;
- amount materially changes;
- stale FX rate;
- Portal address changes unexpectedly;
- derived agent address does not match persisted address;
- spend reservation cannot be confirmed;
- payment outcome is uncertain;
- receipt reports a tx not found on Celo;
- resource delivery fails after payment and any code attempts to pay again;
- database state disappears after restart;
- attribution proof cannot be verified.

Do not work around a stop condition with mock data or manual database edits.

## Demo Evidence Pack

Before recording the final demo, preserve:

- deployed URL;
- public GitHub commit SHA;
- Portal login proof;
- Portal wallet address;
- agent wallet address;
- real funding tx;
- external 402 evidence;
- rate evidence;
- approved policy evidence;
- x402 settlement tx;
- delivered resource evidence;
- normalized receipt;
- blocked-request evidence with no tx;
- ERC-8004 agent ID and binding tx;
- ERC-8021 qualifying tx;
- restart/persistence proof.

That evidence pack is the source of truth for README claims, submission copy, demo narration and pitch.
