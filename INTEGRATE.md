# Engineering 2: INTEGRATE

## Goal

Replace CORE test adapters with real infrastructure without changing CORE financial logic.

## Integration Order

1. Celo public client
2. CDP email authentication
3. Embedded user EOA
4. Server agent EOA
5. Verified token registry and balances
6. Rate providers
7. x402 402 parser
8. x402 payment execution
9. ERC-8004 identity
10. ERC-8021 attribution
11. Neon persistence adapter
12. full integration test

## Celo Client

Use a centralized viem public client for Celo mainnet.

Validate chain ID before money movement.

## Authentication

CDP email OTP is the primary path.

Do not build custom passwords, OTP storage, password reset, or email-verification infrastructure.

## User Wallet

Use embedded EOA signing for human-authorized actions.

The application may broadcast through a configured Celo RPC where required.

## Agent Wallet Adapter

Expose only capabilities such as:

```ts
getAddress()
getBalances()
signTypedData()
signTransaction()
```

CORE does not know the provider implementation.

## Token Registry

Every enabled settlement asset requires:

- verified Celo contract address;
- decimals;
- bytecode/contract existence;
- balance read;
- confirmed compatibility with chosen x402 flow.

No asset is enabled because of symbol alone.

## Rates

Create adapters behind one RateProvider interface.

Where a real executable Celo route exists, an onchain quote may be marked `EXECUTABLE_ONCHAIN`.

Where only accounting/reference FX is available, mark it `REFERENCE_FX`.

Never describe a reference FX rate as an executable conversion rate.

## x402

For a real external resource:

1. send normal request;
2. detect HTTP 402;
3. persist the raw/sanitized requirement;
4. normalize accepted payment options;
5. validate chain, amount, asset, payTo, and scheme;
6. pass verified facts into CORE;
7. execute only after APPROVED plus spend reservation;
8. confirm settlement;
9. retry the original resource request.

## ERC-8004

Persist the real agent ID, wallet relationship, registration transaction hash, network, and timestamp.

## ERC-8021

Centralize attribution logic at the transaction construction boundary. Do not scatter builder attribution manually throughout the code.

Before final submission, re-check the current official attribution format.

## Integration Exit Gate

Prove with real systems:

```text
real email
real embedded wallet
real agent wallet
real Celo balances
real 402
real rate
real CORE decision
real Celo settlement
real external resource
```

Then separately prove an oversized purchase causes zero wallet signing and zero transaction.
