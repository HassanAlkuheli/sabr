import { t } from "elysia";

export const createLabBody = t.Object({
  name: t.String({ minLength: 1, description: "Lab name" }),
  description: t.Optional(t.String({ description: "Lab description" })),
  deadline: t.String({ description: "Deadline ISO date string" }),
  maxGrade: t.Number({ minimum: 1, description: "Maximum grade" }),
  sections: t.Array(t.String({ minLength: 1 }), { minItems: 1, description: "Section codes (e.g. ['M102','M103'])" }),
});

export const updateLabBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  deadline: t.Optional(t.String()),
  maxGrade: t.Optional(t.Number({ minimum: 1 })),
  sections: t.Optional(t.Array(t.String({ minLength: 1 }), { minItems: 1 })),
});

export const labIdParam = t.Object({
  labId: t.String({ format: "uuid", description: "Lab UUID" }),
});

export const gradeProjectBody = t.Object({
  grade: t.Optional(t.Number({ minimum: 0, description: "Grade value" })),
  gradeMessage: t.Optional(t.String({ description: "Feedback message" })),
});

export const assignLabBody = t.Object({
  labId: t.String({ format: "uuid", description: "Lab UUID to assign" }),
});

export const projectIdParam = t.Object({
  projectId: t.String({ format: "uuid", description: "Project UUID" }),
});
