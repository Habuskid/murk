# Engineering 0: SPIKE

## Goal

Prove the risky dependencies before building the product around them.

No polished UI is required.

## Spike A: Email to Embedded Wallet to Celo

Prove:

```text
email
OTP
embedded EVM address
sign Celo transaction
broadcast through Celo RPC
confirmed Celo mainnet receipt
```

Pass condition: the user can sign in using email only and a real transaction from the embedded EOA can be confirmed on Celo.

If CDP Embedded Wallet fails this proof, record the failure in `BLOCKERS.md`. Do not silently replace it.

## Spike B: Server Agent Wallet on Celo

Prove:

```text
server-controlled EOA
read Celo balance
sign transaction
broadcast
confirm
```

Primary candidate: CDP Server Wallet EOA.

Pre-approved fallback only if the primary path fails: secure server-side viem EOA.

## Spike C: Real x402 Purchase

Prove:

```text
independent external merchant
real HTTP 402
real payment requirement
real Celo-compatible payment
real transaction
original request retried
real paid resource returned
```

No mock merchant.

## Spike D: Multi-Asset Reality Check

Verify whether the selected real merchant/facilitator exposes multiple accepted assets.

Questions:

- Does the 402 response provide multiple accepted payment options?
- Are those assets actually supported on Celo?
- Can Murk choose a non-first option?
- Can the chosen asset settle successfully?

If not, do not claim multi-asset selection in the demo. Preserve the broader mandate product and use the actual supported path.

## Spike E: Rate Provider

Prove at least:

```text
USDT or verified settlement asset -> NGN
USDT or verified settlement asset -> AED
USDT or verified settlement asset -> BRL
```

Each normalized quote must contain:

- base asset;
- quote currency;
- rational/integer rate representation;
- provider;
- rate kind;
- timestamp;
- expiry/freshness.

## Spike Exit Gate

Do not move to CORE until the team knows exactly which wallet path, x402 path, settlement assets, and rate path are real.

Record every successful proof in `IMPLEMENTATION_STATUS.md`.
