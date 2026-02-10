CREATE TYPE "public"."project_type" AS ENUM('static', 'nodejs');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "admin_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_type" "project_type" DEFAULT 'static' NOT NULL;