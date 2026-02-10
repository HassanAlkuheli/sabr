import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { users, projects } from "../../db/schema";
import { AppError, NotFoundError } from "../../lib/errors";

export class AdminService {
  /**
   * List all professors.
   */
  static async listProfessors() {
    return db.query.users.findMany({
      where: eq(users.role, "PROFESSOR"),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        sections: true,
        createdAt: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });
  }

  /**
   * List all students (with their projects).
   */
  static async listStudents() {
    return db.query.users.findMany({
      where: eq(users.role, "STUDENT"),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        sectionNumber: true,
        createdAt: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
      with: {
        projects: true,
      },
    });
  }

  /**
   * List all projects joined with their owning student's info.
   */
  static async listAllProjects() {
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
        errorMessage: projects.errorMessage,
      })
      .from(projects)
      .innerJoin(users, eq(projects.studentId, users.id))
      .orderBy(desc(projects.createdAt));
  }

  /**
   * List only currently-running projects with student info.
   */
  static async listRunningProjects() {
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
        errorMessage: projects.errorMessage,
      })
      .from(projects)
      .innerJoin(users, eq(projects.studentId, users.id))
      .where(eq(projects.status, "RUNNING"))
      .orderBy(desc(projects.lastActive));
  }

  /**
   * Return every distinct section number found on student rows.
   */
  static async getAllSections(): Promise<string[]> {
    const rows = await db
      .selectDistinct({ sectionNumber: users.sectionNumber })
      .from(users)
      .where(
        and(
          eq(users.role, "STUDENT"),
          sql`${users.sectionNumber} IS NOT NULL`,
        ),
      )
      .orderBy(users.sectionNumber);

    return rows
      .map((r) => r.sectionNumber)
      .filter((s): s is string => s !== null);
  }

  /**
   * Assign sections a professor can view.
   * `sections` is an array of section codes like ["M102", "M103"].
   */
  static async assignProfessorSections(
    professorId: string,
    sections: string[],
  ) {
    const professor = await db.query.users.findFirst({
      where: and(eq(users.id, professorId), eq(users.role, "PROFESSOR")),
    });

    if (!professor) {
      throw new NotFoundError("Professor not found");
    }

    for (const s of sections) {
      if (!s.startsWith("M")) {
        throw new AppError(
          `Invalid section "${s}". Sections must start with 'M' (e.g. M102)`,
        );
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        sections: JSON.stringify(sections),
        updatedAt: new Date(),
      })
      .where(eq(users.id, professorId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sections: users.sections,
      });

    return updated!;
  }

  /**
   * Add a single section to a professor's viewable list.
   */
  static async addProfessorSection(professorId: string, section: string) {
    const professor = await db.query.users.findFirst({
      where: and(eq(users.id, professorId), eq(users.role, "PROFESSOR")),
    });

    if (!professor) throw new NotFoundError("Professor not found");

    if (!section.startsWith("M")) {
      throw new AppError(
        `Invalid section "${section}". Sections must start with 'M' (e.g. M102)`,
      );
    }

    const existing = this.parseSections(professor.sections);
    if (!existing.includes(section)) {
      existing.push(section);
      existing.sort();
    }

    const [updated] = await db
      .update(users)
      .set({ sections: JSON.stringify(existing), updatedAt: new Date() })
      .where(eq(users.id, professorId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sections: users.sections,
      });

    return updated!;
  }

  /**
   * Remove a single section from a professor's viewable list.
   */
  static async removeProfessorSection(professorId: string, section: string) {
    const professor = await db.query.users.findFirst({
      where: and(eq(users.id, professorId), eq(users.role, "PROFESSOR")),
    });

    if (!professor) throw new NotFoundError("Professor not found");

    const existing = this.parseSections(professor.sections);
    const filtered = existing.filter((s) => s !== section);

    const [updated] = await db
      .update(users)
      .set({ sections: JSON.stringify(filtered), updatedAt: new Date() })
      .where(eq(users.id, professorId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sections: users.sections,
      });

    return updated!;
  }

  /**
   * Get the sections assigned to a professor (parsed array).
   */
  static parseSections(sectionsJson: string | null): string[] {
    if (!sectionsJson) return [];
    try {
      return JSON.parse(sectionsJson);
    } catch {
      return [];
    }
  }

  /**
   * Suspend or reactivate a user.
   */
  static async setUserStatus(
    userId: string,
    status: "ACTIVE" | "SUSPENDED",
  ) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) throw new NotFoundError("User not found");
    if (user.role === "ADMIN") throw new AppError("Cannot modify admin status");

    const [updated] = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      });

    return updated!;
  }

  /**
   * Update a student's section number.
   */
  static async updateStudentSection(studentId: string, sectionNumber: string) {
    const student = await db.query.users.findFirst({
      where: and(eq(users.id, studentId), eq(users.role, "STUDENT")),
    });

    if (!student) throw new NotFoundError("Student not found");

    if (!sectionNumber.startsWith("M")) {
      throw new AppError(
        `Invalid section "${sectionNumber}". Sections must start with 'M' (e.g. M102)`,
      );
    }

    const [updated] = await db
      .update(users)
      .set({ sectionNumber, updatedAt: new Date() })
      .where(eq(users.id, studentId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sectionNumber: users.sectionNumber,
      });

    return updated!;
  }

  /**
   * Update a user's profile (name and/or password).
   */
  static async updateProfile(
    userId: string,
    input: { name?: string; password?: string },
  ) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) throw new NotFoundError("User not found");

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (input.name?.trim()) {
      updates.name = input.name.trim();
    }

    if (input.password) {
      updates.password = await Bun.password.hash(input.password, {
        algorithm: "bcrypt",
        cost: 10,
      });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sectionNumber: users.sectionNumber,
        sections: users.sections,
      });

    return updated!;
  }
}
