import { Elysia } from "elysia";
import { adminGuard } from "../../lib/auth";
import { sanitizeError } from "../../lib/errors";
import { AdminService } from "./admin.service";
import { LabService } from "../labs/lab.service";
import {
  assignSectionsBody,
  setStatusBody,
  userIdParam,
  professorIdParam,
  sectionBody,
  updateStudentSectionBody,
  studentIdParam,
  updateProfileBody,
} from "./admin.schema";

export const adminController = new Elysia({ prefix: "/admin" })
  .use(adminGuard)

  // ──────── List all professors ────────
  .get(
    "/professors",
    async ({ set }) => {
      try {
        const professors = await AdminService.listProfessors();
        return { success: true, data: professors };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Professors",
        description: "List all professor accounts with their section assignments.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── List all students ────────
  .get(
    "/students",
    async ({ set }) => {
      try {
        const students = await AdminService.listStudents();
        return { success: true, data: students };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Students",
        description: "List all student accounts with their section numbers.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── List all projects (admin overview) ────────
  .get(
    "/projects",
    async ({ set }) => {
      try {
        const data = await AdminService.listAllProjects();
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List All Projects",
        description:
          "List every project across all sections, joined with student info. " +
          "Used by the admin dashboard.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── List running projects ────────
  .get(
    "/projects/running",
    async ({ set }) => {
      try {
        const data = await AdminService.listRunningProjects();
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Running Projects",
        description:
          "List all currently-running projects with student info and timing data.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── Get all distinct sections ────────
  .get(
    "/sections",
    async ({ set }) => {
      try {
        const data = await AdminService.getAllSections();
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List All Sections",
        description: "Get every distinct student section number.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── Assign Sections to a Professor ────────
  .put(
    "/professors/:professorId/sections",
    async ({ params, body, set }) => {
      try {
        const professor = await AdminService.assignProfessorSections(
          params.professorId,
          body.sections,
        );
        return { success: true, data: professor };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: professorIdParam,
      body: assignSectionsBody,
      detail: {
        summary: "Assign Professor Sections",
        description:
          "Set which student sections a professor can view. " +
          'Replaces any existing assignment. Pass [] to revoke all access.',
        tags: ["Admin"],
      },
    },
  )

  // ──────── Add a single section to a professor ────────
  .post(
    "/professors/:professorId/sections/add",
    async ({ params, body, set }) => {
      try {
        const professor = await AdminService.addProfessorSection(
          params.professorId,
          body.section,
        );
        return { success: true, data: professor };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: professorIdParam,
      body: sectionBody,
      detail: {
        summary: "Add Professor Section",
        description: "Add a single section to a professor's viewable list.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── Remove a single section from a professor ────────
  .post(
    "/professors/:professorId/sections/remove",
    async ({ params, body, set }) => {
      try {
        const professor = await AdminService.removeProfessorSection(
          params.professorId,
          body.section,
        );
        return { success: true, data: professor };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: professorIdParam,
      body: sectionBody,
      detail: {
        summary: "Remove Professor Section",
        description: "Remove a single section from a professor's viewable list.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── Suspend / Reactivate a User ────────
  .patch(
    "/users/:userId/status",
    async ({ params, body, set }) => {
      try {
        const user = await AdminService.setUserStatus(params.userId, body.status);
        return { success: true, data: user };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: userIdParam,
      body: setStatusBody,
      detail: {
        summary: "Set User Status",
        description:
          "Suspend or reactivate a student or professor account. " +
          "Admins cannot be suspended.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── Update Student Section ────────
  .patch(
    "/students/:studentId/section",
    async ({ params, body, set }) => {
      try {
        const student = await AdminService.updateStudentSection(
          params.studentId,
          body.sectionNumber,
        );
        return { success: true, data: student };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: studentIdParam,
      body: updateStudentSectionBody,
      detail: {
        summary: "Update Student Section",
        description: "Change a student's section number.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── Update Profile ────────
  .patch(
    "/users/:userId/profile",
    async ({ params, body, set }) => {
      try {
        const user = await AdminService.updateProfile(params.userId, body);
        return { success: true, data: user };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      params: userIdParam,
      body: updateProfileBody,
      detail: {
        summary: "Update Profile",
        description: "Update user name and/or password.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── List ALL Labs (admin overview) ────────
  .get(
    "/labs",
    async ({ set }) => {
      try {
        const data = await LabService.listAllLabs();
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List All Labs",
        description: "List every lab across all sections with professor info.",
        tags: ["Admin"],
      },
    },
  )

  // ──────── List ALL projects with grades (admin overview) ────────
  .get(
    "/projects/grades",
    async ({ set }) => {
      try {
        const data = await LabService.listAllProjectsWithGrades();
        return { success: true, data };
      } catch (err) {
        const { message, statusCode } = sanitizeError(err);
        set.status = statusCode;
        return { success: false, message };
      }
    },
    {
      detail: {
        summary: "List Projects with Grades",
        description: "List all projects with their grade and lab assignment info.",
        tags: ["Admin"],
      },
    },
  );
