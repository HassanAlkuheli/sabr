import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../../db";
import { projects, users, labs } from "../../db/schema";
import { MinioService } from "../../lib/minio";
import { NotFoundError } from "../../lib/errors";
import { env } from "../../config/env";
import { ViewerService } from "../viewer/viewer.service";
import AdmZip from "adm-zip";
import { createExtractorFromData } from "node-unrar-js";

const BUCKET = env.MINIO_BUCKET;

const ALLOWED_EXTENSIONS = [".zip", ".rar"];
const ALLOWED_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
];

interface UploadProjectInput {
  studentId: string;
  name: string;
  file: File;
}

export class ProjectsService {
  /**
   * Check if a file is an allowed archive type.
   */
  static isAllowedArchive(file: File): boolean {
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );
    const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type);
    return hasValidExt || hasValidMime;
  }

  /**
   * Upload a project zip/rar to MinIO and create a DB record.
   */
  static async upload(input: UploadProjectInput) {
    const timestamp = Date.now();
    const ext = input.file.name.endsWith(".rar") ? "rar" : "zip";
    const minioPath = `submissions/${input.studentId}/${timestamp}/source.${ext}`;

    // Read file into buffer to calculate unzipped size
    const arrayBuf = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const fileSize = await this.calculateUnzippedSize(buffer, ext);

    // Upload to MinIO
    await MinioService.uploadFile(BUCKET, minioPath, input.file);

    // Create DB record with unzipped size
    const [project] = await db
      .insert(projects)
      .values({
        studentId: input.studentId,
        name: input.name,
        minioSourcePath: minioPath,
        fileSize,
      })
      .returning();

    return project!;
  }

  /**
   * Calculate the total unzipped size of an archive buffer.
   */
  static async calculateUnzippedSize(buffer: Buffer, ext: string): Promise<number> {
    try {
      if (ext === "rar") {
        const data = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer;
        const extractor = await createExtractorFromData({ data });
        const list = extractor.getFileList();
        let total = 0;
        for (const header of [...list.fileHeaders]) {
          if (!header.flags.directory) {
            total += header.unpSize;
          }
        }
        return total;
      } else {
        const zip = new AdmZip(buffer);
        let total = 0;
        for (const entry of zip.getEntries()) {
          if (!entry.isDirectory) {
            total += entry.header.size;
          }
        }
        return total;
      }
    } catch {
      // Fallback: return the compressed buffer size
      return buffer.byteLength;
    }
  }

  /**
   * List all projects belonging to a specific student.
   */
  static async listByStudent(studentId: string) {
    return db.query.projects.findMany({
      where: eq(projects.studentId, studentId),
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    });
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
   * Get a lab by its ID.
   */
  static async getLabById(labId: string) {
    return db.query.labs.findFirst({
      where: eq(labs.id, labId),
    });
  }

  // ─── Student-specific methods ──────────────

  /**
   * Get the student's section number from the users table.
   */
  static async getStudentSection(studentId: string): Promise<string | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, studentId),
      columns: { sectionNumber: true },
    });
    return user?.sectionNumber ?? null;
  }

  /**
   * Get labs assigned to the student's section.
   */
  static async getLabsForStudentSection(studentId: string) {
    const section = await this.getStudentSection(studentId);
    if (!section) return [];

    const allLabs = await db.query.labs.findMany({
      orderBy: [desc(labs.deadline)],
    });

    return allLabs.filter((lab) => {
      try {
        const labSections: string[] = JSON.parse(lab.sections);
        return labSections.includes(section);
      } catch {
        return false;
      }
    });
  }

  /**
   * Get classmates (students in the same section), excluding projects/grades.
   */
  static async getClassmates(studentId: string) {
    const section = await this.getStudentSection(studentId);
    if (!section) return [];

    return db.query.users.findMany({
      where: and(
        eq(users.role, "STUDENT"),
        eq(users.sectionNumber, section),
      ),
      columns: {
        id: true,
        name: true,
        email: true,
        sectionNumber: true,
        status: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });
  }

  /**
   * Get professors whose sections include the student's section.
   */
  static async getSectionProfessors(studentId: string) {
    const section = await this.getStudentSection(studentId);
    if (!section) return [];

    const allProfs = await db.query.users.findMany({
      where: eq(users.role, "PROFESSOR"),
      columns: { id: true, name: true, email: true, sections: true },
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    return allProfs.filter((prof) => {
      try {
        const profSections: string[] = prof.sections ? JSON.parse(prof.sections) : [];
        return profSections.includes(section);
      } catch {
        return false;
      }
    });
  }

  /**
   * Get student's own running projects.
   */
  static async listRunningByStudent(studentId: string) {
    return db.query.projects.findMany({
      where: and(
        eq(projects.studentId, studentId),
        eq(projects.status, "RUNNING"),
      ),
      orderBy: (projects, { desc }) => [desc(projects.lastActive)],
    });
  }

  /**
   * Submit a project to a specific lab. If the student already has a project
   * in this lab, the old project's archive is replaced and reused.
   * Returns the project.
   */
  static async submitToLab(input: UploadProjectInput & { labId: string }) {
    // Verify lab exists
    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, input.labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    // Check if student already has a project in this lab
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.studentId, input.studentId),
        eq(projects.labId, input.labId),
      ),
    });

    const timestamp = Date.now();
    const ext = input.file.name.endsWith(".rar") ? "rar" : "zip";
    const minioPath = `submissions/${input.studentId}/${timestamp}/source.${ext}`;

    const arrayBuf = await input.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const fileSize = await this.calculateUnzippedSize(buffer, ext);

    // Upload new archive to MinIO
    await MinioService.uploadFile(BUCKET, minioPath, input.file);

    if (existing) {
      // Replace existing project's archive
      const [updated] = await db
        .update(projects)
        .set({
          name: input.name,
          minioSourcePath: minioPath,
          fileSize,
          status: "STOPPED",
          url: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, existing.id))
        .returning();

      // Invalidate viewer cache so file explorer shows the new submission
      await ViewerService.invalidateCache(existing.id);

      return updated!;
    } else {
      // Create new project assigned to the lab
      const [project] = await db
        .insert(projects)
        .values({
          studentId: input.studentId,
          name: input.name,
          minioSourcePath: minioPath,
          fileSize,
          labId: input.labId,
        })
        .returning();
      return project!;
    }
  }

  /**
   * Delete a student's project.
   * Stops it if running, removes from MinIO, clears viewer cache, deletes DB record.
   */
  static async deleteProject(projectId: string, studentId: string) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new NotFoundError("Project not found");

    // Stop if running/starting
    if (project.status === "RUNNING" || project.status === "STARTING") {
      const { RunnerService } = await import("../runner/runner.service");
      await RunnerService.stopProject(studentId, projectId);
    }

    // Remove archive from MinIO
    if (project.minioSourcePath) {
      await MinioService.deleteFile(BUCKET, project.minioSourcePath).catch(() => {});
    }

    // Clear viewer cache
    await ViewerService.invalidateCache(projectId);

    // Delete DB record
    await db.delete(projects).where(eq(projects.id, projectId));
  }
}
