# Engineering 3: END-TO-END

## Goal

Connect one complete real user journey from email login to paid resource and updated mandate.

## Canonical Journey

```text
Email
OTP
Embedded wallet
Create Research Agent
Choose NGN
Set daily mandate
Set per-purchase limit
Fund agent
Activate agent
Request paid resource
Receive 402
Select asset
Resolve FX
Policy decision
Reserve spend
Celo payment
Resource delivery
Receipt
Mandate update
Blocked second purchase
```

## Routes

Suggested:

```text
/
/app
/app/agents
/app/agents/new
/app/agents/:id
/app/activity
/app/activity/:purchaseId
/app/settings
```

## Agent Creation

New agent starts as `DRAFT`.

Creation does not authorize spending.

Activation requires explicit user funding/confirmation.

## Purchase API

Create purchase ID before any payment attempt.

Browser observes persisted states. Browser must not own the workflow after it begins.

## Frontend State Mapping

```text
CREATED -> Preparing
PAYMENT_REQUIRED -> Paid service detected
ASSET_SELECTED -> Payment asset selected
RATE_RESOLVED -> Accounting value calculated
POLICY_APPROVED -> Approved
POLICY_BLOCKED -> Blocked
SPEND_RESERVED -> Preparing payment
PAYMENT_SUBMITTED -> Paying
PAYMENT_SETTLED -> Payment confirmed
RESOURCE_RECEIVED -> Resource received
COMPLETED -> Complete
PAYMENT_FAILED -> Payment failed
RESOURCE_FAILED -> Payment completed, resource unavailable
```

## Refresh and Close

Refreshing or closing the browser must not restart payment.

The server workflow continues after the purchase is accepted.

## E2E Exit Gate

The following must run without developer intervention:

```text
real email -> real OTP -> real wallet -> real agent -> real mandate -> real funds -> real x402 -> real policy -> real Celo tx -> real resource -> real receipt
```

and a real oversized request must be blocked with zero transaction.
