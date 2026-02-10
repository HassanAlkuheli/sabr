import { Elysia, t } from "elysia";
import { authGuard } from "../../lib/auth";
import { sanitizeError } from "../../lib/errors";
import { env } from "../../config/env";
import { ProjectsService } from "./projects.service";
import { RunnerService } from "../runner/runner.service";

const MAX_FILE_SIZE = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const projectsController = new Elysia({ prefix: "/projects" })
  .use(authGuard)

  // ──────── Upload Project ────────
  .post(
    "/upload",
    async ({ body, userId, set }) => {
      try {
        const { file, name } = body;

        if (file.size > MAX_FILE_SIZE) {
          set.status = 400;
          return {
            success: false,
            message: `File size exceeds ${env.MAX_UPLOAD_SIZE_MB}MB limit`,
          };
        }

        if (!ProjectsService.isAllowedArchive(file)) {
          set.status = 400;
          return {
            success: false,
            message: "Only .zip and .rar files are allowed",
          };
        }

        const project = await ProjectsService.upload({
          studentId: userId,
          name,
          file,
        });

        set.status = 201;
        return { success: true, data: project };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      body: t.Object({
        file: t.File({
          maxSize: MAX_FILE_SIZE,
          description: "ZIP or RAR archive of the project",
        }),
        name: t.String({
          minLength: 1,
          description: "Project display name",
        }),
      }),
      detail: {
        summary: "Upload Project",
        description:
          "Upload a student project as a ZIP or RAR file. " +
          `Max size: ${env.MAX_UPLOAD_SIZE_MB} MB.`,
        tags: ["Projects"],
      },
    },
  )

  // ──────── List Student's Projects ────────
  .get(
    "/",
    async ({ userId, set }) => {
      try {
        const list = await ProjectsService.listByStudent(userId);
        return { success: true, data: list };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List My Projects",
        description: "Get all projects uploaded by the authenticated student.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Student's Running Projects ────────
  .get(
    "/running",
    async ({ userId, set }) => {
      try {
        const list = await ProjectsService.listRunningByStudent(userId);
        return { success: true, data: list };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List My Running Projects",
        description: "Get running projects belonging to the authenticated student.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Labs for Student's Section ────────
  .get(
    "/my-labs",
    async ({ userId, set }) => {
      try {
        const list = await ProjectsService.getLabsForStudentSection(userId);
        return { success: true, data: list };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Labs for My Section",
        description: "Get labs assigned to the student's section.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Classmates ────────
  .get(
    "/classmates",
    async ({ userId, set }) => {
      try {
        const list = await ProjectsService.getClassmates(userId);
        return { success: true, data: list };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Classmates",
        description: "Get students in the same section (no project/grade data).",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Section Professors ────────
  .get(
    "/section-professors",
    async ({ userId, set }) => {
      try {
        const list = await ProjectsService.getSectionProfessors(userId);
        return { success: true, data: list };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Section Professors",
        description: "Get professors assigned to the student's section.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Submit Project to Lab ────────
  .post(
    "/submit-to-lab/:labId",
    async ({ params, body, userId, set }) => {
      try {
        const { file, name } = body;

        if (file.size > MAX_FILE_SIZE) {
          set.status = 400;
          return {
            success: false,
            message: `File size exceeds ${env.MAX_UPLOAD_SIZE_MB}MB limit`,
          };
        }

        if (!ProjectsService.isAllowedArchive(file)) {
          set.status = 400;
          return {
            success: false,
            message: "Only .zip and .rar files are allowed",
          };
        }

        // Enforce deadline
        const lab = await ProjectsService.getLabById(params.labId);
        if (!lab) {
          set.status = 404;
          return { success: false, message: "Lab not found" };
        }
        if (new Date(lab.deadline) < new Date()) {
          set.status = 400;
          return { success: false, message: "Lab deadline has passed. Submissions are no longer accepted." };
        }

        const project = await ProjectsService.submitToLab({
          studentId: userId,
          name,
          file,
          labId: params.labId,
        });

        set.status = 201;
        return { success: true, data: project };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({ labId: t.String() }),
      body: t.Object({
        file: t.File({
          maxSize: MAX_FILE_SIZE,
          description: "ZIP or RAR archive of the project",
        }),
        name: t.String({
          minLength: 1,
          description: "Project display name",
        }),
      }),
      detail: {
        summary: "Submit Project to Lab",
        description:
          "Upload a project directly to a lab. If already submitted, replaces the old one.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Student Start Own Project ────────
  .post(
    "/:projectId/start",
    async ({ params, userId, set }) => {
      try {
        const owner = await ProjectsService.getProjectOwner(params.projectId);
        if (owner !== userId) {
          set.status = 403;
          return { success: false, message: "You can only start your own projects" };
        }

        const { url, adminUrl } = await RunnerService.deployProject(userId, params.projectId);
        return { success: true, url, adminUrl };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({ projectId: t.String({ format: "uuid" }) }),
      detail: {
        summary: "Start Own Project",
        description: "Student starts their own project for testing.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Student Stop Own Project ────────
  .post(
    "/:projectId/stop",
    async ({ params, userId, set }) => {
      try {
        const owner = await ProjectsService.getProjectOwner(params.projectId);
        if (owner !== userId) {
          set.status = 403;
          return { success: false, message: "You can only stop your own projects" };
        }

        await RunnerService.stopProject(userId, params.projectId);
        return { success: true, message: "Project stopped" };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({ projectId: t.String({ format: "uuid" }) }),
      detail: {
        summary: "Stop Own Project",
        description: "Student stops their own running project.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Student Get Own Project Logs ────────
  .get(
    "/:projectId/logs",
    async ({ params, query, userId, set }) => {
      try {
        const owner = await ProjectsService.getProjectOwner(params.projectId);
        if (owner !== userId) {
          set.status = 403;
          return { success: false, message: "You can only view logs for your own projects" };
        }

        const tail = query?.tail ? parseInt(query.tail, 10) : 200;
        const logs = await RunnerService.getProjectLogs(userId, params.projectId, tail);
        return { success: true, data: logs };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({ projectId: t.String({ format: "uuid" }) }),
      query: t.Optional(t.Object({ tail: t.Optional(t.String()) })),
      detail: {
        summary: "Get Own Project Logs",
        description: "Retrieve Docker container logs for a student's own project.",
        tags: ["Projects"],
      },
    },
  )

  // ──────── Student Delete Own Project ────────
  .delete(
    "/:projectId",
    async ({ params, userId, set }) => {
      try {
        const owner = await ProjectsService.getProjectOwner(params.projectId);
        if (owner !== userId) {
          set.status = 403;
          return { success: false, message: "You can only delete your own projects" };
        }

        await ProjectsService.deleteProject(params.projectId, userId);
        return { success: true, message: "Project deleted" };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({ projectId: t.String({ format: "uuid" }) }),
      detail: {
        summary: "Delete Own Project",
        description: "Delete a student's own project permanently.",
        tags: ["Projects"],
      },
    },
  );
