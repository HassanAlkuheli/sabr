import { Elysia } from "elysia";
import { professorOrAdminGuard } from "../../lib/auth";
import { sanitizeError } from "../../lib/errors";
import { LabService } from "../labs/lab.service";
import { AdminService } from "../admin/admin.service";
import {
  createLabBody,
  updateLabBody,
  labIdParam,
  gradeProjectBody,
  assignLabBody,
  projectIdParam,
} from "../labs/lab.schema";

/** Helper: get the professor's assigned sections from DB. */
async function getProfessorSections(userId: string, userRole: string): Promise<string[]> {
  if (userRole === "ADMIN") {
    // Admin sees all sections
    return AdminService.getAllSections();
  }
  // For professors, parse their sections JSON from the users table
  const { db } = await import("../../db");
  const { users } = await import("../../db/schema");
  const { eq } = await import("drizzle-orm");
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return AdminService.parseSections(user?.sections ?? null);
}

export const professorController = new Elysia({ prefix: "/professor" })
  .use(professorOrAdminGuard)

  // ──────── Get my sections ────────
  .get(
    "/sections",
    async ({ userId, userRole, set }) => {
      try {
        const sections = await getProfessorSections(userId, userRole);
        return { success: true, data: sections };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    { detail: { summary: "Get professor's assigned sections", tags: ["Professor"] } },
  )

  // ──────── List professors for my sections ────────
  .get(
    "/professors",
    async ({ userId, userRole, set }) => {
      try {
        const sections = await getProfessorSections(userId, userRole);
        const data = await LabService.listProfessorsBySections(sections);
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    { detail: { summary: "List professors sharing sections", tags: ["Professor"] } },
  )

  // ──────── List projects for my sections ────────
  .get(
    "/projects",
    async ({ userId, userRole, set }) => {
      try {
        const sections = await getProfessorSections(userId, userRole);
        const data = await LabService.listProjectsBySections(sections);
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    { detail: { summary: "List projects in professor's sections", tags: ["Professor"] } },
  )

  // ──────── List students for my sections ────────
  .get(
    "/students",
    async ({ userId, userRole, set }) => {
      try {
        const sections = await getProfessorSections(userId, userRole);
        const data = await LabService.listStudentsBySections(sections);
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    { detail: { summary: "List students in professor's sections", tags: ["Professor"] } },
  )

  // ──────── List running projects for my sections ────────
  .get(
    "/projects/running",
    async ({ userId, userRole, set }) => {
      try {
        const sections = await getProfessorSections(userId, userRole);
        const data = await LabService.listRunningProjectsBySections(sections);
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    { detail: { summary: "List running projects in professor's sections", tags: ["Professor"] } },
  )

  // ──────── Labs ────────

  .get(
    "/labs",
    async ({ userId, userRole, set }) => {
      try {
        const sections = await getProfessorSections(userId, userRole);
        const data = await LabService.listLabsBySections(sections);
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    { detail: { summary: "List labs for professor's sections", tags: ["Professor"] } },
  )

  .post(
    "/labs",
    async ({ userId, body, set }) => {
      try {
        const lab = await LabService.createLab(userId, body);
        set.status = 201;
        return { success: true, data: lab };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      body: createLabBody,
      detail: { summary: "Create a new lab", tags: ["Professor"] },
    },
  )

  .put(
    "/labs/:labId",
    async ({ params, userId, body, set }) => {
      try {
        const lab = await LabService.updateLab(params.labId, body);
        return { success: true, data: lab };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: labIdParam,
      body: updateLabBody,
      detail: { summary: "Update a lab", tags: ["Professor"] },
    },
  )

  .delete(
    "/labs/:labId",
    async ({ params, userId, set }) => {
      try {
        await LabService.deleteLab(params.labId);
        return { success: true, message: "Lab deleted" };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: labIdParam,
      detail: { summary: "Delete a lab", tags: ["Professor"] },
    },
  )

  // ──────── Grading ────────

  .patch(
    "/projects/:projectId/grade",
    async ({ params, userId, body, set }) => {
      try {
        const project = await LabService.gradeProject(params.projectId, userId, body);
        return { success: true, data: project };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: projectIdParam,
      body: gradeProjectBody,
      detail: { summary: "Grade a project or send feedback", tags: ["Professor"] },
    },
  )

  // ──────── Assign/Unassign project to lab ────────

  .patch(
    "/projects/:projectId/assign-lab",
    async ({ params, body, set }) => {
      try {
        const project = await LabService.assignProjectToLab(params.projectId, body.labId);
        return { success: true, data: project };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: projectIdParam,
      body: assignLabBody,
      detail: { summary: "Assign a project to a lab", tags: ["Professor"] },
    },
  )

  .patch(
    "/projects/:projectId/unassign-lab",
    async ({ params, set }) => {
      try {
        const project = await LabService.unassignProjectFromLab(params.projectId);
        return { success: true, data: project };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: projectIdParam,
      detail: { summary: "Unassign a project from its lab", tags: ["Professor"] },
    },
  )

  // ──────── Bulk assign lab to all projects in section ────────

  .patch(
    "/labs/:labId/assign-section",
    async ({ params, set }) => {
      try {
        const result = await LabService.assignLabToSection(params.labId);
        return { success: true, data: result };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: labIdParam,
      detail: { summary: "Assign lab to all projects in its section", tags: ["Professor"] },
    },
  );
