import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppError } from "../../lib/errors";

// ──────── Types ────────

interface StudentRegisterInput {
  name: string;
  email: string;
  password: string;
  sectionNumber: string;
}

interface ProfessorRegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

// ──────── Service ────────

export class AuthService {
  /**
   * Register a new student.
   * Section number must start with "M".
   * Status is ACTIVE immediately.
   */
  static async registerStudent(input: StudentRegisterInput) {
    if (!input.sectionNumber.startsWith("M")) {
      throw new AppError("Section number must start with the letter 'M' (e.g. M102)");
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const hashedPassword = await Bun.password.hash(input.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: "STUDENT",
        status: "ACTIVE",
        sectionNumber: input.sectionNumber,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sectionNumber: users.sectionNumber,
        sections: users.sections,
      });

    return user!;
  }

  /**
   * Register a new professor.
   * Status is ACTIVE immediately – professors can sign in right away.
   * Section access is managed by admin via /admin/professors/:id/sections.
   */
  static async registerProfessor(input: ProfessorRegisterInput) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existing) {
      throw new AppError("Email already registered", 409);
    }

    const hashedPassword = await Bun.password.hash(input.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: "PROFESSOR",
        status: "ACTIVE",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        sections: users.sections,
      });

    return user!;
  }

  /**
   * Login: validates credentials & checks suspension status.
   * Works for all roles (STUDENT, PROFESSOR, ADMIN).
   */
  static async login(input: LoginInput) {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const valid = await Bun.password.verify(input.password, user.password);
    if (!valid) {
      throw new AppError("Invalid email or password", 401);
    }

    if (user.status === "SUSPENDED") {
      throw new AppError("Account has been suspended", 403);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      sectionNumber: user.sectionNumber,
      sections: user.sections,
    };
  }
}
