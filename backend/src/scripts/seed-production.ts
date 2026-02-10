/**
 * Production Seed Script
 *
 * Creates the professor, student, 10 labs, and sample project submissions
 * needed for the initial production deployment.
 *
 * Required env vars:
 *   SEED_PASSWORD - password for professor and student accounts
 *
 * Usage:
 *   SEED_PASSWORD=xxx bun run src/scripts/seed-production.ts
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, labs, projects } from "../db/schema";
import { MinioService } from "../lib/minio";
import { env } from "../config/env";
import AdmZip from "adm-zip";

// Hardcoded default for production ease (as requested)
const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123";

const BUCKET = env.MINIO_BUCKET;

async function hash(plain: string) {
  return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
}

/** Create a minimal ZIP for a project submission */
function createProjectZip(name: string, labName: string): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    "index.html",
    Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${name}</title></head>
<body>
  <h1>${name}</h1>
  <p>Submitted for: ${labName}</p>
</body>
</html>`),
  );
  zip.addFile(
    "package.json",
    Buffer.from(
      JSON.stringify(
        { name, version: "1.0.0", scripts: { start: "npx serve ." } },
        null,
        2,
      ),
    ),
  );
  return zip.toBuffer();
}

// ── Data ────────────────────────────────────
const PROFESSOR = {
  name: "Abdulrahman Al-Qarafi",
  email: "AAl-Q@university.edu",
  sections: ["M4"],
};

const STUDENT = {
  name: "Hassan Alkuheli",
  email: "hask@gmail.com",
  section: "M4",
};

const LABS = [
  { name: "Lab 1 – Introduction to HTML", description: "Learn the basics of HTML structure, tags, and semantic elements. Create a simple web page.", maxGrade: 10 },
  { name: "Lab 2 – CSS Fundamentals", description: "Style your HTML pages using CSS selectors, properties, box model, and layout techniques.", maxGrade: 10 },
  { name: "Lab 3 – JavaScript Basics", description: "Introduction to JavaScript: variables, functions, DOM manipulation, and event handling.", maxGrade: 15 },
  { name: "Lab 4 – Node.js Basics", description: "Set up a Node.js project, use NPM, and create a simple HTTP server.", maxGrade: 15 },
  { name: "Lab 5 – Express.js Framework", description: "Build REST APIs using Express.js with routing, middleware, and error handling.", maxGrade: 15 },
  { name: "Lab 6 – MySQL Database", description: "Design and implement a relational database with MySQL. Write CRUD queries.", maxGrade: 15 },
  { name: "Lab 7 – RESTful APIs", description: "Connect Express.js to MySQL. Implement a full CRUD REST API with proper status codes.", maxGrade: 20 },
  { name: "Lab 8 – Frontend Frameworks (Vue.js)", description: "Build a reactive frontend using Vue.js components, directives, and state management.", maxGrade: 20 },
  { name: "Lab 9+10 – Full Stack Project", description: "Combine frontend and backend into a complete full-stack application with authentication.", maxGrade: 30 },
  { name: "Lab 11 – Final Project", description: "Capstone project demonstrating mastery of all course topics. Deployment-ready.", maxGrade: 50 },
];

// ── Seed ────────────────────────────────────
async function seed() {
  console.log("🌱 Starting production seed...\n");

  const hashedPw = await hash(SEED_PASSWORD!);

  // ── Professor ──
  let professor = await db.query.users.findFirst({
    where: eq(users.email, PROFESSOR.email),
  });
  if (!professor) {
    const [row] = await db
      .insert(users)
      .values({
        name: PROFESSOR.name,
        email: PROFESSOR.email,
        password: hashedPw,
        role: "PROFESSOR",
        status: "ACTIVE",
        sections: JSON.stringify(PROFESSOR.sections),
      })
      .returning();
    professor = row!;
    console.log("  ✅ Professor created: " + PROFESSOR.email);
  } else {
    console.log("  ⏭  Professor exists:  " + PROFESSOR.email);
  }

  // ── Student ──
  let student = await db.query.users.findFirst({
    where: eq(users.email, STUDENT.email),
  });
  if (!student) {
    const [row] = await db
      .insert(users)
      .values({
        name: STUDENT.name,
        email: STUDENT.email,
        password: hashedPw,
        role: "STUDENT",
        status: "ACTIVE",
        sectionNumber: STUDENT.section,
      })
      .returning();
    student = row!;
    console.log("  ✅ Student created:   " + STUDENT.email);
  } else {
    console.log("  ⏭  Student exists:    " + STUDENT.email);
  }

  // ── Labs ──
  const labRecords: { id: string; name: string }[] = [];
  for (const labData of LABS) {
    // Check if lab already exists (by name + professor)
    const existing = await db.query.labs.findFirst({
      where: eq(labs.name, labData.name),
    });
    if (existing) {
      labRecords.push({ id: existing.id, name: existing.name });
      console.log("  ⏭  Lab exists:       " + labData.name);
      continue;
    }

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 60); // 60 days from now

    const [row] = await db
      .insert(labs)
      .values({
        professorId: professor!.id,
        name: labData.name,
        description: labData.description,
        deadline,
        maxGrade: labData.maxGrade,
        sections: JSON.stringify(PROFESSOR.sections),
      })
      .returning({ id: labs.id, name: labs.name });
    labRecords.push({ id: row!.id, name: row!.name });
    console.log("  ✅ Lab created:       " + labData.name);
  }

  // ── Project Submissions (one per lab) ──
  let projCount = 0;
  for (const lab of labRecords) {
    // Check if student already has a project for this lab
    const existing = await db.query.projects.findFirst({
      where: eq(projects.labId, lab.id),
    });
    if (existing) {
      console.log("  ⏭  Project exists for: " + lab.name);
      continue;
    }

    const projName = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const timestamp = Date.now();
    const minioPath = `submissions/${student!.id}/${timestamp}/source.zip`;

    // Create and upload ZIP
    const zipBuffer = createProjectZip(projName, lab.name);
    try {
      await MinioService.uploadFile(BUCKET, minioPath, zipBuffer);
    } catch (err) {
      console.warn("  ⚠️  MinIO upload failed for " + lab.name + ": " + err);
    }

    await db.insert(projects).values({
      studentId: student!.id,
      name: projName,
      labId: lab.id,
      minioSourcePath: minioPath,
      fileSize: zipBuffer.byteLength,
      status: "STOPPED",
    });
    projCount++;
    console.log("  ✅ Project submitted: " + projName + " → " + lab.name);

    // Small delay to ensure unique timestamps
    await new Promise((r) => setTimeout(r, 50));
  }

  console.log("\n─────────────────────────────────");
  console.log("  Production Seed Summary:");
  console.log("   Professor : " + PROFESSOR.email);
  console.log("   Student   : " + STUDENT.email);
  console.log("   Labs      : " + labRecords.length);
  console.log("   Projects  : " + projCount + " new");
  console.log("─────────────────────────────────");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Production seed failed:", err);
  process.exit(1);
});
