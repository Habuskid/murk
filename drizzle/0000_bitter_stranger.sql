CREATE TABLE "agent_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"asset_symbol" text NOT NULL,
	"asset_address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"minimum_reserve_raw" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"purchase_id" text,
	"event_type" text NOT NULL,
	"event_data_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"accounting_currency" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"wallet_id" text,
	"erc8004_agent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"resource_id" text NOT NULL,
	"request_hash" text NOT NULL,
	"result_reference" text NOT NULL,
	"result_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "mandates" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"version" integer NOT NULL,
	"daily_limit_minor" bigint NOT NULL,
	"per_purchase_limit_minor" bigint NOT NULL,
	"approval_threshold_minor" bigint,
	"accounting_currency" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_requirement_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"payment_requirement_id" text NOT NULL,
	"asset_symbol" text NOT NULL,
	"asset_address" text NOT NULL,
	"amount_raw" bigint NOT NULL,
	"network" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"protocol_version" integer NOT NULL,
	"network" text NOT NULL,
	"pay_to" text NOT NULL,
	"raw_payload_json" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"decision" text NOT NULL,
	"reason_codes_json" jsonb NOT NULL,
	"daily_limit_minor" bigint NOT NULL,
	"per_purchase_limit_minor" bigint NOT NULL,
	"spent_before_minor" bigint NOT NULL,
	"reserved_before_minor" bigint NOT NULL,
	"purchase_value_minor" bigint NOT NULL,
	"remaining_before_minor" bigint NOT NULL,
	"remaining_after_minor" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"mandate_id" text NOT NULL,
	"merchant_url" text NOT NULL,
	"resource_url" text NOT NULL,
	"state" text NOT NULL,
	"selected_asset" text,
	"settlement_amount_raw" bigint,
	"accounting_currency" text NOT NULL,
	"accounting_amount_minor" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"base_asset" text NOT NULL,
	"quote_currency" text NOT NULL,
	"rate_numerator" bigint NOT NULL,
	"rate_denominator" bigint NOT NULL,
	"rate_kind" text NOT NULL,
	"provider" text NOT NULL,
	"provider_reference" text,
	"quoted_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"raw_response_hash" text
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"receipt_version" integer DEFAULT 1 NOT NULL,
	"receipt_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_purchase_id_unique" UNIQUE("purchase_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"http_status" integer NOT NULL,
	"content_type" text NOT NULL,
	"resource_identifier" text,
	"content_hash" text,
	"safe_preview" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_purchase_id_unique" UNIQUE("purchase_id")
);
--> statement-breakpoint
CREATE TABLE "spend_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"agent_id" text NOT NULL,
	"mandate_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"status" text DEFAULT 'RESERVED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	CONSTRAINT "spend_reservations_purchase_id_unique" UNIQUE("purchase_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text,
	"wallet_id" text NOT NULL,
	"purpose" text NOT NULL,
	"chain_id" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"asset_address" text,
	"amount_raw" bigint,
	"from_address" text NOT NULL,
	"to_address" text,
	"status" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"block_number" bigint,
	"error_code" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_user_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_provider_user_id_unique" UNIQUE("provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"agent_id" text,
	"type" text NOT NULL,
	"address" text NOT NULL,
	"provider" text NOT NULL,
	"chain_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_assets" ADD CONSTRAINT "agent_assets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mandates" ADD CONSTRAINT "mandates_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requirement_assets" ADD CONSTRAINT "payment_requirement_assets_payment_requirement_id_payment_requirements_id_fk" FOREIGN KEY ("payment_requirement_id") REFERENCES "public"."payment_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requirements" ADD CONSTRAINT "payment_requirements_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_mandate_id_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."mandates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_quotes" ADD CONSTRAINT "rate_quotes_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_reservations" ADD CONSTRAINT "spend_reservations_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_reservations" ADD CONSTRAINT "spend_reservations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_reservations" ADD CONSTRAINT "spend_reservations_mandate_id_mandates_id_fk" FOREIGN KEY ("mandate_id") REFERENCES "public"."mandates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tx_hash_chain_idx" ON "transactions" USING btree ("chain_id","tx_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_address_chain_idx" ON "wallets" USING btree ("address","chain_id");