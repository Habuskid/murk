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

Only expose an asset in production UI after the integration spike verifies the exact Celo address, decimals, balance reads, and x402 compatibility.

Unsupported assets must remain disabled rather than simulated.

## Blockchain

- Celo mainnet
- Chain ID: 42220
- viem for EVM reads, transaction construction, and RPC interaction
- ERC-8004 for agent identity where required by the hackathon path
- ERC-8021 attribution where required by current hackathon rules

## Authentication and Human Wallet

- Email-first onboarding
- Email OTP via Clerk
- Portal Web MPC wallet is the human embedded wallet provider
- Portal browser authentication uses a server-issued Web OTP so the Custodian API key never reaches the DOM
- Celo mainnet is configured as `eip155:42220`
- No external wallet requirement for ordinary users
- Human wallet must support Portal backup/recovery
- Human wallet portability must be verified through Portal Eject
- Ejected private-key material must never be sent to Murk's backend, logs, analytics, or database

## Agent Wallet

- Separate execution wallet from the human Portal wallet
- MVP execution wallet is a dedicated server-side viem EOA
- Its private key is a protected server-only secret
- Agent private key must never reach the browser
- Agent can only spend assets physically delegated to its execution wallet
- Until per-agent key custody exists, the MVP must not pretend to provision multiple independent execution wallets

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

## Rate Model

- Store the exact rate used for every purchase
- Rate must include source and timestamp
- Distinguish executable onchain rate from reference FX rate
- Mento may be used where a valid Celo route exists
- External FX provider may be used for accounting reference rates
- Stale or unavailable rate blocks autonomous spending
- Never ask an LLM to estimate FX

## x402

- Use a real external x402-protected resource in the golden path
- Do not fake a merchant
- Persist the original 402 response before payment
- Verify whether real multi-asset `accepts[]` exists before claiming intelligent multi-asset selection in the demo
- If a merchant offers only one asset, show only that reality

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
- white rounded surfaces
- near-black typography
- clean blue accent
- restrained green success
- restrained red blocked/error
- dark floating navigation pill
- mobile-first
- responsive to iOS Safari, Android Chrome, tablet, laptop, desktop
- mandate is the hero financial object
- stablecoins are secondary execution details

Explicitly prohibited:

- dark mode during this hackathon MVP
- physical bank card visual
- purple/pink gradient
- glow
- glassmorphism-heavy design
- neon crypto aesthetic
- crypto casino styling
- robot imagery
- 3D coins
- generic admin dashboard
- conventional desktop sidebar

## Motion

Motion must communicate state, not decorate.

- smooth bottom sheets
- active floating-nav capsule movement
- balance number transitions
- mandate progress transitions
- payment state progression
- receipt surface transition
- reduced-motion support
- low-end Android performance

No confetti, bouncing cards, parallax, floating decorative objects, or long cinematic transitions.
