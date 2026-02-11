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

// ── Auto-construct DATABASE_URL from POSTGRES_* vars ──
// Always prefer constructing from individual vars so passwords are safely URL-encoded.
// This avoids issues with special chars (#, @, etc.) breaking the connection string.
if (process.env.POSTGRES_PASSWORD) {
  const user = encodeURIComponent(process.env.POSTGRES_USER || "postgres");
  const pass = encodeURIComponent(process.env.POSTGRES_PASSWORD);
  const host = process.env.POSTGRES_HOST || "postgres";
  const port = process.env.POSTGRES_PORT || "5432";
  const db = encodeURIComponent(process.env.POSTGRES_DB || "sabr");

  process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  console.log(`🔧 Constructed DATABASE_URL (host=${host}, port=${port}, db=${process.env.POSTGRES_DB || "sabr"})`);
}

const envSchema = z.object({
  // ── Application ──────────────────
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(16),  CORS_ORIGIN: z.string().optional(),  DEPLOY_DOMAIN: z.string().default("sabr.localhost"),

  // ── Database ─────────────────────
  // Note: Do NOT use z.string().url() — Zod v4 rejects postgresql:// scheme
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // ── MinIO ────────────────────────
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().min(1, "MINIO_ACCESS_KEY is required"),
  MINIO_SECRET_KEY: z.string().min(1, "MINIO_SECRET_KEY is required"),
  MINIO_USE_SSL: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  MINIO_BUCKET: z.string().default("sabr"),

  // ── Runner / Viewer ──────────────
  RUNNER_TIMEOUT_MINUTES: z.coerce.number().default(30),
  VIEWER_TIMEOUT_MINUTES: z.coerce.number().default(30),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(50),

  // ── Email (Password Reset) ──────
  SMTP_EMAIL: z.string().optional(),
  SMTP_APP_PASSWORD: z.string().optional(),
  FRONTEND_URL: z.string().default("https://sabr.haskify.com"),

  // ── AI (LangChain / OpenAI) ────
  OPENAI_API_KEY: z.string().optional(),

  // ── Deep Scan Worker ─────────
  WORKER_URL: z.string().default("http://sabr-worker:3001"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
