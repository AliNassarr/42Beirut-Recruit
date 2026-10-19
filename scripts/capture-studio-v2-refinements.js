const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");
const DESKTOP_DIR = "C:\\Users\\Ali_n\\Desktop\\UI-Review-Screenshots";
const BRAIN_DIR = "C:\\Users\\Ali_n\\.gemini\\antigravity\\brain\\708b09a0-3ba1-4734-943b-2121f57d62c1";

[SCREENSHOT_DIR, DESKTOP_DIR, BRAIN_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function copyToAll(filename) {
  const src = path.join(SCREENSHOT_DIR, filename);
  fs.copyFileSync(src, path.join(DESKTOP_DIR, filename));
  fs.copyFileSync(src, path.join(BRAIN_DIR, filename));
  console.log(`Saved ${filename} to screenshots, desktop, and brain.`);
}

async function run() {
  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[Browser Console Error] ${msg.text()}`);
  });

  try {
    // 1. Projects tab at 1280x800
    console.log("1. Testing 1280px viewport on Projects tab...");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("header", { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Ensure Projects tab is active
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("nav button, header button"));
      const projBtn = buttons.find((b) => b.textContent && b.textContent.trim() === "Projects");
      if (projBtn) projBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const shotProjects = path.join(SCREENSHOT_DIR, "tab-03-projects-fixed-1280px.png");
    await page.screenshot({ path: shotProjects, fullPage: false });
    copyToAll("tab-03-projects-fixed-1280px.png");

    // 2. Activities tab at 1440x900
    console.log("2. Navigating to Activities tab at 1440x900...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("nav button, header button"));
      const actBtn = buttons.find((b) => b.textContent && b.textContent.trim() === "Activities");
      if (actBtn) actBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    const shotActivities = path.join(SCREENSHOT_DIR, "tab-06-activities-and-extras.png");
    await page.screenshot({ path: shotActivities, fullPage: false });
    copyToAll("tab-06-activities-and-extras.png");

    console.log("Visual captures completed successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
