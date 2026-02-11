/**
 * Sabr Deep Scan Worker — Playwright-based behavioral testing service.
 * Runs as a separate container with Chromium installed.
 *
 * Endpoints:
 *   POST /deep-scan  { url, labName, labDescription, maxGrade }
 *     → Returns detailed behavioral test results
 *
 *   GET /health
 *     → Returns { status: "ok" }
 */

import { Elysia, t } from "elysia";
import { runDeepScan } from "./scanner";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))

  .post(
    "/deep-scan",
    async ({ body }) => {
      try {
        const result = await runDeepScan(body);
        return { success: true, data: result };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Deep scan error:", message);
        return { success: false, message };
      }
    },
    {
      body: t.Object({
        url: t.String(),
        labName: t.String(),
        labDescription: t.String(),
        maxGrade: t.Number(),
      }),
    },
  )

  .listen(PORT);

console.log(`🔬 Deep scan worker running on port ${PORT}`);
