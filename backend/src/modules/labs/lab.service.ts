import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../../db";
import { labs, projects, users } from "../../db/schema";
import { AppError, NotFoundError } from "../../lib/errors";

export class LabService {
  // ─── Lab CRUD ─────────────────────────────

  /** Create a new lab (professor-scoped). */
  static async createLab(professorId: string, input: {
    name: string;
    description?: string;
    deadline: string;
    maxGrade: number;
    sections: string[];
  }) {
    const [lab] = await db
      .insert(labs)
      .values({
        professorId,
        name: input.name,
        description: input.description ?? null,
        deadline: new Date(input.deadline),
        maxGrade: input.maxGrade,
        sections: JSON.stringify(input.sections),
      })
      .returning();

    return lab!;
  }

  /** Update an existing lab. */
  static async updateLab(labId: string, input: {
    name?: string;
    description?: string;
    deadline?: string;
    maxGrade?: number;
    sections?: string[];
  }) {
    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (input.name) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.deadline) updates.deadline = new Date(input.deadline);
    if (input.maxGrade) updates.maxGrade = input.maxGrade;
    if (input.sections) updates.sections = JSON.stringify(input.sections);

    const [updated] = await db
      .update(labs)
      .set(updates)
      .where(eq(labs.id, labId))
      .returning();

    return updated!;
  }

  /** Delete a lab. */
  static async deleteLab(labId: string) {
    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    // Unassign all projects from this lab before deleting
    await db
      .update(projects)
      .set({ labId: null, updatedAt: new Date() })
      .where(eq(projects.labId, labId));

    await db.delete(labs).where(eq(labs.id, labId));
    return { success: true };
  }

  /** List labs for a professor (by their sections). */
  static async listLabsByProfessor(professorId: string) {
    return db.query.labs.findMany({
      where: eq(labs.professorId, professorId),
      orderBy: [desc(labs.deadline)],
    });
  }

  /** List labs for specific sections (professor view). 
   *  Returns labs whose sections JSON array overlaps with the given sections. */
  static async listLabsBySections(sectionNumbers: string[]) {
    if (!sectionNumbers.length) return [];
    const allLabs = await db.query.labs.findMany({
      orderBy: [desc(labs.deadline)],
    });
    // Filter: lab.sections (JSON array) must overlap with the requested sections
    return allLabs.filter(lab => {
      try {
        const labSections: string[] = JSON.parse(lab.sections);
        return labSections.some(s => sectionNumbers.includes(s));
      } catch {
        return false;
      }
    });
  }

  /** List ALL labs (admin view) with professor info. */
  static async listAllLabs() {
    return db
      .select({
        id: labs.id,
        name: labs.name,
        description: labs.description,
        deadline: labs.deadline,
        maxGrade: labs.maxGrade,
        sections: labs.sections,
        attachments: labs.attachments,
        createdAt: labs.createdAt,
        updatedAt: labs.updatedAt,
        professorId: labs.professorId,
        professorName: users.name,
        professorEmail: users.email,
      })
      .from(labs)
      .innerJoin(users, eq(labs.professorId, users.id))
      .orderBy(desc(labs.deadline));
  }

  // ─── Grading ──────────────────────────────

  /** Grade a project (or send feedback message). */
  static async gradeProject(
    projectId: string,
    professorId: string,
    input: { grade?: number; gradeMessage?: string },
  ) {
    // Get the project with student info to verify professor has access
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: { student: true, lab: true },
    });

    if (!project) throw new NotFoundError("Project not found");

    // Verify grade doesn't exceed max if lab is assigned
    if (input.grade !== undefined && project.lab) {
      if (input.grade > project.lab.maxGrade) {
        throw new AppError(
          `Grade ${input.grade} exceeds max grade ${project.lab.maxGrade} for lab "${project.lab.name}"`,
        );
      }
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (input.grade !== undefined) updates.grade = input.grade;
    if (input.gradeMessage !== undefined) updates.gradeMessage = input.gradeMessage;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, projectId))
      .returning();

    return updated!;
  }

  /** Assign a project to a lab. Checks that the lab deadline hasn't passed. */
  static async assignProjectToLab(projectId: string, labId: string) {
    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    const [updated] = await db
      .update(projects)
      .set({ labId, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    return updated!;
  }

  /** Unassign a project from its lab. */
  static async unassignProjectFromLab(projectId: string) {
    const [updated] = await db
      .update(projects)
      .set({ labId: null, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();

    return updated!;
  }

  /** Assign a lab to ALL projects in its sections. */
  static async assignLabToSection(labId: string) {
    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    // Parse lab sections
    let labSections: string[] = [];
    try { labSections = JSON.parse(lab.sections); } catch { /* ignore */ }
    if (!labSections.length) return { count: 0 };

    // Get all student IDs in these sections
    const sectionStudents = await db.query.users.findMany({
      where: and(eq(users.role, "STUDENT"), inArray(users.sectionNumber, labSections)),
      columns: { id: true },
    });

    if (!sectionStudents.length) return { count: 0 };

    const studentIds = sectionStudents.map((s) => s.id);

    // Assign all projects from these students to this lab
    const result = await db
      .update(projects)
      .set({ labId, updatedAt: new Date() })
      .where(inArray(projects.studentId, studentIds))
      .returning({ id: projects.id });

    return { count: result.length };
  }

  /** List professors whose sections overlap with the given sections. */
  static async listProfessorsBySections(sectionNumbers: string[]) {
    if (!sectionNumbers.length) return [];

    // Get all professors
    const allProfs = await db.query.users.findMany({
      where: eq(users.role, "PROFESSOR"),
      columns: { id: true, name: true, email: true, role: true, status: true, sections: true, createdAt: true },
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    // Filter to only those sharing at least one section
    return allProfs.filter((prof) => {
      let profSections: string[] = [];
      try {
        profSections = prof.sections ? JSON.parse(prof.sections) : [];
      } catch {
        return false;
      }
      return profSections.some((s) => sectionNumbers.includes(s));
    });
  }

  // ─── Professor-scoped queries ─────────────

  /** List projects for sections the professor manages, with lab & student info. */
  static async listProjectsBySections(sectionNumbers: string[]) {
    if (!sectionNumbers.length) return [];

    return db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        url: projects.url,
        fileSize: projects.fileSize,
        lastActive: projects.lastActive,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        studentId: projects.studentId,
        studentName: users.name,
        studentEmail: users.email,
        sectionNumber: users.sectionNumber,
        labId: projects.labId,
        grade: projects.grade,
        gradeMessage: projects.gradeMessage,
        aiPredictedGrade: projects.aiPredictedGrade,
        errorMessage: projects.errorMessage,
      })
      .from(projects)
      .innerJoin(users, eq(projects.studentId, users.id))
      .where(inArray(users.sectionNumber, sectionNumbers))
      .orderBy(desc(projects.createdAt));
  }

  /** List students for sections the professor manages (with projects). */
  static async listStudentsBySections(sectionNumbers: string[]) {
    if (!sectionNumbers.length) return [];

    const students = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sectionNumber: users.sectionNumber,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "STUDENT"),
          inArray(users.sectionNumber, sectionNumbers),
        ),
      )
      .orderBy(asc(users.name));

    if (!students.length) return [];

    const studentIds = students.map((s) => s.id);
    const allProjects = await db
      .select()
      .from(projects)
      .where(inArray(projects.studentId, studentIds))
      .orderBy(desc(projects.createdAt));

    return students.map((student) => ({
      ...student,
      projects: allProjects.filter((p) => p.studentId === student.id),
    }));
  }

  /** List running projects for sections the professor manages. */
  static async listRunningProjectsBySections(sectionNumbers: string[]) {
    if (!sectionNumbers.length) return [];

    return db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        url: projects.url,
        fileSize: projects.fileSize,
        lastActive: projects.lastActive,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        studentId: projects.studentId,
        studentName: users.name,
        studentEmail: users.email,
        sectionNumber: users.sectionNumber,
        labId: projects.labId,
        grade: projects.grade,
        gradeMessage: projects.gradeMessage,
        aiPredictedGrade: projects.aiPredictedGrade,
        errorMessage: projects.errorMessage,
      })
      .from(projects)
      .innerJoin(users, eq(projects.studentId, users.id))
      .where(
        and(
          eq(projects.status, "RUNNING"),
          inArray(users.sectionNumber, sectionNumbers),
        ),
      )
      .orderBy(desc(projects.lastActive));
  }

  /** Get all projects with grades (admin view). */
  static async listAllProjectsWithGrades() {
    return db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        url: projects.url,
        fileSize: projects.fileSize,
        lastActive: projects.lastActive,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        studentId: projects.studentId,
        studentName: users.name,
        studentEmail: users.email,
        sectionNumber: users.sectionNumber,
        labId: projects.labId,
        grade: projects.grade,
        gradeMessage: projects.gradeMessage,
        aiPredictedGrade: projects.aiPredictedGrade,
        errorMessage: projects.errorMessage,
      })
      .from(projects)
      .innerJoin(users, eq(projects.studentId, users.id))
      .orderBy(desc(projects.createdAt));
  }
}
