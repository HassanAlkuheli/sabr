import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { env } from "./src/config/env";
import { AppError, sanitizeError } from "./src/lib/errors";
import { sql } from "drizzle-orm";
import { authController } from "./src/modules/auth/auth.controller";
import { db } from "./src/db";
import { adminController } from "./src/modules/admin/admin.controller";
import { projectsController } from "./src/modules/projects/projects.controller";
import { runnerController } from "./src/modules/runner/runner.controller";
import { viewerController } from "./src/modules/viewer/viewer.controller";
import { professorController } from "./src/modules/professor/professor.controller";
import { aiController } from "./src/modules/ai/ai.controller";
import { RunnerService } from "./src/modules/runner/runner.service";
import { ViewerService } from "./src/modules/viewer/viewer.service";

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : true,
      credentials: true,
    }),
  )
  // ──────── Global Error Handler ────────
  // Catches errors thrown from derive(), guards, and route handlers.
  // Converts AppError subclasses to proper HTTP status codes,
  // and sanitizes all other errors to prevent SQL / internal leaks.
  .onError(({ error, set }) => {
    const { message, statusCode } = sanitizeError(error);
    set.status = statusCode;
    return { success: false, message };
  })
  .use(
    swagger({
      documentation: {
        info: {
          title: "Sabr API",
          version: "1.0.0",
          description:
            "Multi-tenant student project deployment platform. " +
            "Students upload ZIP/RAR projects, professors deploy and view them, " +
            "admins manage professor section access.",
        },
        tags: [
          { name: "Auth", description: "Registration & login" },
          { name: "Admin", description: "Admin-only user & section management" },
          { name: "Projects", description: "Project upload & listing" },
          { name: "Runner", description: "Deploy / stop student containers" },
          { name: "Viewer", description: "Browse project files" },
        ],
        security: [{ JwtAuth: [] }],
        components: {
          securitySchemes: {
            JwtAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    }),
  )
  .use(authController)
  .use(adminController)
  .use(projectsController)
  .use(runnerController)
  .use(viewerController)
  .use(professorController)
  .use(aiController)
  .get("/", () => ({ status: "ok", name: "Sabr API" }), {
    detail: {
      summary: "Health Check",
      description: "Returns API status.",
      tags: ["Health"],
    },
  })
  .get("/health", async () => {
    try {
      const result = await db.execute(sql`SELECT count(*) as cnt FROM users`);
      return { status: "ok", db: "connected", users: result[0]?.cnt ?? 0 };
    } catch (e) {
      return { status: "degraded", db: "error", error: String(e).slice(0, 300) };
    }
  }, {
    detail: {
      summary: "Deep Health Check",
      description: "Returns API and database connectivity status.",
      tags: ["Health"],
    },
  })
  .listen(env.PORT);

// Start background reapers for idle runners and stale viewers
RunnerService.startReaper();
ViewerService.startReaper();

console.log(`Sabr API running on http://localhost:${env.PORT}`);