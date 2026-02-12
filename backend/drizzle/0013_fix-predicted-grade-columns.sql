-- Ensure predicted_grade and deep_scan_screenshots columns exist
-- (migration 0012 may have been recorded without actually creating them)
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "predicted_grade" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "deep_scan_screenshots" jsonb;
