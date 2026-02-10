CREATE TABLE "lab_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_id" uuid NOT NULL,
	"minio_path" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professor_id" uuid NOT NULL,
	"section_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"deadline" timestamp with time zone NOT NULL,
	"max_grade" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "lab_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "grade" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "grade_message" text;--> statement-breakpoint
ALTER TABLE "lab_files" ADD CONSTRAINT "lab_files_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labs" ADD CONSTRAINT "labs_professor_id_users_id_fk" FOREIGN KEY ("professor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lab_id_labs_id_fk" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE set null ON UPDATE no action;