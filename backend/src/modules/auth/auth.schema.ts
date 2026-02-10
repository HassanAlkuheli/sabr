import { t } from "elysia";

// ──────── Request Bodies ────────

export const studentRegisterBody = t.Object(
  {
    name: t.String({ minLength: 1, description: "Full name of the student" }),
    email: t.String({ format: "email", description: "Institutional email" }),
    password: t.String({ minLength: 6, description: "Min 6 characters" }),
    sectionNumber: t.String({
      minLength: 1,
      description: "Section that starts with 'M', e.g. M102",
    }),
  },
  { description: "Student registration payload" },
);

export const professorRegisterBody = t.Object(
  {
    name: t.String({ minLength: 1, description: "Full name of the professor" }),
    email: t.String({ format: "email", description: "Institutional email" }),
    password: t.String({ minLength: 6, description: "Min 6 characters" }),
  },
  { description: "Professor registration payload" },
);

export const loginBody = t.Object(
  {
    email: t.String({ format: "email", description: "Registered email" }),
    password: t.String({ minLength: 1, description: "Account password" }),
  },
  { description: "Login credentials" },
);

// ──────── Response DTOs (for Swagger documentation) ────────

export const userDto = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
  email: t.String({ format: "email" }),
  role: t.Union([t.Literal("ADMIN"), t.Literal("PROFESSOR"), t.Literal("STUDENT")]),
  status: t.Union([t.Literal("ACTIVE"), t.Literal("SUSPENDED")]),
  sectionNumber: t.Union([t.String(), t.Null()]),
  sections: t.Union([t.String(), t.Null()]),
});

export const errorResponse = t.Object({
  success: t.Literal(false),
  message: t.String(),
});

export const tokenResponse = t.Object({
  success: t.Literal(true),
  token: t.String(),
  data: userDto,
});

export const messageResponse = t.Object({
  success: t.Literal(true),
  message: t.String(),
});
