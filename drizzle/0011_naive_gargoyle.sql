CREATE TYPE "public"."contact_message_status" AS ENUM('NEW', 'READ', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "contact_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"status" "contact_message_status" DEFAULT 'NEW' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "contact_message_created_at_idx" ON "contact_message" USING btree ("created_at");