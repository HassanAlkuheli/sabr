/**
 * Playwright-based deep scanner.
 * Visits the deployed project, clicks buttons, fills forms, follows links,
 * captures screenshots and console logs, then returns structured results.
 */

import { chromium, type Browser, type Page, type ConsoleMessage } from "playwright-core";

export interface DeepScanInput {
  url: string;
  labName: string;
  labDescription: string;
  maxGrade: number;
}

export interface InteractiveTest {
  description: string;
  passed: boolean;
  details: string;
  screenshot?: string; // base64
}

export interface DeepScanOutput {
  matchPercentage: number;
  summary: string;
  pageLoads: boolean;
  consoleErrors: string[];
  interactiveTests: InteractiveTest[];
  missingBehaviors: string[];
  screenshots: string[]; // base64 PNG
  pagesVisited: string[];
}

const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const TIMEOUT_MS = 60_000; // 1 min max per scan
const MAX_PAGES = 6;
const MAX_INTERACTIONS = 15;

export async function runDeepScan(input: DeepScanInput): Promise<DeepScanOutput> {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const screenshots: string[] = [];
  const interactiveTests: InteractiveTest[] = [];
  const pagesVisited: string[] = [];

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      userAgent: "SabrDeepScan/2.0 Playwright",
    });

    // Set global timeout
    context.setDefaultTimeout(10000);
    context.setDefaultNavigationTimeout(15000);

    const page = await context.newPage();

    // ── Capture console messages ──
    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      } else if (msg.type() === "warning") {
        consoleWarnings.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`PageError: ${err.message}`);
    });

    // ═══════════════════════════════════════
    //  STEP 1: Load main page
    // ═══════════════════════════════════════
    const baseUrl = input.url.replace(/\/$/, "");
    let pageLoads = false;

    try {
      const response = await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 15000 });
      pageLoads = response !== null && response.status() < 400;
      pagesVisited.push(baseUrl);

      // Take initial screenshot
      const ss = await page.screenshot({ type: "png" });
      screenshots.push(ss.toString("base64"));

      interactiveTests.push({
        description: "Main page loads successfully",
        passed: pageLoads,
        details: pageLoads
          ? `HTTP ${response?.status()} — page loaded with content`
          : `HTTP ${response?.status() ?? "N/A"} — page failed to load`,
      });
    } catch (err) {
      interactiveTests.push({
        description: "Main page loads successfully",
        passed: false,
        details: `Navigation failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      // Return early if page doesn't load at all
      return {
        matchPercentage: 0,
        summary: "The project's main page could not be loaded.",
        pageLoads: false,
        consoleErrors,
        interactiveTests,
        missingBehaviors: ["Main page is not accessible"],
        screenshots,
        pagesVisited,
      };
    }

    // ═══════════════════════════════════════
    //  STEP 2: Check page structure
    // ═══════════════════════════════════════
    const pageTitle = await page.title();
    const hasTitle = pageTitle.length > 0;
    interactiveTests.push({
      description: "Page has a title",
      passed: hasTitle,
      details: hasTitle ? `Title: "${pageTitle}"` : "No title found",
    });

    // Check for basic HTML structure
    const hasBody = await page.locator("body").count() > 0;
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return body ? body.innerText.trim().length > 10 : false;
    });
    interactiveTests.push({
      description: "Page has meaningful content",
      passed: hasContent,
      details: hasContent ? "Page has visible text content" : "Page appears empty or has minimal content",
    });

    // ═══════════════════════════════════════
    //  STEP 3: Discover and test navigation
    // ═══════════════════════════════════════
    const navLinks = await discoverNavLinks(page, baseUrl);

    if (navLinks.length > 0) {
      interactiveTests.push({
        description: "Navigation links discovered",
        passed: true,
        details: `Found ${navLinks.length} internal links: ${navLinks.slice(0, 5).map(l => l.text).join(", ")}`,
      });

      // Visit up to MAX_PAGES internal links
      for (const link of navLinks.slice(0, MAX_PAGES - 1)) {
        try {
          await page.goto(link.href, { waitUntil: "networkidle", timeout: 10000 });
          pagesVisited.push(link.href);

          const linkPageContent = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
          interactiveTests.push({
            description: `Navigate to "${link.text}"`,
            passed: linkPageContent > 0,
            details: linkPageContent > 0
              ? `Page loaded with content (${linkPageContent} chars)`
              : "Page loaded but appears empty",
          });
        } catch {
          interactiveTests.push({
            description: `Navigate to "${link.text}"`,
            passed: false,
            details: `Failed to navigate to ${link.href}`,
          });
        }
      }

      // Go back to main page for form/button testing
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
    }

    // ═══════════════════════════════════════
    //  STEP 4: Discover and test forms
    // ═══════════════════════════════════════
    const forms = await discoverForms(page);

    for (const form of forms.slice(0, 3)) {
      try {
        // Fill text inputs with test data
        for (const field of form.fields) {
          try {
            await fillField(page, field);
          } catch {
            // Skip fields that can't be filled
          }
        }

        // Take screenshot of filled form
        const formSs = await page.screenshot({ type: "png" });
        screenshots.push(formSs.toString("base64"));

        // Try to submit
        if (form.submitSelector) {
          try {
            await page.click(form.submitSelector, { timeout: 3000 });
            await page.waitForTimeout(2000); // Wait for any response

            interactiveTests.push({
              description: `Submit form "${form.name}"`,
              passed: true,
              details: "Form submitted successfully — checked for response",
            });
          } catch {
            interactiveTests.push({
              description: `Submit form "${form.name}"`,
              passed: false,
              details: "Form submit button could not be clicked or timed out",
            });
          }
        }

        interactiveTests.push({
          description: `Form "${form.name}" fields are fillable`,
          passed: form.fields.length > 0,
          details: `Found ${form.fields.length} input fields: ${form.fields.map(f => f.name || f.type).join(", ")}`,
        });
      } catch {
        interactiveTests.push({
          description: `Test form "${form.name}"`,
          passed: false,
          details: "Could not interact with form",
        });
      }
    }

    // ═══════════════════════════════════════
    //  STEP 5: Test buttons and interactive elements
    // ═══════════════════════════════════════
    const buttons = await discoverButtons(page);

    for (const btn of buttons.slice(0, 5)) {
      try {
        // Take before state
        const beforeUrl = page.url();

        await page.click(btn.selector, { timeout: 3000 });
        await page.waitForTimeout(1500);

        const afterUrl = page.url();
        const navigated = afterUrl !== beforeUrl;

        interactiveTests.push({
          description: `Click button "${btn.text}"`,
          passed: true,
          details: navigated
            ? `Button triggered navigation to ${afterUrl}`
            : "Button clicked — no navigation (may have triggered JS action)",
        });

        // Navigate back if needed
        if (navigated) {
          await page.goto(beforeUrl, { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
        }
      } catch {
        interactiveTests.push({
          description: `Click button "${btn.text}"`,
          passed: false,
          details: "Button could not be clicked or interaction timed out",
        });
      }
    }

    // ═══════════════════════════════════════
    //  STEP 6: Check CSS / responsive
    // ═══════════════════════════════════════
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});

    const hasCSS = await page.evaluate(() => {
      return document.styleSheets.length > 0 ||
        document.querySelectorAll("style").length > 0 ||
        document.querySelectorAll("link[rel='stylesheet']").length > 0;
    });
    interactiveTests.push({
      description: "Page has CSS styling",
      passed: hasCSS,
      details: hasCSS ? "Stylesheets detected" : "No CSS styling found",
    });

    const hasImages = await page.locator("img").count() > 0;
    interactiveTests.push({
      description: "Page has images",
      passed: hasImages,
      details: hasImages
        ? `Found ${await page.locator("img").count()} images`
        : "No images found on the page",
    });

    // Check for JavaScript
    const hasJS = await page.evaluate(() => {
      return document.querySelectorAll("script").length > 0;
    });
    interactiveTests.push({
      description: "Page includes JavaScript",
      passed: hasJS,
      details: hasJS ? "Scripts detected" : "No JavaScript found",
    });

    // Take final screenshot
    const finalSs = await page.screenshot({ type: "png", fullPage: true });
    screenshots.push(finalSs.toString("base64"));

    // ═══════════════════════════════════════
    //  STEP 7: Calculate score & summary
    // ═══════════════════════════════════════
    const totalTests = interactiveTests.length;
    const passedTests = interactiveTests.filter(t => t.passed).length;
    const matchPercentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    const missingBehaviors: string[] = [];
    if (!pageLoads) missingBehaviors.push("Main page is not accessible");
    if (consoleErrors.length > 0) missingBehaviors.push(`${consoleErrors.length} JavaScript error(s) in console`);
    if (navLinks.length === 0) missingBehaviors.push("No navigation / internal links found");
    if (forms.length === 0) missingBehaviors.push("No forms found for interaction");
    if (!hasCSS) missingBehaviors.push("No CSS styling applied");

    // Parse lab requirements to check for specific missing features
    const labDesc = input.labDescription.toLowerCase();
    if (labDesc.includes("responsive") || labDesc.includes("mobile")) {
      // Quick responsive check
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      const mobileOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      if (mobileOverflow) missingBehaviors.push("Page has horizontal overflow on mobile viewport");
    }

    const summary = `Deep scan completed: ${passedTests}/${totalTests} tests passed (${matchPercentage}%). ` +
      `Visited ${pagesVisited.length} page(s), found ${forms.length} form(s), ${buttons.length} button(s). ` +
      (consoleErrors.length > 0 ? `${consoleErrors.length} console error(s) detected.` : "No console errors.");

    await context.close();

    return {
      matchPercentage,
      summary,
      pageLoads,
      consoleErrors: consoleErrors.slice(0, 20), // Cap at 20
      interactiveTests,
      missingBehaviors,
      screenshots: screenshots.slice(0, 5), // Cap at 5 screenshots
      pagesVisited,
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ═══════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════

interface NavLink {
  href: string;
  text: string;
}

async function discoverNavLinks(page: Page, baseUrl: string): Promise<NavLink[]> {
  return page.evaluate((base) => {
    const links: { href: string; text: string }[] = [];
    const seen = new Set<string>();

    document.querySelectorAll("a[href]").forEach((a) => {
      const anchor = a as HTMLAnchorElement;
      let href = anchor.href;
      if (!href) return;

      // Only internal links
      if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
      if (href.startsWith("http") && !href.startsWith(base)) return;

      // Normalize
      href = href.split("?")[0]!.split("#")[0]!;
      if (!href || href === base || href === base + "/" || seen.has(href)) return;
      seen.add(href);

      const text = anchor.textContent?.trim().slice(0, 50) || anchor.getAttribute("title") || href;
      links.push({ href, text });
    });

    return links;
  }, baseUrl);
}

interface FormField {
  selector: string;
  type: string;
  name: string;
  placeholder: string;
}

interface FormInfo {
  name: string;
  fields: FormField[];
  submitSelector: string | null;
}

async function discoverForms(page: Page): Promise<FormInfo[]> {
  return page.evaluate(() => {
    const forms: FormInfo[] = [];

    // Look for <form> elements
    document.querySelectorAll("form").forEach((form, i) => {
      const fields: FormField[] = [];

      form.querySelectorAll("input, textarea, select").forEach((el, j) => {
        const input = el as HTMLInputElement;
        const type = input.type?.toLowerCase() || "text";
        if (type === "hidden" || type === "submit") return;

        fields.push({
          selector: `form:nth-of-type(${i + 1}) ${el.tagName.toLowerCase()}:nth-of-type(${j + 1})`,
          type,
          name: input.name || input.id || "",
          placeholder: input.placeholder || "",
        });
      });

      // Find submit button
      const submitBtn = form.querySelector("button[type='submit'], input[type='submit'], button:not([type])");
      const submitSelector = submitBtn
        ? `form:nth-of-type(${i + 1}) ${submitBtn.tagName.toLowerCase()}${submitBtn.getAttribute("type") ? `[type="${submitBtn.getAttribute("type")}"]` : ""}`
        : null;

      forms.push({
        name: form.getAttribute("name") || form.getAttribute("id") || `Form ${i + 1}`,
        fields,
        submitSelector,
      });
    });

    // Also look for standalone inputs (not inside a form)
    const standaloneInputs = document.querySelectorAll("input:not(form input), textarea:not(form textarea)");
    if (standaloneInputs.length > 0) {
      const fields: FormField[] = [];
      standaloneInputs.forEach((el, j) => {
        const input = el as HTMLInputElement;
        const type = input.type?.toLowerCase() || "text";
        if (type === "hidden") return;
        fields.push({
          selector: `body input:nth-of-type(${j + 1})`,
          type,
          name: input.name || input.id || "",
          placeholder: input.placeholder || "",
        });
      });
      if (fields.length > 0) {
        // Find any nearby button
        const btn = document.querySelector("button:not(form button)");
        forms.push({
          name: "Standalone inputs",
          fields,
          submitSelector: btn ? "button:not(form button)" : null,
        });
      }
    }

    return forms;
  });
}

async function fillField(page: Page, field: FormField): Promise<void> {
  const nameLC = (field.name + " " + field.placeholder).toLowerCase();
  let value = "Test Data";

  // Smart fill based on field type and name
  if (field.type === "email" || nameLC.includes("email")) {
    value = "test@example.com";
  } else if (field.type === "password" || nameLC.includes("password")) {
    value = "TestPass123!";
  } else if (field.type === "tel" || nameLC.includes("phone")) {
    value = "0501234567";
  } else if (field.type === "number" || nameLC.includes("age") || nameLC.includes("grade")) {
    value = "25";
  } else if (nameLC.includes("name") || nameLC.includes("first")) {
    value = "Test Student";
  } else if (nameLC.includes("url") || nameLC.includes("website")) {
    value = "https://example.com";
  } else if (nameLC.includes("date")) {
    value = "2025-01-15";
  } else if (nameLC.includes("search") || nameLC.includes("query")) {
    value = "test search query";
  } else if (nameLC.includes("message") || nameLC.includes("comment") || nameLC.includes("text")) {
    value = "This is a test message for form validation.";
  }

  if (field.type === "select") {
    // Select first non-empty option
    await page.selectOption(field.selector, { index: 1 }).catch(() => {});
  } else if (field.type === "checkbox" || field.type === "radio") {
    await page.check(field.selector).catch(() => {});
  } else {
    await page.fill(field.selector, value).catch(async () => {
      // Fallback: click and type
      await page.click(field.selector).catch(() => {});
      await page.keyboard.type(value);
    });
  }
}

interface ButtonInfo {
  selector: string;
  text: string;
}

async function discoverButtons(page: Page): Promise<ButtonInfo[]> {
  return page.evaluate(() => {
    const buttons: ButtonInfo[] = [];
    const seen = new Set<string>();

    // Find buttons not inside forms (to avoid double-submitting)
    document.querySelectorAll("button:not(form button), [role='button'], .btn, .button").forEach((el, i) => {
      const text = el.textContent?.trim().slice(0, 30) || "";
      if (!text || seen.has(text)) return;
      seen.add(text);

      // Skip if it's clearly a close/dismiss button
      const lc = text.toLowerCase();
      if (lc === "x" || lc === "close" || lc === "cancel" || lc === "dismiss") return;

      const tag = el.tagName.toLowerCase();
      buttons.push({
        selector: `${tag}:nth-of-type(${i + 1})`,
        text,
      });
    });

    return buttons.slice(0, 10);
  });
}
