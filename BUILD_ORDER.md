# Build Order and Gates

Antigravity must follow this sequence.

## 0. SPIKE

Deliver evidence for:

- email OTP embedded wallet;
- user EOA Celo transaction;
- agent EOA Celo transaction;
- real external x402 flow;
- actual supported settlement assets;
- accounting rate provider.

Gate: risky assumptions proven.

## 1. CORE

Implement pure deterministic financial logic plus automated tests.

Gate: same inputs produce same decision and all boundary tests pass.

## 2. INTEGRATE

Connect real providers and Celo.

Gate: real approved purchase succeeds and real blocked purchase causes zero transaction.

## 3. END-TO-END

Connect actual user action through the entire workflow.

Gate: one complete golden path runs without developer intervention.

## 4. PERSIST

Persist all evidence and recovery state.

Gate: refresh/restart/re-login do not change historical truth.

## 5. HARDEN

Attack failures and race conditions.

Gate: failure cases fail closed, without unauthorized or duplicate spending.

## 6. UI

Build the approved responsive wallet UI around real functionality.

Gate: a new user can complete the golden path without Web3 knowledge.

## 7. POLISH

Implement the approved motion, loading, copy, accessibility, performance, and device QA.

Gate: product feels complete without weakening correctness.

## 8. DEMO LOCK

Freeze architecture and features.

Only reliability, proof, demo, README, pitch, and submission work remains.

## Forbidden Reordering

Do not:

- build polished landing pages before the spike;
- use mocked x402 to unblock UI;
- postpone persistence until after demo recording;
- add new features during polish;
- redesign architecture at demo lock.
