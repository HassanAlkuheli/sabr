/**
 * AI Scan Service — Uses OpenAI (via LangChain) to analyze student project files
 * and compare them against lab requirements.
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

// ── Service ──────────────────────────────────
export class AiService {
  private static getModel() {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError("AI scanning is not configured. Please set OPENAI_API_KEY.", 503);
    }
    return new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 2000,
      openAIApiKey: apiKey,
    });
  }

  /**
   * Scan a project's files against its lab requirements.
   * Extracts key files, sends them to GPT with the lab description,
   * and returns a structured analysis.
   */
  static async scanProject(projectId: string): Promise<AiScanResult> {
    // ── Fetch project + lab + student ──
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
    const filesToScan = collectScanFiles(structure, "");
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

    try {
      // Strip any markdown code fences if present
      const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      const result = JSON.parse(cleaned) as AiScanResult;

      // Validate structure
      return {
        matchPercentage: Math.max(0, Math.min(100, Number(result.matchPercentage) || 0)),
        summary: String(result.summary || "Analysis complete."),
        strengths: Array.isArray(result.strengths) ? result.strengths.map(String) : [],
        improvements: Array.isArray(result.improvements) ? result.improvements.map(String) : [],
        missingRequirements: Array.isArray(result.missingRequirements) ? result.missingRequirements.map(String) : [],
      };
    } catch {
      // If JSON parsing fails, return a best-effort result
      return {
        matchPercentage: 0,
        summary: text.slice(0, 500),
        strengths: [],
        improvements: ["Could not parse AI response — please try again"],
        missingRequirements: [],
      };
    }
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
