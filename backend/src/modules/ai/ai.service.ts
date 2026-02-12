/**
 * AI Scan Service — Uses OpenAI (via LangChain) to analyze student project files
 * and compare them against lab requirements.
 *
 * Supports:
 *  - Code scan: static analysis of project files against lab requirements
 *  - Deep scan: browser-based behavioral testing of deployed projects
 *
 * Requires: OPENAI_API_KEY in environment
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { db } from "../../db";
import { projects, labs } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ViewerService } from "../viewer/viewer.service";
import { RunnerService } from "../runner/runner.service";
import { MinioService } from "../../lib/minio";
import { AppError, NotFoundError } from "../../lib/errors";
import { env } from "../../config/env";

const BUCKET = env.MINIO_BUCKET;

// ── Types ────────────────────────────────────
export interface AiScanResult {
  matchPercentage: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  missingRequirements: string[];
}

export interface DeepScanResult {
  matchPercentage: number;
  summary: string;
  pageLoads: boolean;
  consoleErrors: string[];
  interactiveTests: { description: string; passed: boolean; details: string }[];
  missingBehaviors: string[];
  screenshotPaths?: string[]; // MinIO paths for screenshots
  pagesVisited?: string[];
}

// ── Service ──────────────────────────────────
export class AiService {
  private static getModel(maxTokens = 2000) {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError("AI scanning is not configured. Please set OPENAI_API_KEY.", 503);
    }
    return new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens,
      openAIApiKey: apiKey,
    });
  }

  // ════════════════════════════════════════════
  //  Cached scan result (read from DB)
  // ════════════════════════════════════════════

  /**
   * Get the cached AI scan result for a project (if any).
   */
  static async getCachedScan(projectId: string): Promise<{
    result: AiScanResult | null;
    scannedAt: Date | null;
    deepResult: DeepScanResult | null;
    deepScannedAt: Date | null;
    predictedGrade: number | null;
    screenshotPaths: string[];
  }> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new NotFoundError("Project not found");

    const deepResult = (project.deepScanResult as DeepScanResult) ?? null;
    const screenshotPaths = (project.deepScanScreenshots as string[]) ?? [];

    // Attach screenshot paths to deep result
    if (deepResult) {
      deepResult.screenshotPaths = screenshotPaths;
    }

    return {
      result: (project.aiScanResult as AiScanResult) ?? null,
      scannedAt: project.aiScanAt ?? null,
      deepResult,
      deepScannedAt: project.deepScanAt ?? null,
      predictedGrade: project.predictedGrade ?? null,
      screenshotPaths,
    };
  }

  // ════════════════════════════════════════════
  //  Code Scan (file-based analysis)
  // ════════════════════════════════════════════

  /**
   * Scan a project's files against its lab requirements.
   * Extracts key files, sends them to GPT with the lab description,
   * and returns a structured analysis. Result is persisted to DB.
   */
  static async scanProject(projectId: string): Promise<AiScanResult> {
    // ── Fetch project + lab ──
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new NotFoundError("Project not found");
    if (!project.labId) throw new AppError("Project is not assigned to a lab");

    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, project.labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    // ── Extract project files via ViewerService ──
    let structure: any;
    try {
      structure = await ViewerService.getStructure(projectId);
    } catch {
      throw new AppError("Could not extract project files for scanning");
    }

    // Collect file contents (skip images, node_modules, large files)
    // ViewerService.getStructure returns an array of top-level nodes, not a single root node
    const filesToScan: string[] = [];
    const nodes = Array.isArray(structure) ? structure : [structure];
    for (const node of nodes) {
      filesToScan.push(...collectScanFiles(node, ""));
    }
    const fileContents: { path: string; content: string }[] = [];
    let totalChars = 0;
    const MAX_CHARS = 30000; // Stay within token limits

    for (const filePath of filesToScan) {
      if (totalChars >= MAX_CHARS) break;
      try {
        const result = await ViewerService.getFileContent(projectId, filePath);
        if (typeof result.content === "string" && result.content.length < 10000) {
          fileContents.push({ path: filePath, content: result.content });
          totalChars += result.content.length;
        }
      } catch {
        // Skip files that can't be read
      }
    }

    if (fileContents.length === 0) {
      throw new AppError("No scannable files found in project");
    }

    // ── Build prompt ──
    const filesText = fileContents
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n");

    const systemPrompt = `You are an expert university lab grading assistant. Analyze a student's web development project submission and compare it against the lab requirements.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "matchPercentage": <number 0-100>,
  "summary": "<brief 2-3 sentence overall assessment>",
  "strengths": ["<what the student did well>", ...],
  "improvements": ["<what needs improvement>", ...],
  "missingRequirements": ["<lab requirements not met>", ...]
}

Be specific and constructive. Reference actual file names and code when possible.`;

    const userPrompt = `## Lab: ${lab.name}

### Lab Requirements:
${lab.description || "No description provided."}

### Max Grade: ${lab.maxGrade}

### Student's Project Files:
${filesText}

Analyze how well this submission meets the lab requirements.`;

    // ── Call LLM ──
    const model = AiService.getModel();
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    // ── Parse response ──
    const text = typeof response.content === "string" ? response.content : String(response.content);
    let scanResult: AiScanResult;

    try {
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned) as AiScanResult;
      scanResult = {
        matchPercentage: Math.max(0, Math.min(100, Number(result.matchPercentage) || 0)),
        summary: String(result.summary || "Analysis complete."),
        strengths: Array.isArray(result.strengths) ? result.strengths.map(String) : [],
        improvements: Array.isArray(result.improvements) ? result.improvements.map(String) : [],
        missingRequirements: Array.isArray(result.missingRequirements) ? result.missingRequirements.map(String) : [],
      };
    } catch {
      scanResult = {
        matchPercentage: 0,
        summary: text.slice(0, 500),
        strengths: [],
        improvements: ["Could not parse AI response — please try again"],
        missingRequirements: [],
      };
    }

    // ── Persist to DB ──
    await db
      .update(projects)
      .set({ aiScanResult: scanResult, aiScanAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    // ── Compute predicted grade ──
    await AiService.computePredictedGrade(projectId, lab.maxGrade);

    return scanResult;
  }

  // ════════════════════════════════════════════
  //  Deep Scan (Playwright-based behavioral test)
  // ════════════════════════════════════════════

  /**
   * Deep scan using the Playwright worker:
   *  1. Auto-start the project if not running
   *  2. Call the Playwright worker to run browser-based tests
   *  3. Persist results to DB
   *  4. Auto-stop the project if it was stopped before scanning
   */
  static async deepScanProject(projectId: string): Promise<DeepScanResult> {
    // ── Fetch project + lab ──
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new NotFoundError("Project not found");
    if (!project.labId) throw new AppError("Project is not assigned to a lab");

    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, project.labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    // ── Auto-start project if not running ──
    const wasAlreadyRunning = project.status === "RUNNING";
    let projectUrl = project.url;

    if (!wasAlreadyRunning) {
      if (!project.minioSourcePath) {
        throw new AppError("No source file uploaded — cannot start project for deep scan");
      }

      console.log(`🔬 Deep scan: auto-starting project ${projectId}...`);
      try {
        const { url } = await RunnerService.deployProject(project.studentId, projectId);
        projectUrl = url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new AppError(`Could not start project for deep scan: ${msg}`);
      }

      // Wait for the project to be fully ready (Node.js + MySQL needs more time)
      const waitMs = project.projectType === "nodejs" ? 15000 : 8000;
      console.log(`🔬 Waiting ${waitMs / 1000}s for project to be ready...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (!projectUrl) {
      throw new AppError("Project has no URL — deploy may have failed");
    }

    // ── Call Playwright worker ──
    const workerUrl = env.WORKER_URL || "http://sabr-worker:3001";
    let deepResult: DeepScanResult;

    try {
      console.log(`🔬 Calling Playwright worker at ${workerUrl}/deep-scan for ${projectUrl}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000); // 3 min total timeout

      const workerResponse = await fetch(`${workerUrl}/deep-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: projectUrl,
          labName: lab.name,
          labDescription: lab.description || "",
          maxGrade: lab.maxGrade,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!workerResponse.ok) {
        const text = await workerResponse.text();
        throw new Error(`Worker returned ${workerResponse.status}: ${text}`);
      }

      const workerData = (await workerResponse.json()) as {
        success: boolean;
        data?: any;
        message?: string;
      };

      if (!workerData.success || !workerData.data) {
        throw new Error(workerData.message || "Worker returned no data");
      }

      const d = workerData.data;
      deepResult = {
        matchPercentage: Math.max(0, Math.min(100, Number(d.matchPercentage) || 0)),
        summary: String(d.summary || "Deep scan complete."),
        pageLoads: Boolean(d.pageLoads),
        consoleErrors: Array.isArray(d.consoleErrors) ? d.consoleErrors.map(String) : [],
        interactiveTests: Array.isArray(d.interactiveTests)
          ? d.interactiveTests.map((t: any) => ({
              description: String(t.description || ""),
              passed: Boolean(t.passed),
              details: String(t.details || ""),
            }))
          : [],
        missingBehaviors: Array.isArray(d.missingBehaviors) ? d.missingBehaviors.map(String) : [],
        pagesVisited: Array.isArray(d.pagesVisited) ? d.pagesVisited.map(String) : [],
      };

      // ── Store screenshots in MinIO ──
      const base64Screenshots: string[] = Array.isArray(d.screenshots) ? d.screenshots.slice(0, 5) : [];
      const screenshotPaths: string[] = [];
      for (let i = 0; i < base64Screenshots.length; i++) {
        try {
          const buf = Buffer.from(base64Screenshots[i], "base64");
          const path = `screenshots/${projectId}/${Date.now()}_${i}.png`;
          await MinioService.uploadFile(BUCKET, path, buf);
          screenshotPaths.push(path);
        } catch (err) {
          console.error(`⚠️ Failed to upload screenshot ${i}:`, err);
        }
      }
      deepResult.screenshotPaths = screenshotPaths;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("🔴 Playwright worker call failed:", msg);

      deepResult = {
        matchPercentage: 0,
        summary: `Deep scan failed: ${msg}`,
        pageLoads: false,
        consoleErrors: [],
        interactiveTests: [],
        missingBehaviors: ["Deep scan worker could not be reached or timed out"],
        pagesVisited: [],
      };
    }

    // ── Persist to DB ──
    await db
      .update(projects)
      .set({
        deepScanResult: deepResult,
        deepScanScreenshots: deepResult.screenshotPaths ?? [],
        deepScanAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // ── Compute predicted grade (uses both code + deep scan) ──
    try {
      const lab = await db.query.labs.findFirst({ where: eq(labs.id, project.labId), columns: { maxGrade: true } });
      if (lab) await AiService.computePredictedGrade(projectId, lab.maxGrade);
    } catch (err) {
      console.error("⚠️ Failed to compute predicted grade after deep scan:", err);
    }

    // ── Auto-stop if we started it ──
    if (!wasAlreadyRunning) {
      console.log(`🔬 Deep scan: auto-stopping project ${projectId}...`);
      try {
        await RunnerService.stopProject(project.studentId, projectId);
      } catch (err) {
        console.error("⚠️ Failed to auto-stop project after deep scan:", err);
      }
    }

    return deepResult;
  }

  /* ────────────────────────────────────────
   * Compute predicted grade from code+deep scan
   * ──────────────────────────────────────── */
  static async computePredictedGrade(projectId: string, maxGrade: number) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { codeScanResult: true, deepScanResult: true },
    });
    if (!project) return;

    const codePct = (project.codeScanResult as any)?.matchPercentage ?? null;
    const deepPct = (project.deepScanResult as any)?.matchPercentage ?? null;

    let finalPct: number;
    if (codePct !== null && deepPct !== null) {
      finalPct = codePct * 0.6 + deepPct * 0.4; // 60% code, 40% deep
    } else if (codePct !== null) {
      finalPct = codePct;
    } else if (deepPct !== null) {
      finalPct = deepPct;
    } else {
      return; // no data
    }

    const predictedGrade = Math.round((finalPct / 100) * maxGrade);
    await db
      .update(projects)
      .set({ predictedGrade, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
    console.log(`🎯 Predicted grade for ${projectId}: ${predictedGrade}/${maxGrade} (${finalPct.toFixed(1)}%)`);
  }

  /* ────────────────────────────────────────
   * Get screenshot buffer from MinIO
   * ──────────────────────────────────────── */
  static async getScreenshotBuffer(projectId: string, index: number): Promise<Buffer | null> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { deepScanScreenshots: true },
    });
    const paths = (project?.deepScanScreenshots as string[]) ?? [];
    if (index < 0 || index >= paths.length) return null;
    return MinioService.getFileBuffer(BUCKET, paths[index]);
  }
}

// ── Helper: recursively collect scannable file paths ──
function collectScanFiles(node: any, prefix: string): string[] {
  const paths: string[] = [];
  const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".angular"]);
  const SCAN_EXTS = new Set([
    ".html", ".htm", ".css", ".js", ".ts", ".jsx", ".tsx",
    ".json", ".sql", ".md", ".txt", ".env", ".yml", ".yaml",
    ".php", ".py", ".java",
  ]);
  const SKIP_FILES = new Set(["package-lock.json", "bun.lock", "yarn.lock"]);

  if (node.type === "file") {
    const fullPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (SKIP_FILES.has(node.name)) return paths;
    const ext = "." + node.name.split(".").pop()?.toLowerCase();
    if (SCAN_EXTS.has(ext)) {
      paths.push(fullPath);
    }
    return paths;
  }

  // Directory
  if (SKIP_DIRS.has(node.name)) return paths;
  const dirPath = prefix ? `${prefix}/${node.name}` : node.name;
  if (node.children) {
    for (const child of node.children) {
      paths.push(...collectScanFiles(child, dirPath));
    }
  }
  return paths;
}
