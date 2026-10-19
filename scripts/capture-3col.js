const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");
const DESKTOP_DIR = "C:\\Users\\Ali_n\\Desktop\\UI-Review-Screenshots";

async function capture3Col() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 30000 });
  await page.waitForSelector("header", { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Click Projects
  await page.evaluate(() => {
    const nav = document.querySelector("nav");
    if (nav) {
      const btn = Array.from(nav.querySelectorAll("button")).find(
        (b) => b.textContent && b.textContent.trim().toLowerCase() === "projects"
      );
      if (btn) btn.click();
    }
  });
  await new Promise((r) => setTimeout(r, 1200));

  const filename = "tab-03-projects-3column-1920.png";
  const repoPath = path.join(SCREENSHOT_DIR, filename);
  const deskPath = path.join(DESKTOP_DIR, filename);
  await page.screenshot({ path: repoPath, fullPage: false });
  fs.copyFileSync(repoPath, deskPath);
  console.log(`Saved screenshot: ${filename}`);

  await browser.close();
}

capture3Col();
