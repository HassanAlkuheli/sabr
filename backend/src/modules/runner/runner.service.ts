import { $ } from "bun";
import { eq, lt, and } from "drizzle-orm";
import { join, extname } from "node:path";
import { mkdir, rm, cp, exists, writeFile, readFile, readdir, rename, appendFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { db } from "../../db";
import { projects } from "../../db/schema";
import { minioClient } from "../../lib/minio";
import { NotFoundError, AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { RUNNERS_DIR, NGINX_CONF_PATH } from "../../config/paths";
import AdmZip from "adm-zip";
import { createExtractorFromData } from "node-unrar-js";

const BUCKET = env.MINIO_BUCKET;
const DEPLOY_DOMAIN = env.DEPLOY_DOMAIN;
const RUNNER_TIMEOUT_MS = env.RUNNER_TIMEOUT_MINUTES * 60 * 1000;
const DEPLOY_LOG = "deploy.log";

type ProjectType = "static" | "nodejs";

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────

/** Append a timestamped line to the deploy log. */
async function log(workspace: string, message: string): Promise<void> {
  const ts = new Date().toISOString();
  await appendFile(join(workspace, DEPLOY_LOG), `[${ts}] ${message}\n`).catch(() => {});
}

// ──────────────────────────────────────────────
//  Project Type Detection
// ──────────────────────────────────────────────

/** Info gathered from the student's code directory. */
interface ProjectInfo {
  type: ProjectType;
  hasDockerfile: boolean;
  hasDbSql: boolean;
  appPort: number;
}

async function detectProjectInfo(codeDir: string): Promise<ProjectInfo> {
  const hasDockerfile = existsSync(join(codeDir, "Dockerfile"));
  const hasPkgJson = existsSync(join(codeDir, "package.json"));
  const hasDbSql = existsSync(join(codeDir, "db.sql"));
  const type: ProjectType = hasPkgJson || hasDockerfile ? "nodejs" : "static";

  // Try to detect port from Dockerfile EXPOSE or default to 3000
  let appPort = 3000;
  if (hasDockerfile) {
    try {
      const dockerfile = await readFile(join(codeDir, "Dockerfile"), "utf-8");
      const exposeMatch = dockerfile.match(/EXPOSE\s+(\d+)/i);
      if (exposeMatch) appPort = parseInt(exposeMatch[1]!, 10);
    } catch { /* ignore */ }
  }

  return { type, hasDockerfile, hasDbSql, appPort };
}

// ──────────────────────────────────────────────
//  Docker Compose Generators
// ──────────────────────────────────────────────

function generateStaticCompose(projectId: string): string {
  const safeId = projectId.replace(/-/g, "");
  const host = `${safeId}.${DEPLOY_DOMAIN}`;

  return `services:
  web:
    image: nginx:alpine
    container_name: ${safeId}
    volumes:
      - ./code:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    networks:
      - sabr-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${safeId}.rule=Host(\`${host}\`)"
      - "traefik.http.routers.${safeId}.entrypoints=web"

networks:
  sabr-net:
    external: true
`;
}

function generateNodeCompose(projectId: string, info: ProjectInfo): { yaml: string; dbPassword: string } {
  const safeId = projectId.replace(/-/g, "");
  const host = `${safeId}.${DEPLOY_DOMAIN}`;
  const dbHost = `${safeId}-db.${DEPLOY_DOMAIN}`;
  const dbPassword = randomBytes(16).toString("hex");
  const rootPassword = randomBytes(16).toString("hex");
  const dbName = `db_${safeId.slice(0, 28)}`;
  const dbUser = `u_${safeId.slice(0, 14)}`;
  const appPort = info.appPort;

  // App service: use student's Dockerfile if present, otherwise plain node image
  const appImage = info.hasDockerfile
    ? `    build: ./code`
    : `    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./code:/app
    command: sh -c "echo 'Waiting for MySQL…' && until nc -z db 3306 2>/dev/null; do sleep 1; done && sleep 3 && npm install && npm start"`;

  // Mount db.sql for init if the student provides one
  const dbInitVolume = info.hasDbSql
    ? `\n      - ./code/db.sql:/docker-entrypoint-initdb.d/db.sql:ro`
    : "";

  const yaml = `services:
  app:
${appImage}
    container_name: ${safeId}
    environment:
      - PORT=${appPort}
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=${dbUser}
      - DB_PASSWORD=${dbPassword}
      - DB_NAME=${dbName}
      - DATABASE_URL=mysql://${dbUser}:${dbPassword}@db:3306/${dbName}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - sabr-net
      - internal-${safeId}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${safeId}.rule=Host(\`${host}\`)"
      - "traefik.http.routers.${safeId}.entrypoints=web"
      - "traefik.http.services.${safeId}.loadbalancer.server.port=${appPort}"

  db:
    image: mysql:8.0
    container_name: ${safeId}-mysql
    command: --default-authentication-plugin=mysql_native_password
    environment:
      - MYSQL_ROOT_PASSWORD=${rootPassword}
      - MYSQL_DATABASE=${dbName}
      - MYSQL_USER=${dbUser}
      - MYSQL_PASSWORD=${dbPassword}
    volumes:
      - db_data:/var/lib/mysql${dbInitVolume}
    networks:
      - internal-${safeId}
    healthcheck:
      test: ["CMD-SHELL", "mysql -u${dbUser} -p${dbPassword} ${dbName} -e 'SELECT 1' 2>/dev/null"]
      interval: 5s
      timeout: 5s
      retries: 30
      start_period: 10s

  phpmyadmin:
    image: phpmyadmin:latest
    container_name: ${safeId}-phpmyadmin
    environment:
      - PMA_HOST=db
      - PMA_USER=${dbUser}
      - PMA_PASSWORD=${dbPassword}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - sabr-net
      - internal-${safeId}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${safeId}-db.rule=Host(\`${dbHost}\`)"
      - "traefik.http.routers.${safeId}-db.entrypoints=web"
      - "traefik.http.services.${safeId}-db.loadbalancer.server.port=80"

networks:
  sabr-net:
    external: true
  internal-${safeId}:
    driver: bridge

volumes:
  db_data:
`;

  return { yaml, dbPassword };
}

// ──────────────────────────────────────────────
//  Runner Service
// ──────────────────────────────────────────────

export class RunnerService {
  private static reapInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the background reaper that tears down idle runners.
   */
  static startReaper(): void {
    if (this.reapInterval) return;
    // Check every 5 minutes
    this.reapInterval = setInterval(() => this.reapIdleRunners(), 5 * 60 * 1000);
    console.log(
      `⏱  Runner reaper started (timeout: ${env.RUNNER_TIMEOUT_MINUTES}m)`,
    );
  }

  /**
   * Stop the reaper (for graceful shutdown).
   */
  static stopReaper(): void {
    if (this.reapInterval) {
      clearInterval(this.reapInterval);
      this.reapInterval = null;
    }
  }

  /**
   * Find and destroy runners that have been idle > RUNNER_TIMEOUT_MINUTES.
   */
  private static async reapIdleRunners(): Promise<void> {
    const threshold = new Date(Date.now() - RUNNER_TIMEOUT_MS);

    const idle = await db.query.projects.findMany({
      where: and(
        eq(projects.status, "RUNNING"),
        lt(projects.lastActive, threshold),
      ),
    });

    for (const project of idle) {
      try {
        console.log(
          `🗑  Reaping idle runner: ${project.name} (last active: ${project.lastActive?.toISOString()})`,
        );
        await this.stopProject(project.studentId, project.id);
      } catch (err) {
        console.error(`Failed to reap runner ${project.id}:`, err);
      }
    }
  }

  /**
   * Full deploy pipeline:
   *  1. DB check (verify container if RUNNING)
   *  2. Prepare workspace under tmp/runners/
   *  3. Fetch zip from MinIO & extract
   *  4. Copy nginx config from public/
   *  5. docker compose up -d
   *  6. Update DB → RUNNING
   */
  static async deployProject(
    studentId: string,
    projectId: string,
  ): Promise<{ url: string; adminUrl: string | null }> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) throw new NotFoundError("Project not found");
    if (project.studentId !== studentId)
      throw new AppError("Project does not belong to this student", 403);

    // Already live → verify container is actually running
    if (project.status === "RUNNING" && project.url) {
      const safeId = projectId.replace(/-/g, "");
      try {
        const result =
          await $`docker ps --filter "name=${safeId}" --filter "status=running" --format "{{.Names}}"`.quiet();
        if (result.stdout.toString().trim().includes(safeId)) {
          // Refresh lastActive so the reaper doesn't kill it
          await db
            .update(projects)
            .set({ lastActive: new Date() })
            .where(eq(projects.id, projectId));
          return { url: project.url, adminUrl: project.adminUrl ?? null };
        }
      } catch {
        /* container gone – fall through to redeploy */
      }
      await db
        .update(projects)
        .set({ status: "STOPPED", url: null, updatedAt: new Date() })
        .where(eq(projects.id, projectId));
    }

    if (!project.minioSourcePath)
      throw new AppError("No source file uploaded for this project");

    const workspace = join(RUNNERS_DIR, projectId);
    const codeDir = join(workspace, "code");
    const ext = extname(project.minioSourcePath).toLowerCase();
    const archivePath = join(workspace, `source${ext || '.zip'}`);

    try {
      // ── Mark as STARTING ─────────────────
      await db
        .update(projects)
        .set({ status: "STARTING", updatedAt: new Date(), errorMessage: null })
        .where(eq(projects.id, projectId));

      // ── Clean up any existing deployment ──
      try {
        if (await exists(workspace)) {
          await $`docker compose down --remove-orphans --volumes`.cwd(workspace).quiet();
        }
      } catch { /* may fail if no compose file yet */ }

      // ── Workspace setup ──────────────────
      await rm(workspace, { recursive: true, force: true });
      await mkdir(codeDir, { recursive: true });
      await log(workspace, "Deploy started");

      // ── Fetch & extract ──────────────────
      await log(workspace, `Fetching archive from MinIO: ${project.minioSourcePath}`);
      await minioClient.fGetObject(BUCKET, project.minioSourcePath, archivePath);

      if (ext === ".rar") {
        // RAR extraction using node-unrar-js
        const fileBuffer = await Bun.file(archivePath).arrayBuffer();
        const extractor = await createExtractorFromData({ data: fileBuffer });
        const { files } = extractor.extract();

        for (const file of [...files]) {
          if (file.fileHeader.flags.directory) {
            await mkdir(join(codeDir, file.fileHeader.name), { recursive: true });
          } else {
            const filePath = join(codeDir, file.fileHeader.name);
            const parentDir = join(filePath, "..");
            if (!existsSync(parentDir)) await mkdir(parentDir, { recursive: true });
            if (file.extraction) {
              await writeFile(filePath, Buffer.from(file.extraction));
            }
          }
        }
      } else {
        // Default to ZIP
        const zip = new AdmZip(archivePath);
        zip.extractAllTo(codeDir, true);
      }
      await log(workspace, "Archive extracted");

      // ── Flatten single wrapper directory ───
      await this.flattenSingleDir(codeDir);

      // ── Detect project info ──────────────
      const info = await detectProjectInfo(codeDir);
      await log(workspace, `Detected: type=${info.type} dockerfile=${info.hasDockerfile} dbSql=${info.hasDbSql} port=${info.appPort}`);

      // ── Sanitise db.sql — strip hardcoded DB names so init runs against MYSQL_DATABASE ──
      if (info.hasDbSql) {
        const sqlPath = join(codeDir, "db.sql");
        const raw = await Bun.file(sqlPath).text();
        const sanitised = raw
          .replace(/^\s*(CREATE\s+DATABASE\b[^;]*;)/gim, "-- $1")
          .replace(/^\s*(USE\s+\w+\s*;)/gim, "-- $1")
          .replace(/^\s*(DROP\s+DATABASE\b[^;]*;)/gim, "-- $1");
        await Bun.write(sqlPath, sanitised);
        if (sanitised !== raw) {
          await log(workspace, "Sanitised db.sql: commented out CREATE/USE/DROP DATABASE statements");
        }
      }

      if (info.type === "nodejs") {
        // ── Node.js + MySQL deploy ─────────
        const { yaml } = generateNodeCompose(projectId, info);
        await Bun.write(join(workspace, "docker-compose.yml"), yaml);
        await log(workspace, "Generated Node.js docker-compose.yml");
      } else {
        // ── Static site deploy ─────────────
        await cp(NGINX_CONF_PATH, join(workspace, "nginx.conf"));
        await Bun.write(
          join(workspace, "docker-compose.yml"),
          generateStaticCompose(projectId),
        );
        await log(workspace, "Generated static docker-compose.yml");
      }

      // ── Docker up ────────────────────────
      await log(workspace, "Running docker compose up …");
      const result =
        await $`docker compose up -d --build`.cwd(workspace).quiet().nothrow();
      const stdout = result.stdout.toString();
      const stderr = result.stderr.toString();
      if (stdout) await log(workspace, `stdout: ${stdout}`);
      if (stderr) await log(workspace, `stderr: ${stderr}`);
      if (result.exitCode !== 0) {
        throw new Error(
          `docker compose up failed (exit ${result.exitCode}): ${stderr}`,
        );
      }
      await log(workspace, "Containers started successfully");

      // ── State update ─────────────────────
      const safeId = projectId.replace(/-/g, "");
      const url = `http://${safeId}.${DEPLOY_DOMAIN}`;
      const adminUrl = info.type === "nodejs" ? `http://${safeId}-db.${DEPLOY_DOMAIN}` : null;
      const now = new Date();

      await db
        .update(projects)
        .set({
          status: "RUNNING",
          url,
          adminUrl,
          projectType: info.type,
          lastActive: now,
          updatedAt: now,
          errorMessage: null,
        })
        .where(eq(projects.id, projectId));

      return { url, adminUrl };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("🚨 Deploy error:", errorMsg);
      await log(workspace, `ERROR: ${errorMsg}`).catch(() => {});
      try {
        await db
          .update(projects)
          .set({ status: "ERROR", updatedAt: new Date(), errorMessage: errorMsg })
          .where(eq(projects.id, projectId));
      } catch (dbErr) {
        console.error("🔴 Failed to save error state to DB:", dbErr);
      }
      throw new AppError(`Deploy failed: ${errorMsg}`);
    }
  }

  /**
   * Tear-down pipeline:
   *  1. docker compose down
   *  2. Remove workspace from tmp/runners/
   *  3. Update DB → STOPPED
   */
  static async stopProject(
    studentId: string,
    projectId: string,
  ): Promise<void> {
    const workspace = join(RUNNERS_DIR, projectId);

    try {
      if (await exists(workspace)) {
        await $`docker compose down --remove-orphans --volumes`.cwd(workspace).quiet();
      }
    } catch {
      // compose down may fail if container was already removed
    }

    await rm(workspace, { recursive: true, force: true });

    await db
      .update(projects)
      .set({ status: "STOPPED", url: null, adminUrl: null, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }

  /**
   * Get deploy log + docker compose logs for a project.
   * Falls back to DB errorMessage when workspace is gone.
   */
  static async getProjectLogs(
    studentId: string,
    projectId: string,
    tail: number = 200,
  ): Promise<string> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) throw new NotFoundError("Project not found");

    const workspace = join(RUNNERS_DIR, projectId);
    const parts: string[] = [];

    // 1. Read deploy.log if workspace still exists
    if (await exists(workspace)) {
      try {
        const deployLog = await readFile(join(workspace, DEPLOY_LOG), "utf-8");
        if (deployLog.trim()) parts.push(deployLog.trimEnd());
      } catch { /* no deploy.log yet */ }

      // 2. Append docker compose container logs
      try {
        const result =
          await $`docker compose logs --tail=${tail} --no-color --timestamps`.cwd(workspace).quiet();
        const output = result.stdout.toString().trim();
        if (output) parts.push(output);
      } catch { /* compose logs can fail if no containers */ }
    }

    // 3. Fallback: include errorMessage from DB
    if (parts.length === 0) {
      if (project.errorMessage) {
        parts.push(`[Error] ${project.errorMessage}`);
      } else {
        parts.push("No logs available. Project may not have been deployed yet.");
      }
    }

    return parts.join("\n\n");
  }

  /**
   * If the extracted archive contains a single subdirectory (wrapper),
   * move all its contents up to the parent (codeDir) so index.html
   * is at the root and nginx can serve it directly.
   */
  private static async flattenSingleDir(codeDir: string): Promise<void> {
    const entries = await readdir(codeDir);
    // Filter out hidden files like __MACOSX
    const visible = entries.filter(e => !e.startsWith('.') && !e.startsWith('__'));
    if (visible.length !== 1) return;

    const singlePath = join(codeDir, visible[0]!);
    try {
      const stat = statSync(singlePath);
      if (!stat.isDirectory()) return;
    } catch { return; }

    // Move each inner entry up to the parent, then remove the wrapper
    const innerEntries = await readdir(singlePath);
    for (const entry of innerEntries) {
      const src = join(singlePath, entry);
      const dest = join(codeDir, entry);
      try {
        await rename(src, dest);
      } catch {
        // Fallback: copy + remove when rename fails (Windows EPERM)
        await cp(src, dest, { recursive: true });
      }
    }
    await rm(singlePath, { recursive: true, force: true });
  }
}
