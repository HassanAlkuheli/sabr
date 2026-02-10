ALTER TABLE "labs" RENAME COLUMN "section_number" TO "sections";--> statement-breakpoint
-- Migrate existing single section values to JSON arrays
UPDATE "labs" SET "sections" = '["' || "sections" || '"]' WHERE "sections" NOT LIKE '[%';
