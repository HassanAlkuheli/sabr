import { Elysia, t } from "elysia";
import { authGuard, professorOrAdminGuard } from "../../lib/auth";
import { sanitizeError } from "../../lib/errors";
import { AiService } from "./ai.service";

export const aiController = new Elysia({ prefix: "/ai" })

  // ── GET screenshot image (proxied from MinIO, no auth required for <img> tags) ──
  .get(
    "/screenshot/:projectId/:index",
    async ({ params, set }) => {
      try {
        const index = parseInt(params.index, 10);
        if (isNaN(index) || index < 0) {
          set.status = 400;
          return { success: false, message: "Invalid screenshot index" };
        }
        const buffer = await AiService.getScreenshotBuffer(params.projectId, index);
        if (!buffer) {
          set.status = 404;
          return { success: false, message: "Screenshot not found" };
        }
        set.headers["content-type"] = "image/png";
        set.headers["cache-control"] = "public, max-age=3600";
        return new Response(buffer);
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({
        projectId: t.String({ format: "uuid" }),
        index: t.String(),
      }),
      detail: {
        summary: "Get screenshot image",
        description: "Returns the screenshot PNG proxied from MinIO storage. No auth required (used by img tags).",
        tags: ["AI"],
      },
    },
  )

  .use(authGuard)

  // ── GET cached scan results (no LLM call) ──
  .get(
    "/scan/:projectId",
    async ({ params, set }) => {
      try {
        const cached = await AiService.getCachedScan(params.projectId);
        return { success: true, data: cached };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({
        projectId: t.String({ format: "uuid" }),
      }),
      detail: {
        summary: "Get cached AI scan results",
        description: "Returns previously saved AI code-scan and deep-scan results without calling the LLM.",
        tags: ["AI"],
      },
    },
  )

  // ── POST run (or re-run) code scan ──
  .post(
    "/scan/:projectId",
    async ({ params, set }) => {
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
        projectId: t.String({ format: "uuid" }),
      }),
      detail: {
        summary: "AI Scan Project",
        description:
          "Run AI analysis on a project's files against its lab requirements. " +
          "Result is persisted to DB and returned.",
        tags: ["AI"],
      },
    },
  )

  // ── POST deep scan (browser-based behavioral test) ──
  .post(
    "/deep-scan/:projectId",
    async ({ params, set }) => {
      try {
        const result = await AiService.deepScanProject(params.projectId);
        return { success: true, data: result };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: t.Object({
        projectId: t.String({ format: "uuid" }),
      }),
      detail: {
        summary: "Deep Scan Project",
        description:
          "Crawl the deployed project pages and use AI to evaluate behavior " +
          "against lab requirements. Project must be running.",
        tags: ["AI"],
      },
    },
  );
