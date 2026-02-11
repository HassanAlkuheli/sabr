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
import { projects, labs, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { ViewerService } from "../viewer/viewer.service";
import { AppError, NotFoundError } from "../../lib/errors";
import { env } from "../../config/env";

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
  screenshots?: string[]; // base64 thumbnails (optional)
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
  }> {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new NotFoundError("Project not found");

    return {
      result: (project.aiScanResult as AiScanResult) ?? null,
      scannedAt: project.aiScanAt ?? null,
      deepResult: (project.deepScanResult as DeepScanResult) ?? null,
      deepScannedAt: project.deepScanAt ?? null,
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

    return scanResult;
  }

  // ════════════════════════════════════════════
  //  Deep Scan (browser-based behavioral test)
  // ════════════════════════════════════════════

  /**
   * Deep scan: fetches the deployed project's HTML, discovers links/buttons/forms,
   * then asks the LLM to evaluate the page behavior against the lab requirements.
   * Does NOT require a headless browser — uses HTTP fetch + DOM parsing via LLM.
   */
  static async deepScanProject(projectId: string): Promise<DeepScanResult> {
    // ── Fetch project + lab ──
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (!project) throw new NotFoundError("Project not found");
    if (!project.labId) throw new AppError("Project is not assigned to a lab");
    if (!project.url) throw new AppError("Project must be deployed (running) to perform a deep scan");
    if (project.status !== "RUNNING") throw new AppError("Project must be running to perform a deep scan");

    const lab = await db.query.labs.findFirst({
      where: eq(labs.id, project.labId),
    });
    if (!lab) throw new NotFoundError("Lab not found");

    // ── Fetch the deployed pages ──
    const pages: { url: string; html: string; status: number }[] = [];
    const visited = new Set<string>();
    const baseUrl = project.url.replace(/\/$/, "");

    // Fetch main page
    const mainPage = await fetchPage(baseUrl);
    pages.push(mainPage);
    visited.add(baseUrl);

    // Discover internal links from the main page (max 5 additional pages)
    const links = extractLinks(mainPage.html, baseUrl);
    for (const link of links.slice(0, 5)) {
      if (visited.has(link)) continue;
      visited.add(link);
      try {
        const page = await fetchPage(link);
        pages.push(page);
      } catch {
        // Skip unreachable pages
      }
    }

    // ── Build page summaries for LLM ──
    const pageSummaries = pages.map((p) => {
      // Trim HTML to keep within token limits (keep first 8000 chars per page)
      const trimmedHtml = p.html.length > 8000
        ? p.html.slice(0, 8000) + "\n... [truncated]"
        : p.html;
      return `--- ${p.url} (HTTP ${p.status}) ---\n${trimmedHtml}`;
    }).join("\n\n");

    // ── Build prompt ──
    const systemPrompt = `You are an expert web application tester and university lab grading assistant.
You are given the HTML content of a deployed student web project and the lab requirements.
Your job is to evaluate the BEHAVIOR and FUNCTIONALITY of the deployed site.

Analyze:
1. Does the main page load correctly (HTTP 200, has content)?
2. Are there any visible errors in the HTML (broken tags, missing resources, error messages)?
3. Check interactive elements (forms, buttons, links, navigation) — do they appear functional?
4. Does the page structure match what the lab requirements expect?
5. Are required pages/routes present and reachable?

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "matchPercentage": <number 0-100>,
  "summary": "<2-3 sentence behavioral assessment>",
  "pageLoads": <boolean - does the main page load with content?>,
  "consoleErrors": ["<any error messages found in the HTML>", ...],
  "interactiveTests": [
    { "description": "<what was tested>", "passed": <boolean>, "details": "<result details>" },
    ...
  ],
  "missingBehaviors": ["<expected behaviors from lab requirements that are missing>", ...]
}

Be thorough. Check forms, navigation, links, images, responsive design hints, and JavaScript inclusion.`;

    const userPrompt = `## Lab: ${lab.name}

### Lab Requirements:
${lab.description || "No description provided."}

### Max Grade: ${lab.maxGrade}

### Deployed Pages (${pages.length} pages crawled):
${pageSummaries}

Analyze the deployed behavior against the lab requirements.`;

    // ── Call LLM ──
    const model = AiService.getModel(3000);
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    // ── Parse ──
    const text = typeof response.content === "string" ? response.content : String(response.content);
    let deepResult: DeepScanResult;

    try {
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      deepResult = {
        matchPercentage: Math.max(0, Math.min(100, Number(parsed.matchPercentage) || 0)),
        summary: String(parsed.summary || "Deep scan complete."),
        pageLoads: Boolean(parsed.pageLoads),
        consoleErrors: Array.isArray(parsed.consoleErrors) ? parsed.consoleErrors.map(String) : [],
        interactiveTests: Array.isArray(parsed.interactiveTests)
          ? parsed.interactiveTests.map((t: any) => ({
              description: String(t.description || ""),
              passed: Boolean(t.passed),
              details: String(t.details || ""),
            }))
          : [],
        missingBehaviors: Array.isArray(parsed.missingBehaviors) ? parsed.missingBehaviors.map(String) : [],
      };
    } catch {
      deepResult = {
        matchPercentage: 0,
        summary: text.slice(0, 500),
        pageLoads: false,
        consoleErrors: ["Could not parse AI response"],
        interactiveTests: [],
        missingBehaviors: [],
      };
    }

    // ── Persist to DB ──
    await db
      .update(projects)
      .set({ deepScanResult: deepResult, deepScanAt: new Date(), updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return deepResult;
  }
}

// ── Helper: fetch a page's HTML ──
async function fetchPage(url: string): Promise<{ url: string; html: string; status: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SabrDeepScan/1.0" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const html = await res.text();
    return { url, html: html.slice(0, 50000), status: res.status };
  } catch {
    return { url, html: "", status: 0 };
  }
}

// ── Helper: extract internal links from HTML ──
function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    let href = match[1]!;
    // Skip external, mailto, tel, javascript links
    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    if (href.startsWith("http") && !href.startsWith(baseUrl)) continue;
    // Resolve relative URLs
    if (!href.startsWith("http")) {
      href = href.startsWith("/") ? `${baseUrl}${href}` : `${baseUrl}/${href}`;
    }
    // Remove query strings and fragments
    href = href.split("?")[0]!.split("#")[0]!;
    if (!links.includes(href)) links.push(href);
  }
  return links;
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
