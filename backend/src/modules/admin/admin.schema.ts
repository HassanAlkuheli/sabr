import { t } from "elysia";

// ──────── Request Bodies ────────

export const assignSectionsBody = t.Object(
  {
    sections: t.Array(t.String({ minLength: 1 }), {
      minItems: 0,
      description:
        "Array of section codes the professor can view (e.g. ['M102','M103']). " +
        "Pass an empty array to remove all access.",
    }),
  },
  { description: "Assign viewable sections to a professor" },
);

export const setStatusBody = t.Object(
  {
    status: t.Union([t.Literal("ACTIVE"), t.Literal("SUSPENDED")], {
      description: "New account status",
    }),
  },
  { description: "Change user account status" },
);

export const sectionBody = t.Object(
  {
    section: t.String({ minLength: 1, description: "Section code (e.g. M102)" }),
  },
  { description: "Single section code" },
);

export const updateStudentSectionBody = t.Object(
  {
    sectionNumber: t.String({ minLength: 1, description: "Section code (e.g. M102)" }),
  },
  { description: "Update student section number" },
);

export const updateProfileBody = t.Object(
  {
    name: t.Optional(t.String({ minLength: 1, description: "New display name" })),
    password: t.Optional(t.String({ minLength: 6, description: "New password (min 6 chars)" })),
  },
  { description: "Update user profile" },
);

export const studentIdParam = t.Object({
  studentId: t.String({ format: "uuid", description: "Student UUID" }),
});

// ──────── Params ────────

export const userIdParam = t.Object({
  userId: t.String({ format: "uuid", description: "User UUID" }),
});

export const professorIdParam = t.Object({
  professorId: t.String({ format: "uuid", description: "Professor UUID" }),
});
