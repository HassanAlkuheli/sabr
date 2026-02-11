ALTER TABLE "projects" ADD COLUMN "ai_scan_result" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ai_scan_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deep_scan_result" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deep_scan_at" timestamp with time zone;