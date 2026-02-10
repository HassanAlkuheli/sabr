CREATE TYPE "public"."project_status" AS ENUM('STOPPED', 'RUNNING', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'PROFESSOR', 'STUDENT');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"name" text NOT NULL,
	"minio_source_path" text,
	"minio_config_path" text,
	"container_id" text,
	"url" text,
	"status" "project_status" DEFAULT 'STOPPED' NOT NULL,
	"last_active" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "role" NOT NULL,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"section_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;