# Golden Demo

## Goal

Prove both sides of the thesis:

1. authorized autonomous spending works;
2. unauthorized spending is blocked before money moves.

## Demo Persona

Use one individual for the main demo.

```text
Agent: Research Agent
Accounting currency: NGN
Daily mandate: NGN 5,000
Per-purchase limit: NGN 2,000
Status: Active
```

The app may visibly support the other accounting currencies, but the main golden path uses one currency to stay focused.

## Initial Agent Funds

Use small real balances only.

The exact assets depend on verified x402 support.

If multi-asset x402 support is proven, arrange the wallet so the selector has a real decision to make, for example:

```text
USDC: insufficient
USDT: sufficient
USAT: sufficient but reserved
```

Never fabricate accepted assets.

## Success Path

```text
User signs in with email OTP
↓
Embedded wallet is ready
↓
User creates Research Agent
↓
User sets NGN 5,000 daily mandate
↓
User funds and activates agent
↓
Agent requests a real external paid resource
↓
Merchant returns real HTTP 402
↓
Murk persists the payment requirement
↓
Murk checks actual agent wallet balances
↓
Murk selects a valid permitted settlement asset
↓
Murk resolves a fresh accounting rate
↓
Murk converts purchase into NGN
↓
Deterministic policy approves
↓
Spend is reserved
↓
Agent executes real x402 payment on Celo
↓
Settlement is confirmed
↓
Original resource request is retried
↓
Resource is delivered
↓
Spend reservation is committed
↓
Receipt is persisted
↓
Remaining mandate updates
```

## Receipt Must Show

- agent name;
- service/merchant;
- settlement asset;
- settlement amount;
- accounting currency;
- accounting value at decision time;
- rate source;
- rate timestamp;
- policy result;
- reason codes translated into readable language;
- Celo network;
- transaction hash;
- resource delivery status;
- remaining mandate.

## Blocked Path

Immediately attempt a purchase that exceeds remaining daily authority or the per-purchase limit.

Expected:

```text
Decision: BLOCKED
Funds moved: 0
Wallet signing calls: 0
Transaction hash: none
```

Persist the blocked attempt as first-class activity.

## Demo Timing

Target 3 minutes:

```text
0:00-0:20 Problem
0:20-0:35 Product
0:35-1:35 Successful golden path
1:35-2:00 Receipt and remaining mandate
2:00-2:25 Blocked purchase
2:25-2:45 Architecture
2:45-3:00 Close
```

## Demo Rule

The demo must prove the thesis, not tour every screen.
