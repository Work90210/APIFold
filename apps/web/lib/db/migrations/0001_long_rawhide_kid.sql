CREATE TABLE "access_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"tool_ids" uuid[] DEFAULT '{}' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"request_snapshot" jsonb NOT NULL,
	"response_snapshot" jsonb,
	"outcome" text NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"provider_event_id" text NOT NULL,
	"provider_message_id" text,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"to_email" text NOT NULL,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"template_version" text DEFAULT 'v1' NOT NULL,
	"payload" jsonb NOT NULL,
	"headers" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"send_after" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"provider_message_id" text,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"weekly_usage_summary" boolean DEFAULT true NOT NULL,
	"monthly_usage_summary" boolean DEFAULT false NOT NULL,
	"renewal_reminder" boolean DEFAULT true NOT NULL,
	"usage_limit_warning" boolean DEFAULT true NOT NULL,
	"budget_cap_warning" boolean DEFAULT true NOT NULL,
	"overage_alert" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"provider_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_threshold_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"threshold_type" text NOT NULL,
	"threshold_key" text NOT NULL,
	"billing_period" text NOT NULL,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"previous_status" text NOT NULL,
	"new_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_installs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"server_id" uuid NOT NULL,
	"spec_id" uuid NOT NULL,
	"installed_version_hash" text NOT NULL,
	"is_update_available" boolean DEFAULT false NOT NULL,
	"listing_suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_description" text NOT NULL,
	"long_description" text NOT NULL,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"icon_url" text,
	"author_id" text NOT NULL,
	"author_type" text DEFAULT 'community' NOT NULL,
	"raw_spec" jsonb NOT NULL,
	"spec_version" text NOT NULL,
	"recommended_base_url" text NOT NULL,
	"recommended_auth_mode" text NOT NULL,
	"default_tool_filter" jsonb,
	"setup_guide" text,
	"api_docs_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_notes" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"install_count" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"spec_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"reporter_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"version" text NOT NULL,
	"spec_hash" text NOT NULL,
	"raw_spec" text NOT NULL,
	"changelog" text,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"version_id" uuid NOT NULL,
	"endpoint_url" text,
	"promoted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promoted_by" text NOT NULL,
	CONSTRAINT "spec_releases_server_id_environment_unique" UNIQUE("server_id","environment")
);
--> statement-breakpoint
CREATE TABLE "spec_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spec_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"version_label" text,
	"raw_spec" jsonb NOT NULL,
	"tool_snapshot" jsonb NOT NULL,
	"tool_count" integer NOT NULL,
	"diff_summary" jsonb,
	"is_breaking" boolean DEFAULT false,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spec_versions_spec_id_version_number_unique" UNIQUE("spec_id","version_number")
);
--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "encrypted_refresh_token" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "scopes" text[] DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "token_endpoint" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "encrypted_client_secret" text;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credentials" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "endpoint_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "domain_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "domain_verification_token" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "token_hash" text;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "request_body" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "response_body" text;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "request_headers" jsonb;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "request_logs" ADD COLUMN "tool_name" text;--> statement-breakpoint
ALTER TABLE "specs" ADD COLUMN "current_version_id" uuid;--> statement-breakpoint
ALTER TABLE "access_profiles" ADD CONSTRAINT "access_profiles_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_attempts" ADD CONSTRAINT "email_attempts_outbox_id_email_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."email_outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_audit_log" ADD CONSTRAINT "marketplace_audit_log_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_installs" ADD CONSTRAINT "marketplace_installs_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_installs" ADD CONSTRAINT "marketplace_installs_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_installs" ADD CONSTRAINT "marketplace_installs_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_versions" ADD CONSTRAINT "marketplace_versions_listing_id_marketplace_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."marketplace_listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_releases" ADD CONSTRAINT "spec_releases_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_releases" ADD CONSTRAINT "spec_releases_version_id_spec_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."spec_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_versions" ADD CONSTRAINT "spec_versions_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_profiles_server_slug" ON "access_profiles" USING btree ("server_id","slug");--> statement-breakpoint
CREATE INDEX "idx_profiles_server_id" ON "access_profiles" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_user_id" ON "access_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_attempts_outbox_id" ON "email_attempts" USING btree ("outbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_events_provider_event" ON "email_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "idx_email_events_provider_message" ON "email_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_outbox_idempotency_key" ON "email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_status_send_after" ON "email_outbox" USING btree ("status","send_after","priority");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_provider_message_id" ON "email_outbox" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "idx_email_outbox_user_id" ON "email_outbox" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_suppressions_email" ON "email_suppressions" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_email_threshold_unique" ON "email_threshold_state" USING btree ("user_id","threshold_type","threshold_key","billing_period");--> statement-breakpoint
CREATE INDEX "idx_mal_listing" ON "marketplace_audit_log" USING btree ("listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mi_listing_user" ON "marketplace_installs" USING btree ("listing_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_mi_user" ON "marketplace_installs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_mi_server" ON "marketplace_installs" USING btree ("server_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ml_slug" ON "marketplace_listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_ml_status" ON "marketplace_listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ml_category" ON "marketplace_listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_ml_author" ON "marketplace_listings" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "idx_ml_featured" ON "marketplace_listings" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_mrp_listing" ON "marketplace_reports" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_mrp_status" ON "marketplace_reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mrp_user_listing" ON "marketplace_reports" USING btree ("reporter_id","listing_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mv_listing_version" ON "marketplace_versions" USING btree ("listing_id","version");--> statement-breakpoint
CREATE INDEX "idx_mv_listing" ON "marketplace_versions" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_spec_releases_server_id" ON "spec_releases" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_spec_releases_version_id" ON "spec_releases" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "idx_spec_versions_spec_id" ON "spec_versions" USING btree ("spec_id");--> statement-breakpoint
CREATE INDEX "idx_spec_versions_created_at" ON "spec_versions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_servers_endpoint_id" ON "mcp_servers" USING btree ("endpoint_id");