# Murk Testnet to Mainnet Runbook

This is the required promotion path for Murk.

The rule is simple:

```text
same code
-> Celo Sepolia
-> live end-to-end evidence
-> exact tested commit
-> Celo mainnet
-> smallest mainnet canary
-> demo lock
```

Do not maintain separate testnet and mainnet implementations. Network differences must come only from configuration.

## Network Matrix

| Setting | Celo Sepolia staging | Celo mainnet production |
| --- | --- | --- |
| Chain ID | `11142220` | `42220` |
| CAIP-2 | `eip155:11142220` | `eip155:42220` |
| RPC | `https://forno.celo-sepolia.celo-testnet.org` | `https://forno.celo.org` |
| USDC | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| ERC-8004 IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| x402 facilitator | `https://api.x402.sepolia.celo.org` | `https://api.x402.celo.org` |
| Gas for Murk-owned direct transactions | Sepolia USDC/USDT fee adapters are configured and checked by the read-only smoke; live fee payment still must be verified | configured stablecoin fee adapters |

Alfajores is not the Murk staging target. Use Celo Sepolia.

## Current Code Gate

The release-candidate commit on `main` must pass all of these before deployment:

```bash
npm ci
npm test
npm run db:check
npm run build
```

CI must also verify:

- Sepolia chain configuration resolves to `11142220`;
- Sepolia USDC and USDT resolve to deployed 6-decimal token contracts;
- the configured Sepolia USDC/USDT fee-currency adapters have bytecode;
- the Sepolia ERC-8004 IdentityRegistry has bytecode;
- the Sepolia x402 facilitator advertises `eip155:11142220`;
- the live accounting FX smoke still passes.

Do not deploy a red commit.

## Staging Infrastructure

Use isolated staging state.

Required GitHub environment: `staging`.

Required secrets:

```text
STAGING_DATABASE_URL
STAGING_MURK_SESSION_SECRET
STAGING_AGENT_WALLET_MASTER_SECRET
STAGING_PUBLIC_APP_ORIGIN
# Optional, only for independent external merchant evidence:
STAGING_X402_RESOURCE_URL
STAGING_X402_PROBE_RESOURCE_URL

# Required for the real Sepolia settlement harness:
STAGING_X402_API_KEY
STAGING_X402_SELLER_ADDRESS

PORTAL_AUTH_ENVIRONMENT_ID
PORTAL_AUTH_FROM_EMAIL
PORTAL_AUTH_TEMPLATE_ID
PORTAL_CUSTODIAN_API_KEY
CELO_ATTRIBUTION_CODE

VERCEL_TOKEN
VERCEL_ORG_ID
STAGING_VERCEL_PROJECT_ID
```

The staging database must not be the production database. Prefer a dedicated Neon branch or dedicated Neon project.

Use a dedicated Vercel project for Sepolia, for example `murk-staging`. `STAGING_VERCEL_PROJECT_ID` must refer to that project. The staging workflow deploys it as that project's production deployment so `STAGING_PUBLIC_APP_ORIGIN` can be a stable HTTPS origin. Do not point this secret at the future Murk mainnet Vercel project.

The staging agent-wallet master secret must not equal the production secret.

## Deploy Sepolia

The staging workflow is intentionally manual and always checks out `main`. The old `staging/celo-sepolia` branch is not a release source.

Run `Celo Sepolia Staging Deploy` from GitHub Actions and enter:

```text
DEPLOY_MURK_SEPOLIA
```

The workflow must pass tests, migration checks, staging preflight, build, migration and health verification before the deployment is accepted.

After deployment, `GET /api/health` must report:

```text
components.celoRpc.network = Celo Sepolia
components.celoRpc.chainId = 11142220
components.celoRpc.status = healthy
components.rateProvider.status = healthy
```

## Test Wallet Funding

Use test funds only.

Portal human wallet needs:

- Celo Sepolia USDC for funding the Murk agent;
- a small amount of Sepolia CELO for direct registration, binding and ERC-20 funding gas when no verified testnet fee adapter is configured.

The derived Murk agent wallet needs:

- Celo Sepolia USDC for x402 purchases;
- a small amount of Sepolia CELO only for direct Murk-owned testnet transactions such as withdrawal.

Do not use production USDC while validating Sepolia.

## Sepolia End-to-End Sequence

Run the test in this order.

### 1. Authentication and Portal wallet

- sign in by real email magic link;
- create or reuse the Portal MPC wallet;
- confirm the address survives reload;
- confirm Murk persists the wallet with chain ID `11142220`.

### 2. Create agent

Create one test agent.

Verify:

- one isolated derived EOA exists;
- the persisted wallet uses chain ID `11142220`;
- allowed assets match the staging network;
- no private key reaches the browser or database.

### 3. Fund agent

Fund the agent with a small amount of Sepolia USDC.

Verify:

- the transaction confirms on Sepolia;
- Murk verifies the exact token, sender, receiver and amount;
- the funding row is persisted with chain ID `11142220`;
- the agent balance updates.

### 4. ERC-8004

Use the Portal human wallet as identity owner.

Verify:

- registration uses the Sepolia IdentityRegistry;
- the returned agent ID exists on Celo Sepolia;
- the owner is the Portal wallet;
- the derived Murk EOA signs the wallet-binding consent;
- the registry reports the derived EOA as the bound agent wallet;
- registration and binding transaction evidence persist.

### 5. Real Sepolia x402 settlement harness

The deployed staging app exposes `/api/testnet/x402-resource` only when:

```text
ENABLE_TESTNET_X402_MERCHANT=true
X402_API_KEY=<Celo facilitator API key>
TESTNET_X402_SELLER_ADDRESS=<Sepolia address you control>
```

This endpoint uses the official x402 server packages and the Celo Sepolia facilitator. It is allowed as an engineering settlement harness because it verifies an actual signed payment and actual onchain settlement. It is **not** independent merchant evidence because Murk hosts both sides.

Run one minimum-price paid request through Murk against this endpoint and verify:

- genuine HTTP 402 is received;
- the requirement advertises `eip155:11142220`;
- the asset is configured Sepolia USDC;
- FX resolves;
- deterministic policy approves;
- Neon reserves spend before signing;
- exactly one authorization is produced;
- facilitator settlement confirms;
- the exact USDC transfer is verified onchain;
- spend is committed;
- the protected resource is delivered;
- audit evidence and receipt persist.

### 6. Independent merchant evidence

If a public independent Celo Sepolia x402 merchant is available, repeat the approved purchase against it.

If none exists, do not relabel Murk's own harness as external evidence. Preserve the real Sepolia harness transaction as engineering proof, then reserve the independent-merchant payment proof for the smallest possible Celo mainnet canary.

An independent resource must advertise:

```text
network = eip155:11142220
asset = Sepolia USDC
scheme = exact
```

### 7. Blocked purchase

Tighten the per-purchase policy below the same resource value and request it again.

Required result:

```text
decision = BLOCKED
tx hash = null
signing calls = 0
funds moved = 0
reservation count = 0
```

### 8. Withdrawal

Return a small amount of test USDC from the agent to the Portal wallet.

Verify the exact transfer and persisted transaction.

### 9. Restart persistence

Redeploy or restart and confirm the same user, wallet, agent, mandate, purchase, receipt and spend state remain available.

### 10. Evidence verifier

Populate the staging evidence values and run:

```bash
npm run e2e:verify
```

The verifier must pass against `CELO_CHAIN_ID=11142220`.

## x402 Sepolia Compatibility Gate

The Celo Sepolia facilitator currently advertises x402 v2 support for `eip155:11142220`, and Murk CI checks that advertisement.

There has also been a public report that the facilitator's `/verify` endpoint rejected the advertised v2 form. Therefore `/supported` alone is not sufficient evidence.

The actual paid Sepolia harness request is the settlement gate. Independent merchant evidence is a separate requirement and must not be fabricated.

If the real Sepolia payment returns `unsupported_scheme` while the same requirements are advertised by `/supported`:

1. do not weaken Murk's payment validation;
2. do not silently downgrade the production x402 implementation;
3. preserve the response as external-infrastructure evidence;
4. finish all non-x402 Sepolia gates;
5. only then use the smallest possible mainnet x402 canary to verify the production facilitator.

## Promote the Tested Commit

Only promote after Sepolia evidence is green, or after a documented external Sepolia x402 facilitator blocker with every other Sepolia gate green.

Promotion means changing environment configuration, not transaction logic.

The production workflow requires:

```text
confirmation = DEPLOY_MURK_MAINNET
tested_commit = <full 40-character SHA that passed the Sepolia live E2E gate>
```

The tested SHA must already be part of `main` history. The workflow checks out that exact commit and refuses a different commit.

Production must use:

```text
NEXT_PUBLIC_MURK_NETWORK=mainnet
CELO_CHAIN_ID=42220
NEXT_PUBLIC_CELO_CHAIN_ID=42220
CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
X402_FACILITATOR_URL=https://api.x402.celo.org
```

Use the production database, production app origin and production secrets.

Do not copy Sepolia transaction IDs, ERC-8004 agent IDs or test balances into production state.

## Mainnet Canary

Before the demo, run one deliberately small real mainnet path.

Required order:

```text
Portal login
-> mainnet wallet verification
-> agent creation
-> minimal funding
-> ERC-8004 registration and binding
-> one approved external x402 purchase
-> one blocked request
-> evidence verification
-> restart persistence
```

Keep the first delegated amount at or below the existing mainnet safety cap unless the live merchant price requires a deliberate recalculation.

Then run:

```bash
npm run preflight:demo
```

Only after that passes is Murk ready for demo lock.
