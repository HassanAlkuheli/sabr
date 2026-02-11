import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { AppError } from "../../lib/errors";
import { sendPasswordResetEmail } from "../../lib/email";

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

  // ─── Password Reset ─────────────────────────

  /**
   * Generate a reset token and email it. Always returns success
   * to prevent email enumeration attacks.
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Silently return — don't reveal whether email exists
      return;
    }

    // Generate a cryptographic random token
    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();

    // Hash the token before storing (so DB compromise doesn't leak tokens)
    const hashedToken = await Bun.password.hash(rawToken, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Store hashed token + 1-hour expiry
    await db
      .update(users)
      .set({
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Send email with the raw token
    await sendPasswordResetEmail(user.email, rawToken);
  }

  /**
   * Reset password using a valid token.
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find users with non-expired reset tokens
    const allUsers = await db.query.users.findMany({
      where: (u, { isNotNull }) => isNotNull(u.resetToken),
    });

    // Find the user whose stored hashed token matches
    let matchedUser: typeof allUsers[0] | null = null;
    for (const u of allUsers) {
      if (!u.resetToken || !u.resetTokenExpiry) continue;
      if (new Date() > u.resetTokenExpiry) continue; // expired

      const valid = await Bun.password.verify(token, u.resetToken);
      if (valid) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    const hashedPassword = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, matchedUser.id));
  }
}
