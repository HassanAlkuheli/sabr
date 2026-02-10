DROP TABLE "lab_files" CASCADE;--> statement-breakpoint
ALTER TABLE "labs" ADD COLUMN "attachments" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "graded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "error_log" text;