# Locked Decisions

These decisions are frozen unless the owner explicitly changes them.

## Identity

- Product name: `Murk`
- Product category: spending authority layer for autonomous agents
- Primary interaction: responsive web application
- Agent execution: server-side
- Primary user types: individuals and small teams/businesses

## Product Thesis

Humans define financial authority in the accounting currency they understand. Autonomous agents operate inside that authority and may settle machine purchases using permitted stablecoins.

The accounting currency and settlement asset are intentionally separate.

## MVP Accounting Currencies

Exactly these eight initially:

- NGN
- KES
- BRL
- MXN
- COP
- AED
- SAR
- INR

Do not expand the MVP currency list without approval.

## Settlement Assets

Candidate MVP assets:

- USDC
- USDT
- USAT

The current product UI exposes only assets that have verified Celo token metadata and runtime support.

Do not expose an asset merely because it exists on Celo. x402 compatibility with the actual merchant/facilitator path must be observed before it is claimed in the demo.

Unsupported assets remain disabled rather than simulated.

## Blockchain

- Celo mainnet
- Chain ID: 42220
- viem for EVM reads, transaction construction, RPC interaction, and server agent signing
- ERC-8004 for agent identity where required by the hackathon path
- ERC-8021 attribution using the current Celo-compatible implementation and the assigned program code when available

## Authentication and Human Wallet

- Privy is the human authentication and embedded-wallet provider for the MVP
- Support email login and wallet login through Privy
- Every authenticated user receives/reuses a Privy embedded EVM wallet
- Protected browser requests carry the Privy access token
- Murk verifies Privy access tokens server-side before resolving ownership
- `NEXT_PUBLIC_PRIVY_APP_ID` is public configuration
- `PRIVY_APP_SECRET` is server-only and must never reach the DOM
- Celo Sepolia and Celo mainnet are configured as explicit EVM chains
- Human-signed Privy transactions use native CELO for gas; Murk does not assume Privy forwards Celo's CIP-64 `feeCurrency` extension
- The human wallet and autonomous execution wallet remain separate
- Do not introduce another auth/wallet provider during the hackathon without owner approval

## Agent Wallet

- Human Privy wallet and autonomous execution wallet remain separate
- Every Murk agent receives a deterministic isolated EOA derived server-side from:
  - one protected 32-byte `AGENT_WALLET_MASTER_SECRET`;
  - the immutable Murk agent ID;
  - a versioned derivation domain
- The derivation uses HMAC-SHA256 as a keyed PRF
- Different agent IDs must resolve to different EOA signing keys and addresses
- The master secret and derived private keys are server-only
- Derived private keys are not persisted in Neon
- Agent signing material must never reach the browser
- The agent can only spend assets physically delegated to its execution wallet
- The current hackathon product still enforces one user-created execution agent per user, even though the wallet derivation supports isolated per-agent addresses
- Do not replace this custody model during the hackathon without owner approval

## Funding and Recovery

- Funding starts from the authenticated human Privy wallet
- The browser may initiate a Privy wallet transfer to the agent wallet
- Murk must independently verify the exact confirmed Celo ERC-20 `Transfer` before treating funds as delegated
- A browser claim alone is never sufficient funding evidence
- Agent recovery/withdrawal may only return funds to the authenticated user's bound Privy wallet
- The browser must not choose an arbitrary withdrawal destination
- Emergency withdrawal must not become impossible merely because ERC-8021 attribution is unconfigured
- No automatic retry of uncertain money-moving transactions

## Financial Policy

- Deterministic policy engine
- LLM cannot approve payments or bypass rules
- Daily mandate in user's accounting currency
- Per-purchase limit in user's accounting currency
- Allowed settlement asset list
- Optional reserve rules
- Agent pause control
- No automatic swap in MVP
- Prefer a valid accepted asset already held by the agent
- A database spend reservation must succeed before x402 signing
- Concurrent requests must not overspend the remaining daily authority

## Rate Model

- Store the exact rate used for every purchase
- Rate must include source and timestamp
- Distinguish executable onchain rate from reference FX rate
- Mento may be used where a valid Celo route exists
- External FX provider may be used for accounting reference rates
- Stale or unavailable rate blocks autonomous spending
- Never ask an LLM to estimate FX

## x402

- Use a real independent x402-protected resource in the golden path
- Do not fake a merchant
- Persist the original 402 response before payment
- Verify whether real multi-asset `accepts[]` exists before claiming intelligent multi-asset selection in the demo
- If a merchant offers only one asset, show only that reality
- The x402 client may settle only the exact requirement already approved by Murk policy
- Resource-delivery failure after a settled payment must not trigger a second automatic payment

## Persistence

- Neon Postgres is the runtime source of truth
- Drizzle ORM is the database layer
- Users, wallets, agents, assets, mandates, purchases, receipts, spend reservations, transaction evidence, rate evidence, policy evidence, and idempotency records belong in Neon
- Runtime financial state must not depend on process memory
- Idempotency claims for money-moving actions must be atomic
- Spend reservation must be atomic before signing

## Database and Hosting

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Neon Postgres
- Drizzle ORM
- Vercel deployment
- Zod validation

Do not add Redis, a queueing platform, microservices, Docker production infrastructure, or a second backend framework unless a proven blocker requires it and the owner approves.

## UI

Approved design direction:

- premium consumer finance wallet
- warm light-gray canvas
- white financial surfaces
- near-black typography
- Manrope for product UI
- IBM Plex Mono for hashes and technical identifiers
- clean blue accent
- restrained green success
- restrained red blocked/error
- dark pill primary navigation
- navigation fixed near the bottom on mobile
- navigation remains in normal document flow on tablet/desktop so it does not cover content
- mobile-first
- responsive from 320px mobile through tablet, laptop, and desktop
- mandate is the hero financial object
- stablecoins are secondary execution details
- one consistent Lucide interface-icon family, with Murk and token brand marks handled separately
- fund/return transaction forms remain collapsed until the user chooses the action

Explicitly prohibited:

- dark mode during this hackathon MVP
- physical bank card visual
- purple/pink gradient
- glow
- glassmorphism-heavy design
- neon crypto aesthetic
- crypto casino styling
- robot illustrations
- 3D coins
- generic admin dashboard
- conventional desktop sidebar
- arbitrary decorative badges and excessive nested cards

## UI Test Sandbox

- `/ui-sandbox` and its child routes are test-only
- They may use deterministic fixture state only for browser QA
- They must remain unavailable unless `UI_SANDBOX_MODE=true`
- Production must not enable `UI_SANDBOX_MODE`
- Sandbox screenshots and fixtures are not hackathon transaction evidence
- Playwright checks must cover 320px mobile, standard mobile, tablet, and desktop
- Browser QA must fail on horizontal overflow

## Motion

Motion must communicate state, not decorate.

- restrained state transitions
- balance and authority number transitions where useful
- mandate progress transitions
- payment state progression
- receipt/evidence reveal
- reduced-motion support
- low-end Android performance

No confetti, bouncing cards, parallax, floating decorative objects, or long cinematic transitions.
