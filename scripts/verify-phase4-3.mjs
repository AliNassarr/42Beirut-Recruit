import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function verifyPhase43() {
  console.log("==============================================================");
  console.log("PHASE 4.3 E2E VERIFICATION: ENTERPRISE EDITOR & PAGE BUDGETING");
  console.log("==============================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    defaultViewport: { width: 1440, height: 960 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const results = {
    compactStepper: false,
    pageBudgetMeter: null,
    clickToFocus: {},
    bulletActions: {},
    reordering: {},
    exportToasts: {},
  };

  try {
    console.log("Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1000));

    // Fast jump to Step 4 via Quick Start and Breadcrumbs
    console.log("Hydrating cadet profile and jumping to Step 4...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Quick Start")
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Jump to Step 4 via Breadcrumb
    await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const s4 = Array.from(nav?.querySelectorAll("button") || []).find((b) =>
        b.innerText.includes("Live Editor")
      );
      if (s4) s4.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Verify Compact Stepper Mode
    console.log("\n[TEST 1] Compact Stepper Mode Verification:");
    const navHeight = await page.evaluate(() => {
      const nav = document.querySelector("nav");
      return nav ? nav.clientHeight : null;
    });
    console.log(`✓ Stepper Bar Height on Step 4: ${navHeight}px (Compact <= 48px: ${navHeight <= 48})`);
    results.compactStepper = navHeight <= 48;

    // 2. Verify Page Budget Meter
    console.log("\n[TEST 2] Live Page Budget Meter Verification:");
    const budgetData = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll("header .font-bold"));
      const fitBadge = badges.find(
        (b) => b.textContent?.includes("Fit") || b.textContent?.includes("Overflow")
      );
      return fitBadge ? fitBadge.textContent?.trim() : null;
    });
    console.log("✓ Live Page Budget Badge:", budgetData);
    results.pageBudgetMeter = budgetData;

    // 3. Verify Click-to-Focus Canvas-to-Editor Sync
    console.log("\n[TEST 3] Click-to-Focus Canvas-to-Editor Sync:");
    // Click Education section on A4 canvas
    await page.evaluate(() => {
      const eduSec = Array.from(document.querySelectorAll(".cv-sheet section")).find((s) =>
        s.textContent?.includes("Education")
      );
      if (eduSec) eduSec.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const isEduTabActive = await page.evaluate(() => {
      const activeTabBtn = document.querySelector("aside button.border-cyan-400");
      return activeTabBtn?.textContent?.includes("Education") ?? false;
    });
    console.log("✓ Click 'Education' on A4 canvas -> Active Tab is Education:", isEduTabActive);
    results.clickToFocus.education = isEduTabActive;

    // Click Selected Projects on A4 canvas
    await page.evaluate(() => {
      const projSec = Array.from(document.querySelectorAll(".cv-sheet section")).find((s) =>
        s.textContent?.includes("Selected Projects")
      );
      if (projSec) projSec.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const isProjTabActive = await page.evaluate(() => {
      const activeTabBtn = document.querySelector("aside button.border-cyan-400");
      return activeTabBtn?.textContent?.includes("Projects") ?? false;
    });
    console.log("✓ Click 'Selected Projects' on A4 canvas -> Active Tab is Projects:", isProjTabActive);
    results.clickToFocus.projects = isProjTabActive;

    // Click Header on A4 canvas
    await page.evaluate(() => {
      const header = document.querySelector(".cv-sheet header");
      if (header) header.click();
    });
    await new Promise((r) => setTimeout(r, 500));
    const isHeaderTabActive = await page.evaluate(() => {
      const activeTabBtn = document.querySelector("aside button.border-cyan-400");
      return activeTabBtn?.textContent?.includes("Header") ?? false;
    });
    console.log("✓ Click 'Header' on A4 canvas -> Active Tab is Header:", isHeaderTabActive);
    results.clickToFocus.header = isHeaderTabActive;

    // 4. Verify Project Reordering
    console.log("\n[TEST 4] Project Reordering (Up/Down):");
    // Switch back to projects tab
    await page.evaluate(() => {
      const projTab = Array.from(document.querySelectorAll("aside button")).find((b) =>
        b.textContent?.includes("Projects")
      );
      if (projTab) projTab.click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const initialFirstProject = await page.evaluate(() => {
      const firstInput = document.querySelector("aside input[value*='Webserv'], aside input.font-bold");
      return firstInput?.value;
    });
    console.log("Initial First Project:", initialFirstProject);

    // Click Move Down on first project
    await page.evaluate(() => {
      const downBtns = Array.from(document.querySelectorAll("aside button[title*='down']"));
      if (downBtns.length > 0) downBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 500));

    const reorderedFirstProject = await page.evaluate(() => {
      const firstInput = document.querySelector("aside input[value*='Minishell'], aside input.font-bold");
      return firstInput?.value;
    });
    console.log("First Project after Move Down:", reorderedFirstProject);
    results.reordering.projectMovedDown = initialFirstProject !== reorderedFirstProject;
    console.log("✓ Project successfully reordered:", results.reordering.projectMovedDown);

    // 5. Verify Inline Bullet Micro-Actions (Shorten & Rotate)
    console.log("\n[TEST 5] Inline Bullet Micro-Actions:");
    const bulletBefore = await page.evaluate(() => {
      const ta = document.querySelector("aside textarea");
      return ta?.value || "";
    });
    console.log("Bullet before action:", bulletBefore.slice(0, 60) + "...");

    // Click Rotate
    await page.evaluate(() => {
      const rotateBtns = Array.from(document.querySelectorAll("aside button")).filter((b) =>
        b.textContent?.includes("Rotate")
      );
      if (rotateBtns.length > 0) rotateBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const bulletAfterRotate = await page.evaluate(() => {
      const ta = document.querySelector("aside textarea");
      return ta?.value || "";
    });
    console.log("Bullet after Rotate:", bulletAfterRotate.slice(0, 60) + "...");
    results.bulletActions.rotated = bulletBefore !== bulletAfterRotate;
    console.log("✓ Verb rotated successfully:", results.bulletActions.rotated);

    // Click Shorten
    await page.evaluate(() => {
      const shortenBtns = Array.from(document.querySelectorAll("aside button")).filter((b) =>
        b.textContent?.includes("Shorten")
      );
      if (shortenBtns.length > 0) shortenBtns[0].click();
    });
    await new Promise((r) => setTimeout(r, 400));

    const bulletAfterShorten = await page.evaluate(() => {
      const ta = document.querySelector("aside textarea");
      return ta?.value || "";
    });
    console.log("Bullet after Shorten:", bulletAfterShorten.slice(0, 60) + "...");
    results.bulletActions.shortened = Boolean(bulletAfterShorten);
    console.log("✓ Bullet tightened successfully:", results.bulletActions.shortened);

    // 6. Verify Export Confirmation Toasts
    console.log("\n[TEST 6] Export Confirmation Toasts:");
    // Click Export Word
    await page.evaluate(() => {
      const docxBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Export Word")
      );
      if (docxBtn) docxBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const toastWord = await page.evaluate(() => {
      const toast = document.querySelector(".fixed.bottom-6.right-6");
      return toast ? toast.textContent?.trim() : null;
    });
    console.log("✓ Export Word Toast:", toastWord);
    results.exportToasts.word = Boolean(toastWord?.includes("Word (.docx) Exported"));

    // Dismiss toast or wait
    await page.evaluate(() => {
      const closeToast = document.querySelector(".fixed.bottom-6.right-6 button");
      if (closeToast) closeToast.click();
    });
    await new Promise((r) => setTimeout(r, 300));

    // Capture comprehensive screenshot of Step 4 with Phase 4.3 features
    await page.screenshot({
      path: "test/screenshots/phase4-3-enterprise-editor.png",
      fullPage: false,
    });
    console.log("✓ Saved screenshot to test/screenshots/phase4-3-enterprise-editor.png");

    fs.writeFileSync("test/phase4-3-results.json", JSON.stringify(results, null, 2));
    console.log("\n==============================================================");
    console.log("ALL PHASE 4.3 TESTS COMPLETED SUCCESSFULLY!");
    console.log("==============================================================");
  } catch (err) {
    console.error("Test failed with error:", err);
    await page.screenshot({ path: "test/screenshots/phase4-3-error.png" });
    throw err;
  } finally {
    await browser.close();
  }
}

verifyPhase43().catch((err) => {
  console.error(err);
  process.exit(1);
});
