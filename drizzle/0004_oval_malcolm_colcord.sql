CREATE TYPE "public"."knowledge_index_status" AS ENUM('PENDING', 'INDEXING', 'INDEXED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_type" AS ENUM('PROFILE', 'ABOUT', 'EXPERIENCE', 'EDUCATION', 'SKILL', 'PROJECT', 'CERTIFICATION', 'ACHIEVEMENT', 'RESUME', 'FAQ', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."knowledge_visibility" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "knowledge_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"token_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" "knowledge_source_type" NOT NULL,
	"source_entity_id" uuid,
	"include_in_rag" boolean DEFAULT true NOT NULL,
	"additional_context" text,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"visibility" "knowledge_visibility" DEFAULT 'PUBLISHED' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"index_status" "knowledge_index_status" DEFAULT 'PENDING' NOT NULL,
	"last_indexed_at" timestamp with time zone,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"index_error" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_chunk" ADD CONSTRAINT "knowledge_chunk_document_id_knowledge_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "knowledge_chunk_document_id_idx" ON "knowledge_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "knowledge_document_source_idx" ON "knowledge_document" USING btree ("source_type","source_entity_id");