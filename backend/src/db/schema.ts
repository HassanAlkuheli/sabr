import { pgTable, text, uuid, timestamp, pgEnum, integer, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

// ──────── Enums ────────

export const roleEnum = pgEnum("role", ["ADMIN", "PROFESSOR", "STUDENT"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);
export const projectStatusEnum = pgEnum("project_status", ["STOPPED", "STARTING", "RUNNING", "ERROR"]);
export const projectTypeEnum = pgEnum("project_type", ["static", "nodejs"]);

// ──────── Users ────────

export const users = pgTable("users", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  /** For students: their section (e.g. "M102"). */
  sectionNumber: text("section_number"),
  /**
   * For professors: JSON array of section numbers they are allowed to view.
   * Managed by an admin. e.g. ["M102","M103"]
   */
  sections: text("sections"),
  /** Token for password reset (hashed) */
  resetToken: text("reset_token"),
  /** Expiry timestamp for the reset token */
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────── Labs ────────

export const labs = pgTable("labs", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  professorId: uuid("professor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  maxGrade: integer("max_grade").notNull().default(100),
  /**
   * JSON array of section numbers this lab belongs to.
   * e.g. '["M101","M102"]'
   */
  sections: text("sections").notNull(),
  /** JSON array of { fileName, filePath, fileType, fileSize } */
  attachments: text("attachments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────── Projects ────────

export const projects = pgTable("projects", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  minioSourcePath: text("minio_source_path"),
  /** File size in bytes, recorded at upload time. */
  fileSize: integer("file_size"),
  url: text("url"),
  /** phpMyAdmin URL for database management (Node.js projects only) */
  adminUrl: text("admin_url"),
  /** Project type: static (nginx) or nodejs (node+mysql) */
  projectType: projectTypeEnum("project_type").notNull().default("static"),
  status: projectStatusEnum("status").notNull().default("STOPPED"),
  /** Lab this project is submitted to (nullable — may not be assigned) */
  labId: uuid("lab_id").references(() => labs.id, { onDelete: "set null" }),
  /** Grade given by professor (nullable until graded) */
  grade: integer("grade"),
  /** Feedback message from professor */
  gradeMessage: text("grade_message"),
  /** Error message when deployment fails (helps students debug) */
  errorMessage: text("error_message"),
  /** AI code scan result (persisted JSON) */
  aiScanResult: jsonb("ai_scan_result"),
  /** When the AI code scan was last run */
  aiScanAt: timestamp("ai_scan_at", { withTimezone: true }),
  /** AI deep scan result — browser-based behavioral test (persisted JSON) */
  deepScanResult: jsonb("deep_scan_result"),
  /** When the deep scan was last run */
  deepScanAt: timestamp("deep_scan_at", { withTimezone: true }),
  /** AI predicted grade (computed from code scan + deep scan) */
  predictedGrade: integer("predicted_grade"),
  /** MinIO paths for deep scan screenshots */
  deepScanScreenshots: jsonb("deep_scan_screenshots"),
  lastActive: timestamp("last_active", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────── Relations ────────

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  labs: many(labs),
}));

export const labsRelations = relations(labs, ({ one, many }) => ({
  professor: one(users, {
    fields: [labs.professorId],
    references: [users.id],
  }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  student: one(users, {
    fields: [projects.studentId],
    references: [users.id],
  }),
  lab: one(labs, {
    fields: [projects.labId],
    references: [labs.id],
  }),
}));