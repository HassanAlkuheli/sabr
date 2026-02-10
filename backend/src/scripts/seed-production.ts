/**
 * Production Seed Script
 *
 * Creates the professor, student, 10 labs (matching the real university course),
 * and uploads the real student .rar submissions from src/scripts/labs/.
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
import { resolve, dirname } from "path";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

// Hardcoded default for production ease (as requested)
const SEED_PASSWORD = process.env.SEED_PASSWORD || "password123";

const BUCKET = env.MINIO_BUCKET;

// Path to the real .rar lab files bundled into the Docker image
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LABS_DIR = resolve(__dirname, "labs");

async function hash(plain: string) {
  return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
}

// ── Lab index → .rar filename mapping ─────────────────
// 10 labs total (lab 9+10 is combined into one)
const LAB_FILES: Record<number, string> = {
  1: "lab1.rar",
  2: "lab2.rar",
  3: "lab3.rar",
  4: "lab4.rar",
  5: "lab5.rar",
  6: "lab6.rar",
  7: "lab7.rar",
  8: "lab8.rar",
  9: "lab9-10.rar",
  10: "lab11.rar",
};

function loadLabRar(labIndex: number): Buffer {
  const filename = LAB_FILES[labIndex];
  if (!filename) throw new Error(`No .rar file mapped for lab index ${labIndex}`);
  const filePath = resolve(LABS_DIR, filename);
  if (!existsSync(filePath)) throw new Error(`Lab file not found: ${filePath}`);
  return readFileSync(filePath);
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

// Labs matching the real university course descriptions from allLabs.md
const LABS = [
  {
    name: "Lab 1 – Introduction to HTML5",
    description: "Use VS Code to write an HTML document. Use basic tags for titles, headings, paragraphs, lists, links, images, and tables. Create a registration page, add a table with caption and colspan, and a work schedule section with internal links.",
    maxGrade: 10,
  },
  {
    name: "Lab 2 – Building a Web Form",
    description: "Construct forms using inputs, selects, radio buttons, checkboxes, and text areas. Create a form with name, age, birthdate, color, email, password, gender, education level, agree checkbox, and submit button. Set form action with GET and POST methods.",
    maxGrade: 10,
  },
  {
    name: "Lab 3 – Introduction to CSS3",
    description: "Understand the purpose of CSS. Build an HTML5 page structure using article, section, and aside tags. Create a navigation bar, article with sections, aside with products list. Apply CSS rules for colors, inline lists, floating layout, hover effects.",
    maxGrade: 15,
  },
  {
    name: "Lab 4 – Bootstrap CSS Library",
    description: "Implement a complete homepage using Bootstrap: navbar with internal links, image slider, jumbotron, rows with services, image gallery with hover enlarging effect, staff rounded images, email section, and contact details.",
    maxGrade: 15,
  },
  {
    name: "Lab 5 – JavaScript and DOM",
    description: "Gain extensive understanding of JavaScript and DOM. Implement a Pizza ordering page, calculate total on button click. Use debugger, insert breakpoints, and trace code step-by-step.",
    maxGrade: 15,
  },
  {
    name: "Lab 6 – Form Validation using JS",
    description: "Deeper understanding of JavaScript form validation. Create a login page with SweetAlert error messages, a registration form with name, password, confirm password, checkbox. Validate password match, checkbox, and password strength.",
    maxGrade: 15,
  },
  {
    name: "Lab 7 – jQuery",
    description: "Apply jQuery effects: slide, hide, uppercase conversion. Convert text to uppercase on input, show div with fade-in effect, slide toggle on button click.",
    maxGrade: 20,
  },
  {
    name: "Lab 8 – Web API",
    description: "Understand and implement Web APIs. Create catalog page with books.txt JSON, fetch and display using Bootstrap cards. Build search page, shopping cart with add/delete/total, Remember Me login with localStorage, and Google Maps API.",
    maxGrade: 20,
  },
  {
    name: "Lab 9+10 – Back-End Node.js Development",
    description: "Develop back-end with Node.js. Create MySQL books table, install express/mysql/cors. Implement index, insert, delete, search/update, and buy pages. Add image field to book table and update pages accordingly.",
    maxGrade: 30,
  },
  {
    name: "Lab 11 – Node.js (Part 2)",
    description: "Advanced Node.js topics: sessions and authentication. Create management page with modal effects, registration page with users table, login page using sessions. Secure buy page for customers and manage page for admin.",
    maxGrade: 50,
  },
];

// ── Seed ────────────────────────────────────
async function seed() {
  console.log("🌱 Starting production seed...\n");
  console.log("  📁 Labs directory: " + LABS_DIR);
  console.log("  📁 Labs exist: " + existsSync(LABS_DIR));

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
  // Delete existing projects so we always seed fresh real content
  for (const lab of labRecords) {
    const existing = await db.query.projects.findFirst({
      where: eq(projects.labId, lab.id),
    });
    if (existing) {
      await db.delete(projects).where(eq(projects.id, existing.id));
      console.log("  🗑  Deleted old project for: " + lab.name);
    }
  }

  let projCount = 0;
  for (let i = 0; i < labRecords.length; i++) {
    const lab = labRecords[i]!;
    const labIndex = i + 1; // 1-based

    const projName = lab.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const timestamp = Date.now();
    // Upload as .rar so the runner detects RAR format and uses node-unrar-js
    const minioPath = `submissions/${student!.id}/${timestamp}/source.rar`;

    // Load the real .rar file from disk
    const rarBuffer = loadLabRar(labIndex);
    console.log(`  📦 Loaded ${LAB_FILES[labIndex]} (${rarBuffer.byteLength} bytes)`);

    try {
      await MinioService.uploadFile(BUCKET, minioPath, rarBuffer);
    } catch (err) {
      console.warn("  ⚠️  MinIO upload failed for " + lab.name + ": " + err);
    }

    await db.insert(projects).values({
      studentId: student!.id,
      name: projName,
      labId: lab.id,
      minioSourcePath: minioPath,
      fileSize: rarBuffer.byteLength,
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
