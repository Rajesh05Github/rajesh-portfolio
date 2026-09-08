CREATE TYPE "public"."evaluation_run_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
ALTER TYPE "public"."usage_operation" ADD VALUE 'EVALUATION_JUDGE';--> statement-breakpoint
CREATE TABLE "evaluation_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" uuid NOT NULL,
	"question" text NOT NULL,
	"expected_answer" text,
	"expected_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_dataset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"actual_answer" text NOT NULL,
	"retrieval_relevance" real NOT NULL,
	"context_recall" real NOT NULL,
	"answer_relevance" real NOT NULL,
	"faithfulness" real NOT NULL,
	"answer_correctness" real NOT NULL,
	"hallucinated" boolean NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset_id" uuid NOT NULL,
	"model" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"retrieval_config" jsonb NOT NULL,
	"status" "evaluation_run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluation_case" ADD CONSTRAINT "evaluation_case_dataset_id_evaluation_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."evaluation_dataset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_result" ADD CONSTRAINT "evaluation_result_run_id_evaluation_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."evaluation_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_result" ADD CONSTRAINT "evaluation_result_case_id_evaluation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."evaluation_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_run" ADD CONSTRAINT "evaluation_run_dataset_id_evaluation_dataset_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "public"."evaluation_dataset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evaluation_case_dataset_id_idx" ON "evaluation_case" USING btree ("dataset_id");--> statement-breakpoint
CREATE INDEX "evaluation_result_run_id_idx" ON "evaluation_result" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "evaluation_result_case_id_idx" ON "evaluation_result" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "evaluation_run_dataset_id_idx" ON "evaluation_run" USING btree ("dataset_id");