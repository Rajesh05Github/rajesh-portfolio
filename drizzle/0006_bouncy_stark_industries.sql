CREATE TYPE "public"."chat_message_intent" AS ENUM('PORTFOLIO_QUESTION', 'GENERAL_QUESTION', 'ABUSE');--> statement-breakpoint
CREATE TYPE "public"."chat_message_role" AS ENUM('VISITOR', 'ASSISTANT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."chat_session_status" AS ENUM('ACTIVE', 'ENDED', 'RATE_LIMITED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."visitor_type" AS ENUM('RECRUITER', 'HR', 'DEVELOPER', 'CLIENT', 'POTENTIAL_CLIENT', 'COMPANY', 'STUDENT', 'OTHER');--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chat_message_role" NOT NULL,
	"content" text NOT NULL,
	"intent" "chat_message_intent",
	"retrieved_chunk_ids" jsonb,
	"request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid,
	"status" "chat_session_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"visitor_type" "visitor_type",
	"purpose" text,
	"consent_given_at" timestamp with time zone,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_session_id_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_visitor_id_visitor_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_session_id_idx" ON "chat_message" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_message_created_at_idx" ON "chat_message" USING btree ("created_at");