import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { env } from "../config/env";
import { UnauthorizedError, ForbiddenError } from "./errors";

// ──────────────────────────────────────────────
//  JWT Plugin (shared so we sign/verify the same way everywhere)
// ──────────────────────────────────────────────

export const jwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({
    name: "jwt",
    secret: env.JWT_SECRET,
    exp: "7d",
  }),
);

// ──────────────────────────────────────────────
//  Helper: verify token and extract payload
// ──────────────────────────────────────────────

async function verifyToken(
  jwtInstance: { verify: (token: string) => Promise<any> },
  headers: Record<string, string | undefined>,
) {
  const authHeader = headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  const payload = await jwtInstance.verify(token);
  if (!payload) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  return {
    userId: payload.sub as string,
    userRole: payload.role as string,
  };
}

// ──────────────────────────────────────────────
//  Auth Guard – any authenticated user
// ──────────────────────────────────────────────

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }) => verifyToken(jwt, headers));

// ──────────────────────────────────────────────
//  Professor-or-Admin Guard
// ──────────────────────────────────────────────

export const professorOrAdminGuard = new Elysia({ name: "professor-or-admin-guard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    const ctx = await verifyToken(jwt, headers);
    if (ctx.userRole !== "PROFESSOR" && ctx.userRole !== "ADMIN") {
      throw new ForbiddenError("Only professors or admins can access this resource");
    }
    return ctx;
  });

// ──────────────────────────────────────────────
//  Admin-only Guard
// ──────────────────────────────────────────────

export const adminGuard = new Elysia({ name: "admin-guard" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    const ctx = await verifyToken(jwt, headers);
    if (ctx.userRole !== "ADMIN") {
      throw new ForbiddenError("Only admins can access this resource");
    }
    return ctx;
  });


