import { eq } from "drizzle-orm";
import { join, resolve, relative, extname } from "node:path";
import { mkdir, rm, stat, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import AdmZip from "adm-zip";
import { createExtractorFromData } from "node-unrar-js";
import { db } from "../../db";
import { projects } from "../../db/schema";
import { MinioService } from "../../lib/minio";
import { NotFoundError, ForbiddenError, AppError } from "../../lib/errors";
import { env } from "../../config/env";
import { VIEWERS_DIR } from "../../config/paths";

const BUCKET = env.MINIO_BUCKET;
const VIEWER_TIMEOUT_MS = env.VIEWER_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Tracks last-access timestamps for viewer directories.
 * Key = absolute path to student viewer dir.
 */
const accessMap = new Map<string, number>();

// ──────────────────────────────────────────────
//  Viewer Service
// ──────────────────────────────────────────────

export class ViewerService {
    private static reapInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Start the background reaper that removes stale viewer caches.
     */
    static startReaper(): void {
        if (this.reapInterval) return;
        this.reapInterval = setInterval(() => this.reapStaleViewers(), 5 * 60 * 1000);
        console.log(
            `⏱  Viewer reaper started (timeout: ${env.VIEWER_TIMEOUT_MINUTES}m)`,
        );
    }

    static stopReaper(): void {
        if (this.reapInterval) {
            clearInterval(this.reapInterval);
            this.reapInterval = null;
        }
    }

    /**
     * Remove viewer directories that haven't been accessed recently.
     */
    private static async reapStaleViewers(): Promise<void> {
        const now = Date.now();
        for (const [dir, lastAccess] of accessMap.entries()) {
            if (now - lastAccess > VIEWER_TIMEOUT_MS) {
                try {
                    await rm(dir, { recursive: true, force: true });
                    accessMap.delete(dir);
                    console.log(`🗑  Removed stale viewer cache: ${dir}`);
                } catch (err) {
                    console.error(`Failed to remove viewer cache ${dir}:`, err);
                }
            }
        }

        // Also scan disk for orphan dirs not in the map
        if (existsSync(VIEWERS_DIR)) {
            try {
                const dirs = await readdir(VIEWERS_DIR);
                for (const d of dirs) {
                    const fullPath = join(VIEWERS_DIR, d);
                    if (!accessMap.has(fullPath)) {
                        const info = await stat(fullPath).catch(() => null);
                        if (info && now - info.mtimeMs > VIEWER_TIMEOUT_MS) {
                            await rm(fullPath, { recursive: true, force: true });
                            console.log(`🗑  Removed orphan viewer cache: ${fullPath}`);
                        }
                    }
                }
            } catch {
                /* directory may not exist yet */
            }
        }
    }

    /**
     * Ensure the project's zip is extracted into the viewer cache.
     * Returns the base directory for this student's viewer files.
     */
    private static async ensureExtracted(
        projectId: string,
    ): Promise<{ studentId: string; viewerDir: string }> {
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });

        if (!project) throw new NotFoundError("Project not found");
        if (!project.minioSourcePath)
            throw new AppError("No source file uploaded for this project");

        // Use projectId-based dir so multiple projects from same student don't collide
        const viewerDir = join(VIEWERS_DIR, projectId);

        // If already extracted, just refresh access time
        if (existsSync(viewerDir)) {
            accessMap.set(viewerDir, Date.now());
            return { studentId: project.studentId, viewerDir };
        }

        // Extract fresh
        await mkdir(viewerDir, { recursive: true });
        const buffer = await MinioService.getFileBuffer(
            BUCKET,
            project.minioSourcePath,
        );

        const ext = extname(project.minioSourcePath).toLowerCase();

        if (ext === ".rar") {
            // RAR Extraction using node-unrar-js
            // node-unrar-js expects an ArrayBuffer
            const data = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength,
            ) as ArrayBuffer;
            const extractor = await createExtractorFromData({ data });
            const { files } = extractor.extract();

            for (const file of [...files]) {
                if (file.fileHeader.flags.directory) {
                    await mkdir(join(viewerDir, file.fileHeader.name), { recursive: true });
                } else {
                    const filePath = join(viewerDir, file.fileHeader.name);
                    const parentDir = join(filePath, "..");
                    if (!existsSync(parentDir)) await mkdir(parentDir, { recursive: true });

                    if (file.extraction) {
                        await writeFile(filePath, Buffer.from(file.extraction));
                    }
                }
            }
        } else {
            // Default to ZIP
            const zip = new AdmZip(buffer);
            zip.extractAllTo(viewerDir, true);
        }

        accessMap.set(viewerDir, Date.now());
        return { studentId: project.studentId, viewerDir };
    }

    /**
     * Resolve a user-supplied file path to an absolute path inside the jail.
     * Throws if the resolved path escapes the viewer directory.
     */
    private static jailResolve(baseDir: string, userPath: string): string {
        // Normalize and resolve against the jail base
        const resolved = resolve(baseDir, userPath);

        // Ensure the resolved path starts with the jail base
        const rel = relative(baseDir, resolved);
        if (rel.startsWith("..") || resolve(baseDir, rel) !== resolved) {
            throw new ForbiddenError("Access denied: path escapes viewer sandbox");
        }

        return resolved;
    }

    /**
     * Invalidate the viewer cache for a project so the next open re-extracts.
     */
    static async invalidateCache(projectId: string): Promise<void> {
        const viewerDir = join(VIEWERS_DIR, projectId);
        if (existsSync(viewerDir)) {
            await rm(viewerDir, { recursive: true, force: true });
            accessMap.delete(viewerDir);
            console.log(`🗑  Invalidated viewer cache: ${viewerDir}`);
        }
    }

    /**
     * Read a file's content from a viewer-cached project.
     * Path format: <filePath within the zip>
     */
    static async getFileContent(
        projectId: string,
        filePath: string,
    ): Promise<{ content: string; mimeType: string }> {
        const { viewerDir } = await this.ensureExtracted(projectId);

        // Jail-resolve the path
        const absolutePath = this.jailResolve(viewerDir, filePath);

        const file = Bun.file(absolutePath);
        if (!(await file.exists())) {
            throw new NotFoundError("File not found");
        }

        // Make sure it's a file, not a directory
        const info = await stat(absolutePath);
        if (info.isDirectory()) {
            throw new AppError("Path is a directory, not a file");
        }

        // Refresh access time
        accessMap.set(viewerDir, Date.now());

        const content = await file.text();
        const mimeType = file.type || "text/plain";

        return { content, mimeType };
    }

    /**
     * Get the student ID that owns a project (for access control).
     */
    static async getProjectOwner(projectId: string): Promise<string> {
        const project = await db.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });
        if (!project) throw new NotFoundError("Project not found");
        return project.studentId;
    }

    /**
     * Get the folder/file structure of a project by extracting it to the viewer cache
     * and walking the filesystem. Works for both ZIP and RAR.
     * Also calculates and persists the unzipped size if not already saved.
     */
    static async getStructure(projectId: string) {
        const { viewerDir } = await this.ensureExtracted(projectId);

        let totalSize = 0;

        const walk = async (dir: string, prefix: string): Promise<any[]> => {
            const entries = await readdir(dir, { withFileTypes: true });
            const result: any[] = [];

            for (const entry of entries) {
                const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    const children = await walk(join(dir, entry.name), entryPath);
                    result.push({
                        name: entry.name,
                        type: "folder" as const,
                        path: entryPath + "/",
                        children,
                    });
                } else {
                    const info = await stat(join(dir, entry.name));
                    totalSize += info.size;
                    result.push({
                        name: entry.name,
                        type: "file" as const,
                        path: entryPath,
                        size: info.size,
                    });
                }
            }

            // Sort: folders first, then alphabetical
            result.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "folder" ? -1 : 1;
            });

            return result;
        };

        const tree = await walk(viewerDir, "");

        // If project has no fileSize saved, persist the calculated unzipped total
        if (totalSize > 0) {
            const project = await db.query.projects.findFirst({
                where: eq(projects.id, projectId),
            });
            if (project && !project.fileSize) {
                await db
                    .update(projects)
                    .set({ fileSize: totalSize, updatedAt: new Date() })
                    .where(eq(projects.id, projectId));
            }
        }

        return tree;
    }
}
