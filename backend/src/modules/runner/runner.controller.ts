import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { professorOrAdminGuard } from "../../lib/auth";
import { sanitizeError, NotFoundError } from "../../lib/errors";
import { db } from "../../db";
import { projects } from "../../db/schema";
import { RunnerService } from "./runner.service";

export const runnerController = new Elysia({ prefix: "/runner" })
  .use(professorOrAdminGuard)

  // ──────── Start / Deploy ────────
  .post(
    "/:projectId/start",
    async ({ params, set }) => {
      try {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, params.projectId),
        });

        if (!project) {
          throw new NotFoundError("Project not found");
        }

        const { url } = await RunnerService.deployProject(
          project.studentId,
          project.id,
        );

        return { success: true, url };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({
        projectId: t.String({ format: "uuid", description: "Project UUID" }),
      }),
      detail: {
        summary: "Start / Deploy Project",
        description:
          "Build and deploy a student project as a Docker container behind Traefik. " +
          "Professors and admins only.",
        tags: ["Runner"],
      },
    },
  )

  // ──────── Stop ────────
  .post(
    "/:projectId/stop",
    async ({ params, set }) => {
      try {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, params.projectId),
        });

        if (!project) {
          throw new NotFoundError("Project not found");
        }

        await RunnerService.stopProject(project.studentId, project.id);

        return { success: true, message: "Project stopped" };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({
        projectId: t.String({ format: "uuid", description: "Project UUID" }),
      }),
      detail: {
        summary: "Stop Project",
        description:
          "Tear down a running project container and clean up workspace. " +
          "Professors and admins only.",
        tags: ["Runner"],
      },
    },
  )

  // ──────── Logs ────────
  .get(
    "/:projectId/logs",
    async ({ params, query, set }) => {
      try {
        const project = await db.query.projects.findFirst({
          where: eq(projects.id, params.projectId),
        });

        if (!project) {
          throw new NotFoundError("Project not found");
        }

        const tail = query?.tail ? parseInt(query.tail, 10) : 200;
        const logs = await RunnerService.getProjectLogs(
          project.studentId,
          project.id,
          tail,
        );

        return { success: true, data: logs };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({
        projectId: t.String({ format: "uuid", description: "Project UUID" }),
      }),
      query: t.Optional(t.Object({ tail: t.Optional(t.String()) })),
      detail: {
        summary: "Get Project Logs",
        description:
          "Retrieve Docker container logs for a project. " +
          "Professors and admins only.",
        tags: ["Runner"],
      },
    },
  );
