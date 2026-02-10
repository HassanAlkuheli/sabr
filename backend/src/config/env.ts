import { z } from "zod";
import { resolve } from "node:path";

// Load the centralized .env from project root (one level above backend/)
const ROOT_ENV_PATH = resolve(import.meta.dir, "../../../.env");
const envFile = Bun.file(ROOT_ENV_PATH);
if (await envFile.exists()) {
  const text = await envFile.text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const envSchema = z.object({
  // ── Application ──────────────────
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(16),
  DEPLOY_DOMAIN: z.string().default("sabr.localhost"),

  // ── Database ─────────────────────
  DATABASE_URL: z.string().url(),

  // ── MinIO ────────────────────────
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default("minioadmin"),
  MINIO_SECRET_KEY: z.string().default("minioadmin"),
  MINIO_USE_SSL: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  MINIO_BUCKET: z.string().default("sabr"),

  // ── Runner / Viewer ──────────────
  RUNNER_TIMEOUT_MINUTES: z.coerce.number().default(30),
  VIEWER_TIMEOUT_MINUTES: z.coerce.number().default(30),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(50),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
