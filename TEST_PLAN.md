# Test Plan

## Unit Tests

### Money

- decimals;
- minor units;
- rational conversion;
- deterministic rounding;
- no float usage.

### Rate Validation

- valid;
- expired;
- wrong pair;
- zero/negative;
- unsupported.

### Settlement Selector

- accepted and funded;
- accepted but insufficient;
- disallowed;
- reserve violation;
- no valid candidate;
- deterministic preference.

### Policy

- approved;
- daily exceeded;
- per-purchase exceeded;
- paused;
- invalid amount;
- exact boundary;
- one minor unit above.

## Concurrency

With remaining authority lower than the sum of two simultaneous requests, at most one reservation may succeed.

## Integration Tests

- email OTP creates/retrieves embedded user relationship;
- user EOA signs Celo transaction;
- agent wallet signs Celo transaction;
- real rate provider normalizes NGN/AED/BRL and then all eight currencies;
- real external 402 is parsed;
- real approved x402 purchase settles;
- blocked purchase produces no signing/broadcast;
- duplicate request produces one economic payment;
- resource failure after payment produces no second payment.

## E2E Tests

- first-time login;
- create agent;
- fund agent;
- activate agent;
- approved purchase;
- receipt survives refresh;
- oversized purchase blocked;
- pause blocks new purchase;
- browser refresh during pending payment;
- browser close and return;
- withdraw unused funds.

## Responsive QA

At minimum:

```text
320x568
360x800
375x812
390x844
393x873
412x915
768x1024
1024x768
1280x800
1440x900
```

Browsers:

- iOS Safari;
- Android Chrome;
- Chrome desktop;
- Edge desktop;
- Safari desktop when available.

## Security Tests

- cross-user resource access denied;
- secrets absent from client bundle;
- arbitrary URL restrictions/SSRF defense when enabled;
- duplicate money action idempotency;
- stale rate blocks;
- wrong chain blocks;
- malformed 402 blocks;
- private-key export does not pass through app JS/server.
