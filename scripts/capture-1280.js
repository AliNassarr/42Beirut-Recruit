const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");

async function capture1280() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2000));
  
  // Quick Start if present
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent && (b.textContent.includes("Quick Start") || b.textContent.includes("Developer Profile"))
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-laptop-1280x800-split-screen.png") });
  console.log("Saved 09-laptop-1280x800-split-screen.png");
  await browser.close();
}

capture1280();
