import { Elysia, t } from "elysia";
import { authGuard } from "../../lib/auth";
import { sanitizeError, AppError, ForbiddenError, NotFoundError } from "../../lib/errors";
import { ViewerService } from "./viewer.service";

export const viewerController = new Elysia({ prefix: "/viewer" })
  .use(authGuard)

  // ──────── Get File Content ────────
  .get(
    "/:projectId",
    async ({ params, query, userId, userRole, set }) => {
      try {
        const { projectId } = params;
        const filePath = query.path;

        if (!filePath) {
          throw new AppError("File path is required (use ?path=<filePath>)");
        }

        // Access control: professors/admins can view any; students only their own
        if (userRole === "STUDENT") {
          const ownerId = await ViewerService.getProjectOwner(projectId);
          if (ownerId !== userId) {
            throw new ForbiddenError("You can only view your own submissions");
          }
        }

        const { content, mimeType } = await ViewerService.getFileContent(
          projectId,
          filePath,
        );

        return { success: true, data: { content, mimeType, path: filePath } };
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
      query: t.Object({
        path: t.String({
          description:
            "Relative file path inside the project archive, e.g. src/index.html",
        }),
      }),
      detail: {
        summary: "Get File Content",
        description:
          "Read the content of a file from a student's project submission. " +
          "Professors and admins can view any project. Students can only view their own. " +
          "The file path comes from the Project Structure endpoint.",
        tags: ["Viewer"],
      },
    },
  )

  // ──────── Get Project Structure ────────
  .get(
    "/:projectId/structure",
    async ({ params, userId, userRole, set }) => {
      try {
        const { projectId } = params;

        if (userRole === "STUDENT") {
          const ownerId = await ViewerService.getProjectOwner(projectId);
          if (ownerId !== userId) {
            throw new ForbiddenError("You can only view your own submissions");
          }
        }

        const structure = await ViewerService.getStructure(projectId);
        return { success: true, data: structure };
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
        summary: "Get Project Structure",
        description:
          "Get the folder/file tree of a project submission. " +
          "Works for both ZIP and RAR archives. " +
          "Students can view their own; professors/admins can view any.",
        tags: ["Viewer"],
      },
    },
  );
