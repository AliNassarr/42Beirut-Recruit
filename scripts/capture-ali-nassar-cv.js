const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const HTML_FILE_URL = "file:///C:/Users/Ali_n/Documents/Downloads/gemini-code-1792513160466.html";
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
    defaultViewport: { width: 1440, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log(`[Browser Console Error] ${msg.text()}`);
  });

  try {
    // 1. Capture the HTML CV rendered directly from the local file
    console.log("1. Rendering local HTML CV at " + HTML_FILE_URL);
    await page.setViewport({ width: 1200, height: 1600 });
    await page.goto(HTML_FILE_URL, { waitUntil: "networkidle0", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1000));

    const htmlShot = path.join(SCREENSHOT_DIR, "ali-nassar-html-cv.png");
    const container = await page.$(".cv-container");
    if (container) {
      await container.screenshot({ path: htmlShot });
    } else {
      await page.screenshot({ path: htmlShot });
    }
    copyToAll("ali-nassar-html-cv.png");

    // 2. Open the Next.js app, ensure fresh state for Ali Nassar, and capture
    console.log("2. Navigating to http://localhost:3000 at 1440x900...");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("header", { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Clear stale draft in localStorage if it was Mohammad Hamdan, and trigger Intra sync
    await page.evaluate(() => {
      try {
        const stored = localStorage.getItem("printcv_studio_draft_v1");
        if (stored && stored.includes("Mohammad Hamdan")) {
          localStorage.removeItem("printcv_studio_draft_v1");
          localStorage.removeItem("42_rezi_draft_v1");
          location.reload();
        }
      } catch (e) {}
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Click Sync Intra button to guarantee fresh Ali Nassar data is populated
    await page.evaluate(() => {
      const syncBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && b.textContent.includes("Sync Intra")
      );
      if (syncBtn) syncBtn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Capture full studio with Live Preview
    const studioShot = path.join(SCREENSHOT_DIR, "ali-nassar-cv-studio-live.png");
    await page.screenshot({ path: studioShot, fullPage: false });
    copyToAll("ali-nassar-cv-studio-live.png");

    // Capture close-up of the A4 Preview Canvas
    const canvas = await page.$(".cv-sheet");
    if (canvas) {
      const canvasShot = path.join(SCREENSHOT_DIR, "ali-nassar-cv-a4-canvas.png");
      await canvas.screenshot({ path: canvasShot });
      copyToAll("ali-nassar-cv-a4-canvas.png");
    }

    console.log("All visual captures completed successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
