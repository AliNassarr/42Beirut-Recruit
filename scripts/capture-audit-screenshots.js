const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  // 1. Capture 01-landing-and-intra-sync.png
  console.log("1. Navigating to Phase 1: Landing & Intra Sync...");
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/?view=wizard&step=LOGIN`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));
  const shot1 = path.join(SCREENSHOT_DIR, "01-landing-and-intra-sync.png");
  await page.screenshot({ path: shot1, fullPage: false });
  console.log("Captured:", shot1);

  // 2. Capture Phase 2 Setup Preview OFF
  console.log("2. Navigating to Studio V2: Experience Deck (Preview OFF)...");
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${BASE_URL}`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1500));

  // Click EXPERIENCE tab in sub-nav
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("header button"));
    const expTab = tabs.find((t) => t.textContent && t.textContent.includes("EXPERIENCE"));
    if (expTab) expTab.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  const shot2 = path.join(SCREENSHOT_DIR, "02-phase2-setup-preview-off.png");
  await page.screenshot({ path: shot2, fullPage: false });
  console.log("Captured:", shot2);

  // 3. Capture Phase 2 Setup Live Preview ON
  console.log("3. Toggling Live Side Preview ON in Phase 2...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const previewBtn = buttons.find((b) => b.textContent && b.textContent.includes("Live Side Preview"));
    if (previewBtn) previewBtn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const shot3 = path.join(SCREENSHOT_DIR, "03-phase2-setup-live-preview-on.png");
  await page.screenshot({ path: shot3, fullPage: false });
  console.log("Captured:", shot3);

  // 4. Capture Phase 3 Milestones Live Preview ON
  console.log("4. Switching to PROJECTS (Technical Milestones) with Live Side Preview ON...");
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("header button"));
    const projTab = tabs.find((t) => t.textContent && t.textContent.includes("PROJECTS"));
    if (projTab) projTab.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const shot4 = path.join(SCREENSHOT_DIR, "04-phase3-milestones-live-preview-on.png");
  await page.screenshot({ path: shot4, fullPage: false });
  console.log("Captured:", shot4);

  // 5. Capture Phase 4 Live Editor & Sides
  console.log("5. Navigating to Phase 4 / Finish Up Viewport...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const finishTab = buttons.find((t) => t.textContent && t.textContent.toLowerCase().includes("finish up"));
    if (finishTab) finishTab.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const shot5 = path.join(SCREENSHOT_DIR, "05-phase4-live-editor-and-sides.png");
  await page.screenshot({ path: shot5, fullPage: false });
  console.log("Captured:", shot5);

  // 6. Capture Section Moving / Project Reordering Broken State
  console.log("6. Inspecting Section Reordering / Project Reorder controls...");
  // Return to builder mode, projects tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const finishTab = buttons.find((t) => t.textContent && t.textContent.toLowerCase().includes("finish up"));
    if (finishTab) finishTab.click(); // Toggle back to builder mode

    const tabs = Array.from(document.querySelectorAll("header button"));
    const projTab = tabs.find((t) => t.textContent && t.textContent.includes("PROJECTS"));
    if (projTab) projTab.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Focus and capture the project list aside with GripVertical and ChevronUp/Down
  const asides = await page.$$("aside");
  const asideElement = asides.length > 1 ? asides[1] : asides[0];
  const shot6 = path.join(SCREENSHOT_DIR, "06-section-moving-broken-state.png");
  if (asideElement) {
    await asideElement.screenshot({ path: shot6 });
  } else {
    await page.screenshot({ path: shot6, fullPage: false });
  }
  console.log("Captured:", shot6);

  // 7. Capture Mobile / Narrow Viewport Breakage (1024x768 and 1280x800)
  console.log("7. Capturing Narrow Viewport Breakage at 1280x800...");
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 800));

  const shot7 = path.join(SCREENSHOT_DIR, "07-mobile-or-narrow-viewport-breakage.png");
  await page.screenshot({ path: shot7, fullPage: false });
  console.log("Captured:", shot7);

  await browser.close();
  console.log("All 7 screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
