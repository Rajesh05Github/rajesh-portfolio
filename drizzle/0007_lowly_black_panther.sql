CREATE TYPE "public"."usage_operation" AS ENUM('INTENT_CLASSIFICATION', 'RETRIEVAL_RERANK', 'GENERATION', 'EMBEDDING');--> statement-breakpoint
CREATE TABLE "usage_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"session_id" uuid,
	"operation" "usage_operation" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"estimated_cost_usd" numeric(12, 8) NOT NULL,
	"latency_ms" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_session_id_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_record_created_at_idx" ON "usage_record" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "usage_record_session_id_idx" ON "usage_record" USING btree ("session_id");