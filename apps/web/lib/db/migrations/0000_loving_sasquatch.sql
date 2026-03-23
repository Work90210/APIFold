CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"auth_type" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spec_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"transport" text DEFAULT 'sse' NOT NULL,
	"auth_mode" text NOT NULL,
	"base_url" text NOT NULL,
	"rate_limit" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"input_schema" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"tool_id" uuid,
	"user_id" text NOT NULL,
	"request_id" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status_code" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"source_url" text,
	"raw_spec" jsonb NOT NULL,
	"tool_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"tool_id" uuid,
	"user_id" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_ms" integer NOT NULL,
	"status_code" integer NOT NULL,
	"error_code" text
);
--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tools" ADD CONSTRAINT "mcp_tools_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_tool_id_mcp_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."mcp_tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tool_id_mcp_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."mcp_tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_credentials_server_id" ON "credentials" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_credentials_user_id" ON "credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_credentials_server_user" ON "credentials" USING btree ("server_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_servers_user_id" ON "mcp_servers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_servers_spec_id" ON "mcp_servers" USING btree ("spec_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_servers_user_slug" ON "mcp_servers" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "idx_tools_server_id" ON "mcp_tools" USING btree ("server_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tools_server_name" ON "mcp_tools" USING btree ("server_id","name");--> statement-breakpoint
CREATE INDEX "idx_logs_server_id" ON "request_logs" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_logs_user_id" ON "request_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_logs_timestamp" ON "request_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_logs_request_id" ON "request_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_logs_tool_id" ON "request_logs" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "idx_logs_server_timestamp" ON "request_logs" USING btree ("server_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_specs_user_id" ON "specs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_specs_user_name" ON "specs" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "idx_usage_server_id" ON "usage_events" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "idx_usage_user_id" ON "usage_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_usage_timestamp" ON "usage_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_usage_tool_id" ON "usage_events" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "idx_usage_server_timestamp" ON "usage_events" USING btree ("server_id","timestamp");