# AGENTS.md

## Authority

This repository is governed by the Markdown specification files in this repository.

Antigravity and any other coding agent must treat these files as binding implementation requirements, not suggestions.

Precedence, highest first:

1. A new explicit instruction from the project owner in the current conversation/session.
2. `AGENTS.md`.
3. `LOCKED_DECISIONS.md`.
4. Stage and subsystem specification files.
5. `README.md` or generated documentation.
6. Agent preference, framework convention, or personal suggestion.

If an agent suggestion conflicts with any higher-priority source, the suggestion must not be implemented.

## Project Name

The project name is `Murk`.

Do not rename the product, repository, package, UI copy, database namespace, or agent identity unless the owner explicitly instructs you to change it.

## Non-Negotiable Agent Rules

1. Do not change product scope without explicit owner approval.
2. Do not add features because they seem useful.
3. Do not replace selected providers, frameworks, protocols, or architecture unless a pre-approved fallback is documented and the primary option has failed its spike.
4. Do not redesign the approved UI system.
5. Do not add gradients, glow, glassmorphism, neon crypto styling, robot illustrations, 3D coins, or generic SaaS dashboards.
6. Do not add a physical debit or credit card visual.
7. Do not introduce a conventional desktop sidebar. Use the approved wallet workspace and floating navigation.
8. Do not expose secrets, wallet private keys, provider secrets, database credentials, or signing material to the browser.
9. Do not fabricate balances, users, transactions, x402 responses, FX rates, Celo transactions, resources, ERC registrations, or metrics.
10. Do not mock critical sponsor integrations in any demo or production path.
11. Dev fixtures are allowed only in automated tests and must be clearly isolated from the real runtime.
12. Do not let an LLM determine financial policy, arithmetic, settlement eligibility, budget enforcement, or authorization.
13. Do not use JavaScript floating-point arithmetic for money.
14. Do not automatically retry an uncertain money-moving action.
15. Do not mark a transaction successful before confirmed settlement evidence exists.
16. Do not implement UI polish before the real golden path passes E2E.
17. Do not switch to a different blockchain. Celo mainnet is mandatory for the hackathon path.
18. Do not require MetaMask, Rabby, Coinbase Wallet, WalletConnect, or another external wallet for normal onboarding.
19. Do not remove secure user wallet export/recovery.
20. Do not use em dashes, emojis, hype copy, or generic AI marketing language in product copy or documentation.

## Required Build Order

Follow this order exactly:

```text
SPIKE
CORE
INTEGRATE
END-TO-END
PERSIST
HARDEN
UI
POLISH
DEMO LOCK
```

A later phase may not be treated as complete while an earlier phase gate is failing.

## Allowed Engineering Judgment

Antigravity may make small implementation choices that are not specified only if all are true:

- the choice does not change product behavior;
- the choice does not add user-facing scope;
- the choice does not change a provider or protocol;
- the choice does not weaken security or evidence;
- the choice follows the existing stack;
- the choice is reversible and local.

If a decision would change architecture, product behavior, UX, provider, security boundary, financial behavior, or demo proof, do not implement it without owner approval.

## Failure Handling

When a locked integration fails:

1. Prove the failure with a minimal reproducible test.
2. Record it in `BLOCKERS.md`.
3. Use a fallback only if `LOCKED_DECISIONS.md` or the relevant stage file explicitly pre-approves that fallback.
4. Never silently substitute a new provider.
5. Never fabricate success.

## Evidence Rule

Every major hackathon claim must have reproducible evidence.

For money-moving functionality, preserve:

- purchase ID;
- original 402 requirement;
- selected settlement asset;
- rate source and timestamp;
- policy decision and reason codes;
- transaction hash when money moved;
- resource-delivery evidence;
- blocked proof when money did not move.
