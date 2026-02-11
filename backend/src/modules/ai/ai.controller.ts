import { Elysia, t } from "elysia";
import { authGuard, professorOrAdminGuard } from "../../lib/auth";
import { sanitizeError } from "../../lib/errors";
import { AiService } from "./ai.service";

export const aiController = new Elysia({ prefix: "/ai" })

  // ── Student: scan own project ──
  .use(authGuard)
  .post(
    "/scan/:projectId",
    async ({ params, userId, userRole, set }) => {
      try {
        const result = await AiService.scanProject(params.projectId);
        return { success: true, data: result };
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
        summary: "AI Scan Project",
        description:
          "Use AI to analyze a project's files against its lab requirements. " +
          "Returns a match percentage, strengths, improvements, and missing requirements. " +
          "Available to the project owner, professors, and admins.",
        tags: ["AI"],
      },
    },
  );
