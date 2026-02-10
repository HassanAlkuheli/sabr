import { Elysia, t } from "elysia";
import { jwtPlugin } from "../../lib/auth";
import { authGuard } from "../../lib/auth";
import { sanitizeError } from "../../lib/errors";
import { AuthService } from "./auth.service";
import {
  studentRegisterBody,
  professorRegisterBody,
  loginBody,
} from "./auth.schema";

export const authController = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)

  // ──────── Student Registration ────────
  .post(
    "/register/student",
    async ({ body, set }) => {
      try {
        const user = await AuthService.registerStudent(body);
        set.status = 201;
        return { success: true, data: user };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      body: studentRegisterBody,
      detail: {
        summary: "Register Student",
        description:
          "Create a new student account. Section number must start with 'M'. " +
          "Account is immediately active.",
        tags: ["Auth"],
      },
    },
  )

  // ──────── Professor Registration ────────
  .post(
    "/register/professor",
    async ({ body, set }) => {
      try {
        const user = await AuthService.registerProfessor(body);
        set.status = 201;
        return {
          success: true,
          data: user,
          message: "Professor account created. You can sign in immediately.",
        };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      body: professorRegisterBody,
      detail: {
        summary: "Register Professor",
        description:
          "Create a new professor account. Account is active immediately. " +
          "Section access is assigned later by an admin.",
        tags: ["Auth"],
      },
    },
  )

  // ──────── Login (all roles) ────────
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      try {
        const user = await AuthService.login(body);
        const token = await jwt.sign({
          sub: user.id,
          role: user.role,
          email: user.email,
        });
        return { success: true, token, data: user };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      body: loginBody,
      detail: {
        summary: "Login",
        description:
          "Authenticate with email & password. Returns a JWT valid for 7 days. " +
          "Works for students, professors, and admins.",
        tags: ["Auth"],
      },
    },
  )

  // ──────── Update Own Profile (authenticated) ────────
  .use(authGuard)
  .patch(
    "/profile",
    async ({ userId, body, set }) => {
      try {
        const { AdminService } = await import("../admin/admin.service");
        const user = await AdminService.updateProfile(userId, body);
        return { success: true, data: user };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        password: t.Optional(t.String({ minLength: 6 })),
      }),
      detail: {
        summary: "Update Profile",
        description: "Update your own name and/or password.",
        tags: ["Auth"],
      },
    },
  );
