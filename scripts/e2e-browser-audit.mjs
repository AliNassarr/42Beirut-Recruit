import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const CHROME_PATH = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

console.log("Using browser binary at:", CHROME_PATH);

async function runFullAudit() {
  const auditReport = {
    step1: {},
    step2: {},
    persistence: {},
    step3: {},
    step4: {},
    printCSS: {},
    consoleErrors: [],
    consoleWarnings: [],
    visualFindings: [],
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") {
      auditReport.consoleErrors.push(text);
      console.error("  [Console ERROR]:", text);
    } else if (type === "warning") {
      auditReport.consoleWarnings.push(text);
    }
  });

  page.on("pageerror", (err) => {
    auditReport.consoleErrors.push(err.message);
    console.error("  [PageError]:", err.message);
  });

  try {
    // =========================================================================
    // 1. AUTH & INGESTION (STEP 1)
    // =========================================================================
    console.log("\n==============================================================");
    console.log("[CHECKPOINT 1] Step 1: Auth & Ingestion");
    console.log("==============================================================");

    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    // Inspect Breadcrumbs visual state
    const breadcrumbData = await page.evaluate(() => {
      const nav = document.querySelector("nav[aria-label='Wizard Progress']");
      if (!nav) return null;
      const stepButtons = Array.from(nav.querySelectorAll("button")).map((b) => ({
        text: b.innerText.replace(/\n+/g, " "),
        disabled: b.disabled,
        isActive: b.classList.contains("border-cyan-400/50"),
      }));
      const autosaveBadge = nav.querySelector(".bg-slate-950\\/80")?.textContent?.trim();
      const hasResetBtn = Array.from(nav.querySelectorAll("button")).some((b) => b.textContent?.includes("Reset"));
      return { stepButtons, autosaveBadge, hasResetBtn };
    });

    console.log("✓ Breadcrumbs detected. Active step:", breadcrumbData?.stepButtons.find((b) => b.isActive)?.text);
    console.log("✓ Autosave Badge:", breadcrumbData?.autosaveBadge);
    console.log("✓ Reset Draft button present:", breadcrumbData?.hasResetBtn);
    auditReport.step1.breadcrumbs = breadcrumbData;

    await page.screenshot({ path: "test/screenshots/01-step1-auth.png", fullPage: true });

    // Click "Quick Start with Developer Profile" to advance to Step 2
    console.log("Advancing to Step 2 via Cadet Profile Quick Start...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const qs = btns.find((b) => b.innerText.includes("Quick Start"));
      if (qs) qs.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // =========================================================================
    // 2. SETUP & EXPERIENCE (STEP 2)
    // =========================================================================
    console.log("\n==============================================================");
    console.log("[CHECKPOINT 2] Step 2: Setup, Experience & Skills Breakdown");
    console.log("==============================================================");

    const step2Details = await page.evaluate(() => {
      const dropzone = Boolean(document.querySelector("input#cv-file-upload"));
      const nameInput = document.querySelector("input[placeholder*='Mohammad Hamdan']")?.value;
      const emailInput = document.querySelector("input[placeholder*='printcv.me']")?.value;
      const phoneInput = document.querySelector("input[placeholder*='961']")?.value;
      const linkedinInput = document.querySelector("input[placeholder*='linkedin.com/in']")?.value;
      const githubInput = document.querySelector("input[placeholder*='github.com']")?.value;

      const skillsCats = Array.from(document.querySelectorAll("section:nth-of-type(6) label")).map((l) => l.textContent?.trim());

      return {
        dropzone,
        contact: { nameInput, emailInput, phoneInput, linkedinInput, githubInput },
        skillsCats,
      };
    });

    console.log("✓ Previous CV File Dropzone present:", step2Details.dropzone);
    console.log("✓ Mandatory Contact Fields auto-filled:", step2Details.contact);
    console.log("✓ 4-Category Skills Section headers:", step2Details.skillsCats);
    auditReport.step2 = step2Details;

    // Test adding and removing skills
    console.log("Testing interactive skill pills: Adding 'Rust' to Languages...");
    await page.focus("input[placeholder*='Add language']");
    await page.keyboard.type("Rust");
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 400));

    const languagesAfterAdd = await page.evaluate(() => {
      const langBox = document.querySelectorAll("section")[5]?.querySelectorAll("div.flex-wrap")[0];
      return Array.from(langBox?.querySelectorAll("span") || []).map((s) => s.textContent?.trim());
    });
    console.log("✓ Languages list after adding 'Rust':", languagesAfterAdd);

    // Test removing a skill tag (click the 'x' on the last tag)
    console.log("Testing removing a skill tag via '&times;' button...");
    await page.evaluate(() => {
      const langBox = document.querySelectorAll("section")[5]?.querySelectorAll("div.flex-wrap")[0];
      const removeButtons = langBox?.querySelectorAll("button");
      if (removeButtons && removeButtons.length > 0) {
        removeButtons[removeButtons.length - 1].click();
      }
    });
    await new Promise((r) => setTimeout(r, 400));

    // Test Work Experience Toggle
    console.log("Testing Work Experience toggle...");
    await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll("section"));
      const expSec = sections.find((s) => s.innerText.includes("Prior Work Experience"));
      const toggle = expSec?.querySelector("button");
      if (toggle) toggle.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const isExpToggledOn = await page.evaluate(() => {
      const expInputs = document.querySelectorAll("input[placeholder*='Murex']");
      return expInputs.length > 0;
    });
    console.log("✓ Work Experience toggle expanded job form:", isExpToggledOn);

    // Select Projects
    const projectCount = await page.evaluate(() => {
      const pItems = document.querySelectorAll("div.cursor-pointer div.font-semibold");
      return pItems.length;
    });
    console.log("✓ Available Common Core & personal projects rendered:", projectCount);

    await page.screenshot({ path: "test/screenshots/02-step2-setup.png", fullPage: true });

    // =========================================================================
    // 3. BREADCRUMBS & STATE PERSISTENCE TEST
    // =========================================================================
    console.log("\n==============================================================");
    console.log("[CHECKPOINT 3] Breadcrumbs Navigation & F5 State Persistence");
    console.log("==============================================================");

    // Jump from Step 2 to Step 3 via Breadcrumb
    console.log("Clicking Breadcrumb Step 3 ('Technical Discovery')...");
    await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const step3 = Array.from(nav?.querySelectorAll("button") || []).find((b) => b.innerText.includes("Technical Discovery"));
      if (step3) step3.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const step3Active = await page.evaluate(() => {
      return document.querySelector("h1")?.textContent?.includes("Targeted Engineering Discovery");
    });
    console.log("✓ Instant breadcrumb navigation to Step 3:", step3Active);

    // Jump back to Step 2 via Breadcrumb
    console.log("Clicking Breadcrumb Step 2 ('Setup & Experience')...");
    await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const step2 = Array.from(nav?.querySelectorAll("button") || []).find((b) => b.innerText.includes("Setup"));
      if (step2) step2.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const step2Active = await page.evaluate(() => {
      return document.querySelector("h2")?.textContent?.includes("Mandatory Contact Information");
    });
    console.log("✓ Instant breadcrumb navigation back to Step 2:", step2Active);

    // Perform Hard Browser Refresh (F5)
    console.log("Executing page.reload() (F5 simulate) to test draft persistence...");
    await page.reload({ waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1200));

    const persistenceCheck = await page.evaluate(() => {
      const banner = document.querySelector(".bg-gradient-to-r");
      const bannerText = banner?.textContent?.replace(/\s+/g, " ").trim();
      const h2 = document.querySelector("h2")?.textContent?.trim();
      const store = JSON.parse(localStorage.getItem("42_rezi_draft_v1") || "{}");
      return {
        hasBanner: Boolean(banner),
        bannerText,
        currentHeading: h2,
        persistedStep: store.state?.currentStep,
        persistedName: store.state?.cvData?.contact?.fullName,
      };
    });

    console.log("✓ Recovery Banner displayed:", persistenceCheck.hasBanner);
    console.log("  Banner Content:", persistenceCheck.bannerText);
    console.log("✓ State fully persisted after reload on step:", persistenceCheck.persistedStep);
    auditReport.persistence = persistenceCheck;

    await page.screenshot({ path: "test/screenshots/03-persistence-recovery.png", fullPage: true });

    // Dismiss or click "Continue Editing" on Recovery Banner
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Continue Editing"));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    // =========================================================================
    // 4. TECHNICAL DISCOVERY QUESTIONNAIRE (STEP 3)
    // =========================================================================
    console.log("\n==============================================================");
    console.log("[CHECKPOINT 4] Step 3: Technical Discovery Questionnaire");
    console.log("==============================================================");

    // Click "Continue to Questionnaire"
    await page.evaluate(() => {
      const nextBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Continue to Questionnaire"));
      if (nextBtn) nextBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const step3Cards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".bg-slate-900\\/90")).map((card) => {
        const title = card.querySelector("h3")?.textContent?.trim();
        const desc = card.querySelector("p")?.textContent?.trim();
        const questionsCount = card.querySelectorAll("label.text-slate-300").length;
        const hasTextarea = Boolean(card.querySelector("textarea"));
        return { title, desc, questionsCount, hasTextarea };
      });
      return cards;
    });

    console.log(`✓ Project cards loaded (${step3Cards.length} projects):`);
    step3Cards.forEach((c) => console.log(`   - ${c.title} (${c.questionsCount} questions, textarea: ${c.hasTextarea})`));
    auditReport.step3.projects = step3Cards;

    // Fill personal notes for projects
    console.log("Filling personal notes for projects...");
    await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      textareas.forEach((ta, idx) => {
        ta.value = `Engineered core systems module #${idx + 1} with non-blocking POSIX calls, zero memory leaks, and thorough unit testing.`;
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
    await new Promise((r) => setTimeout(r, 500));

    await page.screenshot({ path: "test/screenshots/04-step3-questionnaire.png", fullPage: true });

    // =========================================================================
    // 5. LIVE SPLIT-SCREEN EDITOR & A4 CANVAS (STEP 4)
    // =========================================================================
    console.log("\n==============================================================");
    console.log("[CHECKPOINT 5] Step 4: Live Split-Screen Editor & A4 Canvas");
    console.log("==============================================================");

    // Jump to Step 4 via Breadcrumb Stepper
    console.log("Jumping to Step 4 via Breadcrumbs...");
    await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const step4 = Array.from(nav?.querySelectorAll("button") || []).find((b) => b.innerText.includes("Live Editor"));
      if (step4) step4.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const step4Layout = await page.evaluate(() => {
      const editorHeader = document.querySelector("header.h-14");
      const cvSheet = document.querySelector(".cv-sheet");
      const headerTitle = editorHeader?.querySelector(".text-slate-200")?.textContent?.trim();
      const a4Width = cvSheet?.clientWidth;
      const a4Height = cvSheet?.clientHeight;
      const font = cvSheet ? window.getComputedStyle(cvSheet).fontFamily : null;
      const tabs = Array.from(document.querySelectorAll("button")).filter((b) =>
        ["projects", "experience", "education", "skills", "contact", "settings"].some((t) => b.textContent?.toLowerCase().includes(t))
      ).map((b) => b.textContent?.trim());
      return { editorHeader: Boolean(editorHeader), headerTitle, hasCvSheet: Boolean(cvSheet), a4Width, a4Height, font, tabs };
    });

    console.log("✓ Dual-Pane Split-Screen Header mounted:", step4Layout.editorHeader);
    console.log("  Candidate & Template Info:", step4Layout.headerTitle);
    console.log(`✓ WissamCleanTemplate A4 rendered: ${step4Layout.a4Width}px x ${step4Layout.a4Height}px (Font: ${step4Layout.font})`);
    auditReport.step4.layout = step4Layout;

    // Test Density Toggle (Standard -> Compact)
    console.log("Testing Density Toggle: switching to 'Compact (1-Page)'...");
    await page.evaluate(() => {
      const compactBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("Compact"));
      if (compactBtn) compactBtn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    const compactApplied = await page.evaluate(() => {
      const sheet = document.querySelector(".cv-sheet");
      return sheet ? window.getComputedStyle(sheet).fontSize : null;
    });
    console.log("✓ Compact font size applied to A4 canvas:", compactApplied);

    // Test BYOK Drawer
    console.log("Testing 'AI Keys (BYOK)' modal drawer...");
    await page.evaluate(() => {
      const byokBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.includes("AI Keys"));
      if (byokBtn) byokBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const byokDrawerOpened = await page.evaluate(() => {
      const modal = document.querySelector("input[placeholder*='AIzaSy']");
      return Boolean(modal);
    });
    console.log("✓ BYOK Drawer opened successfully:", byokDrawerOpened);

    await page.screenshot({ path: "test/screenshots/05-step4-byok-drawer.png", fullPage: true });

    // Close BYOK Drawer
    await page.evaluate(() => {
      const doneBtn = Array.from(document.querySelectorAll("button")).find((b) => b.innerText.trim() === "Done");
      if (doneBtn) doneBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Inspect Print CSS Rules
    const printRules = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      let pageRules = [];
      try {
        for (const s of sheets) {
          try {
            const rules = Array.from(s.cssRules || []);
            for (const r of rules) {
              if (r.cssText.includes("@media print") || r.cssText.includes("@page")) {
                pageRules.push(r.cssText.slice(0, 100));
              }
            }
          } catch {}
        }
      } catch {}
      return pageRules;
    });
    console.log("✓ Print CSS verification (@page, @media print rules detected):", printRules.length > 0);
    auditReport.printCSS.rulesCount = printRules.length;

    await page.screenshot({ path: "test/screenshots/06-step4-split-editor.png", fullPage: true });

    console.log("\n==============================================================");
    console.log("ALL CHECKPOINTS EXECUTED AND CAPTURED SUCCESSFULLY!");
    console.log("==============================================================");

    fs.writeFileSync("test/audit-results.json", JSON.stringify(auditReport, null, 2));
    console.log("Detailed audit report saved to test/audit-results.json");
  } catch (err) {
    console.error("Audit encountered error:", err);
    await page.screenshot({ path: "test/screenshots/error-state.png", fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
}

runFullAudit().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
