/**
 * Seed script - populates the database with demo professors, students, projects,
 * labs, and uploads actual ZIP files to MinIO.
 *
 * Usage:
 *   bun run src/scripts/seed-data.ts
 *
 * Run seed-admin.ts first to create the admin account.
 */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, projects, labs } from "../db/schema";
import { MinioService } from "../lib/minio";
import { env } from "../config/env";
import AdmZip from "adm-zip";

const PASSWORD = "password123";
const BUCKET = env.MINIO_BUCKET;

// --- Helpers ---

async function hash(plain: string) {
  return Bun.password.hash(plain, { algorithm: "bcrypt", cost: 10 });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(daysBack: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

/** Create a small in-memory ZIP archive with sample project files. */
function createProjectZip(projectName: string): Buffer {
  const zip = new AdmZip();

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>${projectName}</h1>
    <p>Welcome to the ${projectName} project.</p>
    <div id="app"></div>
  </div>
  <script src="app.js"></script>
</body>
</html>`;

  const cssContent = `* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}
.container {
  background: white;
  padding: 2rem 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  text-align: center;
  max-width: 600px;
}
h1 { color: #4a5568; margin-bottom: 1rem; }
p { color: #718096; line-height: 1.6; }
#app { margin-top: 1.5rem; }`;

  const jsContent = `// ${projectName} - Main Application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const counter = document.createElement('div');
  counter.innerHTML = '<p style="font-size: 2rem; font-weight: bold;">0</p>' +
    '<button onclick="increment()" style="padding: 0.5rem 1.5rem; margin: 0.5rem; cursor: pointer; border-radius: 6px; border: none; background: #667eea; color: white;">+</button>' +
    '<button onclick="decrement()" style="padding: 0.5rem 1.5rem; margin: 0.5rem; cursor: pointer; border-radius: 6px; border: none; background: #e53e3e; color: white;">-</button>';
  app.appendChild(counter);

  let count = 0;
  const display = counter.querySelector('p');
  window.increment = () => { count++; display.textContent = count; };
  window.decrement = () => { count--; display.textContent = count; };
  console.log('${projectName} loaded successfully!');
});`;

  const readmeContent = `# ${projectName}\n\nA sample web project for the Web Development course.\n\n## Features\n- Responsive design\n- Interactive counter\n- Clean CSS styling\n\n## How to Run\nOpen index.html in your browser.\n`;

  const packageJson = JSON.stringify({
    name: projectName,
    version: "1.0.0",
    description: projectName + " - Student project",
    main: "app.js",
    scripts: { start: "npx serve ." },
    keywords: ["web", "project"],
    license: "MIT",
  }, null, 2);

  zip.addFile("index.html", Buffer.from(htmlContent));
  zip.addFile("style.css", Buffer.from(cssContent));
  zip.addFile("app.js", Buffer.from(jsContent));
  zip.addFile("README.md", Buffer.from(readmeContent));
  zip.addFile("package.json", Buffer.from(packageJson));

  return zip.toBuffer();
}

// --- Data definitions ---

const SECTIONS = ["M101", "M102", "M103", "M104", "M105"];

const PROFESSOR_DATA = [
  { name: "Dr. Ahmad Al-Farouk", email: "ahmad.farouk@university.edu", sections: ["M101", "M102"] },
  { name: "Dr. Sara Mansour", email: "sara.mansour@university.edu", sections: ["M102", "M103"] },
  { name: "Dr. Omar Khalil", email: "omar.khalil@university.edu", sections: ["M103", "M104"] },
  { name: "Dr. Layla Hassan", email: "layla.hassan@university.edu", sections: ["M104", "M105"] },
  { name: "Dr. Yousef Darwish", email: "yousef.darwish@university.edu", sections: ["M101", "M105"] },
  { name: "Dr. Nadia Ibrahim", email: "nadia.ibrahim@university.edu", sections: ["M101", "M103", "M105"] },
];

const STUDENT_FIRST = [
  "Aya", "Zaid", "Lina", "Kareem", "Nour", "Hassan", "Reem", "Fadi",
  "Hana", "Sami", "Dina", "Tariq", "Mona", "Bilal", "Salma", "Khaled",
  "Yara", "Rami", "Jana", "Mazen", "Rania", "Amr", "Layal", "Omar",
  "Tala", "Waleed", "Zeina", "Ali", "Farah", "Ibrahim", "Mariam", "Nasser",
  "Lama", "Hamza", "Ghada", "Saeed", "Dalia", "Jawad", "Lubna", "Adel",
];

const STUDENT_LAST = [
  "Al-Ahmad", "Bishara", "Saleh", "Nasser", "Qasim", "Haddad", "Taha",
  "Issa", "Khoury", "Hamdan", "Abdallah", "Shahin", "Rajab", "Awad",
  "Mustafa", "Harb", "Younis", "Jabr", "Attar", "Ghanem",
];

const PROJECT_NAMES = [
  "portfolio-site", "weather-app", "todo-manager", "chat-room",
  "blog-engine", "recipe-book", "expense-tracker", "quiz-app",
  "music-player", "photo-gallery", "task-board", "note-keeper",
  "e-commerce-demo", "fitness-log", "calendar-app", "url-shortener",
  "markdown-editor", "file-sharer", "code-sandbox", "dashboard-ui",
  "booking-system", "inventory-mgr", "survey-builder", "news-feed",
  "social-wall", "kanban-board", "flashcard-app", "timer-widget",
  "voting-app", "landing-page",
];

const LAB_TEMPLATES = [
  { name: "Lab 1 - HTML & CSS Basics", description: "Create a simple personal portfolio page using only HTML and CSS.", maxGrade: 20 },
  { name: "Lab 2 - JavaScript Fundamentals", description: "Build a calculator app demonstrating core JS concepts.", maxGrade: 25 },
  { name: "Lab 3 - Responsive Design", description: "Convert a desktop layout into a fully responsive design using media queries.", maxGrade: 20 },
  { name: "Lab 4 - React Components", description: "Build an interactive to-do app with React components and state management.", maxGrade: 30 },
  { name: "Lab 5 - REST API Integration", description: "Fetch data from a public API and display it in a styled table.", maxGrade: 25 },
  { name: "Lab 6 - Full-Stack Project", description: "Create a full-stack CRUD application with a backend API and frontend UI.", maxGrade: 40 },
  { name: "Lab 7 - Database Design", description: "Design and implement a relational database schema with proper normalization.", maxGrade: 30 },
  { name: "Lab 8 - Final Project", description: "Capstone project demonstrating all skills learned throughout the semester.", maxGrade: 50 },
];

const GRADE_MESSAGES = [
  "Great work! Clean code and good structure.",
  "Needs improvement on error handling.",
  "Excellent UI design, well done!",
  "Missing some required features.",
  "Good effort, but the code needs refactoring.",
  "Perfect submission!",
  "Late submission penalty applied.",
  "Very creative approach to the problem.",
  "Please fix the responsive layout issues.",
  "Solid implementation, minor issues noted.",
];

// --- Seed function ---

async function seed() {
  console.log("  Starting data seed...\n");

  const hashedPw = await hash(PASSWORD);

  // -- Professors --

  let profCount = 0;
  for (const p of PROFESSOR_DATA) {
    const exists = await db.query.users.findFirst({ where: eq(users.email, p.email) });
    if (exists) {
      console.log("  Skip professor (exists): " + p.email);
      continue;
    }
    await db.insert(users).values({
      name: p.name,
      email: p.email,
      password: hashedPw,
      role: "PROFESSOR",
      status: "ACTIVE",
      sections: JSON.stringify(p.sections),
    });
    profCount++;
  }
  console.log("  Professors created: " + profCount + "\n");

  // -- Students --

  const studentRecords: { id: string; name: string; section: string }[] = [];
  let studentCount = 0;

  for (let i = 0; i < STUDENT_FIRST.length; i++) {
    const first = STUDENT_FIRST[i]!;
    const last = STUDENT_LAST[i % STUDENT_LAST.length]!;
    const name = first + " " + last;
    const email = first.toLowerCase() + "." + last.toLowerCase().replace("al-", "") + "@student.university.edu";
    const section = SECTIONS[i % SECTIONS.length]!;

    const exists = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (exists) {
      studentRecords.push({ id: exists.id, name, section });
      console.log("  Skip student (exists): " + email);
      continue;
    }

    const status = Math.random() < 0.9 ? "ACTIVE" : "SUSPENDED";
    const [row] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPw,
        role: "STUDENT",
        status,
        sectionNumber: section,
        createdAt: randomDate(90),
        updatedAt: new Date(),
      })
      .returning({ id: users.id });

    studentRecords.push({ id: row!.id, name, section });
    studentCount++;
  }
  console.log("  Students created: " + studentCount + "\n");

  // -- Projects (with MinIO uploads) --

  let projCount = 0;
  let uploadCount = 0;
  const usedNames = new Set<string>();
  const projectRecords: { id: string; studentId: string; section: string }[] = [];

  console.log("  Creating projects and uploading to MinIO...");

  for (const student of studentRecords) {
    const numProjects = 1 + Math.floor(Math.random() * 3);

    for (let j = 0; j < numProjects; j++) {
      let projName: string;
      let attempts = 0;
      do {
        projName = pick(PROJECT_NAMES);
        attempts++;
      } while (usedNames.has(student.id + ":" + projName) && attempts < 30);
      usedNames.add(student.id + ":" + projName);

      const rand = Math.random();
      const status = rand < 0.70 ? "STOPPED" : rand < 0.90 ? "RUNNING" : "ERROR";

      const createdAt = randomDate(60);
      const updatedAt = status === "RUNNING" ? randomDate(3) : createdAt;
      const url = status === "RUNNING" ? "http://" + projName + "-" + student.id.slice(0, 8) + "." + env.DEPLOY_DOMAIN : null;

      const timestamp = createdAt.getTime();
      const minioPath = "submissions/" + student.id + "/" + timestamp + "/source.zip";
      let fileSize = 0;

      try {
        const zipBuffer = createProjectZip(projName);
        await MinioService.uploadFile(BUCKET, minioPath, zipBuffer);
        fileSize = zipBuffer.byteLength;
        uploadCount++;
      } catch (err) {
        console.warn("  Warning: Failed to upload " + projName + " for " + student.name + ": " + err);
        fileSize = 50000 + Math.floor(Math.random() * 100000);
      }

      const [row] = await db
        .insert(projects)
        .values({
          studentId: student.id,
          name: projName,
          minioSourcePath: minioPath,
          fileSize,
          url,
          status,
          lastActive: status === "RUNNING" ? updatedAt : null,
          createdAt,
          updatedAt,
        })
        .returning({ id: projects.id });

      projectRecords.push({ id: row!.id, studentId: student.id, section: student.section });
      projCount++;

      if (projCount % 20 === 0) {
        console.log("  " + projCount + " projects created, " + uploadCount + " uploaded...");
      }
    }
  }

  console.log("  Projects created: " + projCount);
  console.log("  MinIO uploads: " + uploadCount + "\n");

  // -- Labs --

  const allProfs = await db.query.users.findMany({
    where: eq(users.role, "PROFESSOR"),
  });

  const labRecords: { id: string; sections: string[]; maxGrade: number }[] = [];
  let labCount = 0;

  for (const prof of allProfs) {
    const profSections: string[] = prof.sections ? JSON.parse(prof.sections) : [];
    if (!profSections.length) continue;

    const numLabs = 2 + Math.floor(Math.random() * 3);
    for (let l = 0; l < numLabs && l < LAB_TEMPLATES.length; l++) {
      const template = LAB_TEMPLATES[labCount % LAB_TEMPLATES.length]!;
      // Assign lab to 1-2 of the professor's sections
      const numSections = 1 + Math.floor(Math.random() * Math.min(2, profSections.length));
      const labSections = profSections.slice(0, numSections);

      const daysOffset = l < numLabs / 2 ? -(10 + Math.floor(Math.random() * 30)) : (5 + Math.floor(Math.random() * 60));
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + daysOffset);

      const [row] = await db
        .insert(labs)
        .values({
          professorId: prof.id,
          name: template.name,
          description: template.description,
          deadline,
          maxGrade: template.maxGrade,
          sections: JSON.stringify(labSections),
        })
        .returning({ id: labs.id });

      labRecords.push({ id: row!.id, sections: labSections, maxGrade: template.maxGrade });
      labCount++;
    }
  }
  console.log("  Labs created: " + labCount + "\n");

  // -- Assign labs & grades to some projects --

  let assignedCount = 0;
  let gradedCount = 0;

  for (const proj of projectRecords) {
    const sectionLabs = labRecords.filter((l) => l.sections.includes(proj.section));
    if (!sectionLabs.length) continue;

    if (Math.random() < 0.6) {
      const lab = pick(sectionLabs);
      const changes: Record<string, unknown> = { labId: lab.id };

      if (Math.random() < 0.5) {
        const grade = Math.floor(Math.random() * (lab.maxGrade + 1));
        changes.grade = grade;
        changes.gradeMessage = pick(GRADE_MESSAGES);
        gradedCount++;
      }

      await db
        .update(projects)
        .set(changes as any)
        .where(eq(projects.id, proj.id));
      assignedCount++;
    }
  }
  console.log("  Projects assigned to labs: " + assignedCount);
  console.log("  Projects graded: " + gradedCount + "\n");

  console.log("-----------------------------------");
  console.log("  Summary:");
  console.log("   Professors  : " + profCount);
  console.log("   Students    : " + studentCount);
  console.log("   Projects    : " + projCount);
  console.log("   MinIO files : " + uploadCount);
  console.log("   Labs        : " + labCount);
  console.log("   Assigned    : " + assignedCount);
  console.log("   Graded      : " + gradedCount);
  console.log("   Sections    : " + SECTIONS.join(", "));
  console.log("   Password    : " + PASSWORD + " (all accounts)");
  console.log("   MinIO bucket: " + BUCKET);
  console.log("-----------------------------------");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed: " + err);
  process.exit(1);
});
