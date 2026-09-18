# Data Model

Use Neon Postgres with Drizzle ORM.

## users

```text
id
provider_user_id UNIQUE
email
created_at
updated_at
```

## wallets

```text
id
user_id nullable
agent_id nullable
type USER | AGENT
address
provider
chain_id
created_at
UNIQUE(address, chain_id)
```

Never store plaintext private keys.

## agents

```text
id
owner_user_id
name
status DRAFT | ACTIVE | PAUSED | DISABLED
accounting_currency
timezone
wallet_id
erc8004_agent_id nullable
created_at
updated_at
```

## mandates

```text
id
agent_id
version
daily_limit_minor BIGINT
per_purchase_limit_minor BIGINT
approval_threshold_minor nullable
accounting_currency
status
effective_from
superseded_at nullable
created_at
```

Changing policy creates a new version.

## agent_assets

```text
id
agent_id
asset_symbol
asset_address
chain_id
enabled
minimum_reserve_raw
created_at
updated_at
```

## purchases

```text
id
agent_id
mandate_id
merchant_url
resource_url
state
selected_asset nullable
settlement_amount_raw nullable
accounting_currency
accounting_amount_minor nullable
created_at
updated_at
completed_at nullable
```

## payment_requirements

```text
id
purchase_id
protocol_version
network
pay_to
raw_payload_json
received_at
```

## payment_requirement_assets

```text
id
payment_requirement_id
asset_symbol
asset_address
amount_raw
network
```

## rate_quotes

```text
id
purchase_id
base_asset
quote_currency
rate_numerator
rate_denominator
rate_kind
provider
provider_reference nullable
quoted_at
expires_at
raw_response_hash nullable
```

## policy_decisions

```text
id
purchase_id
decision APPROVED | BLOCKED
reason_codes_json
daily_limit_minor
per_purchase_limit_minor
spent_before_minor
reserved_before_minor
purchase_value_minor
remaining_before_minor
remaining_after_minor nullable
created_at
```

## spend_reservations

```text
id
purchase_id UNIQUE
agent_id
mandate_id
amount_minor
status RESERVED | COMMITTED | RELEASED
created_at
committed_at nullable
released_at nullable
```

## transactions

```text
id
purchase_id nullable
wallet_id
purpose
chain_id
tx_hash
asset_address nullable
amount_raw nullable
from_address
to_address nullable
status CREATED | SUBMITTED | CONFIRMED | REVERTED | FAILED
submitted_at
confirmed_at nullable
block_number nullable
error_code nullable
UNIQUE(chain_id, tx_hash)
```

## resources

```text
id
purchase_id UNIQUE
http_status
content_type
resource_identifier nullable
content_hash nullable
safe_preview nullable
received_at
```

## receipts

```text
id
purchase_id UNIQUE
receipt_version
receipt_json
created_at
```

## agent_events

```text
id
agent_id
purchase_id nullable
event_type
event_data_json
created_at
```

## idempotency_keys

```text
key
operation
resource_id
request_hash
result_reference
created_at
expires_at nullable
```

## Money Types

Do not use FLOAT, REAL, or DOUBLE PRECISION for money.
