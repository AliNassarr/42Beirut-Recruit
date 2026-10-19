const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");
const DESKTOP_DIR = "C:\\Users\\Ali_n\\Desktop\\UI-Review-Screenshots";

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
if (!fs.existsSync(DESKTOP_DIR)) {
  fs.mkdirSync(DESKTOP_DIR, { recursive: true });
}

async function capture() {
  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  try {
    // 1. Screenshot 08: Standard 1280x800 viewport with Live Side Preview: ON
    console.log("1. Navigating to http://localhost:3000 at 1280x800...");
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("header", { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Turn ON Live Side Preview
    console.log("Toggling Live Side Preview ON...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const previewBtn = buttons.find(
        (b) => b.textContent && b.textContent.includes("Live Preview")
      );
      if (previewBtn && previewBtn.textContent.includes("OFF")) {
        previewBtn.click();
      }
    });

    await new Promise((r) => setTimeout(r, 1500));

    const shot8 = path.join(SCREENSHOT_DIR, "08-fixed-1280px-live-preview-on.png");
    await page.screenshot({ path: shot8, fullPage: false });
    fs.copyFileSync(shot8, path.join(DESKTOP_DIR, "08-fixed-1280px-live-preview-on.png"));
    console.log("Captured 08:", shot8);

    // 2. Screenshot 09: Fixed Bullet Editor Row (No collision between AI split button & telemetry badges)
    console.log("2. Capturing close-up of bullet editor row...");
    const bulletCardHandle = await page.evaluateHandle(() => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      const target = textareas.find(
        (t) => t.placeholder && t.placeholder.includes("Engineered asynchronous")
      );
      if (target) {
        return target.closest(".group");
      }
      return null;
    });

    const shot9 = path.join(SCREENSHOT_DIR, "09-fixed-bullet-row-no-collision.png");
    const bulletElement = bulletCardHandle.asElement();
    if (bulletElement) {
      await bulletElement.screenshot({ path: shot9 });
    } else {
      await page.screenshot({ path: shot9 });
    }
    fs.copyFileSync(shot9, path.join(DESKTOP_DIR, "09-fixed-bullet-row-no-collision.png"));
    console.log("Captured 09:", shot9);

    // 3. Screenshot 10: Section Reordering Control & Modal
    console.log("3. Opening Section Order modal and moving sections...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const secOrderBtn = buttons.find(
        (b) => b.textContent && b.textContent.includes("Section Order")
      );
      if (secOrderBtn) {
        secOrderBtn.click();
      }
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Click Move Section Up on Technical Projects
    await page.evaluate(() => {
      const modal = document.querySelector(".fixed.inset-0");
      if (!modal) return;
      const cards = Array.from(modal.querySelectorAll(".flex.items-center.justify-between.p-3"));
      const projCard = cards.find(
        (c) => c.textContent && c.textContent.includes("Technical Projects")
      );
      if (projCard) {
        const upBtn = projCard.querySelector("button[title='Move Section Up']");
        if (upBtn) upBtn.click();
      }
    });

    await new Promise((r) => setTimeout(r, 1200));

    const shot10 = path.join(SCREENSHOT_DIR, "10-fixed-section-reordering.png");
    await page.screenshot({ path: shot10, fullPage: false });
    fs.copyFileSync(shot10, path.join(DESKTOP_DIR, "10-fixed-section-reordering.png"));
    console.log("Captured 10:", shot10);

    console.log("Verification capture complete! All 3 files saved to audit-screenshots and Desktop.");
  } finally {
    await browser.close();
  }
}

capture().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});
