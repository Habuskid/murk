# Security Specification

## Principle

Murk handles real money. Security boundaries are product behavior, not optional hardening.

## Human Wallet

- email-authenticated embedded EOA;
- application must not store plaintext private key;
- secure wallet export through provider-isolated mechanism;
- require fresh authentication before sensitive export flow;
- never log OTP or auth tokens.

## Agent Wallet

- separate execution wallet;
- holds only delegated funds;
- browser receives public address only;
- signing material stays server-side/provider-side;
- owner can pause agent;
- owner can withdraw unused funds.

## Policy

The agent/LLM cannot:

- increase mandate;
- change allowed assets;
- bypass reserve;
- approve blocked purchase;
- change accounting rate;
- move human-wallet funds directly;
- choose a payment path outside validated policy.

## Transaction Safety

Before money movement:

- purchase persisted;
- payment requirement validated;
- rate valid/fresh;
- policy approved;
- spend reserved;
- chain verified;
- balance refreshed when needed.

After submission:

- persist tx hash immediately;
- reconcile uncertain status;
- never blindly resubmit.

## Merchant Input

Validate:

- URL;
- network;
- asset;
- amount;
- payTo;
- payment scheme;
- expiration/terms where applicable.

If arbitrary user-provided URLs are supported, block localhost, private networks, cloud metadata addresses, and unsafe redirects.

## API Authorization

Every user-specific query must scope by authenticated owner.

A user must not retrieve or mutate another user's agents, mandates, wallets, purchases, receipts, or activity by guessing IDs.

## Secrets

Server only:

- database URL;
- RPC secret if any;
- CDP server credentials;
- rate API key;
- wallet signing secret/fallback key;
- attribution secret/code if sensitive.

Never use `NEXT_PUBLIC_` for secrets.
