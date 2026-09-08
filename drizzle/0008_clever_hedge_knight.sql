CREATE TYPE "public"."abuse_event_kind" AS ENUM('RATE_LIMIT', 'TOKEN_LIMIT', 'PROMPT_INJECTION', 'OVERSIZED_INPUT', 'OTHER');--> statement-breakpoint
CREATE TABLE "abuse_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"ip_hash" text,
	"kind" "abuse_event_kind" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abuse_event" ADD CONSTRAINT "abuse_event_session_id_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abuse_event_created_at_idx" ON "abuse_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "abuse_event_kind_idx" ON "abuse_event" USING btree ("kind");