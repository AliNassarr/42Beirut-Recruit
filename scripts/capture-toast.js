const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const ARTIFACT_DIR = "C:\\Users\\Ali_n\\.gemini\\antigravity\\brain\\708b09a0-3ba1-4734-943b-2121f57d62c1";
const DESKTOP_DIR = "C:\\Users\\Ali_n\\Desktop\\UI-Review-Screenshots";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 }
  });
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1000));
  
  // Click Sync Intra
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Sync Intra"));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  const toastPathArt = path.join(ARTIFACT_DIR, "toast-sync-intra-live.png");
  const toastPathDesk = path.join(DESKTOP_DIR, "toast-sync-intra-live.png");
  await page.screenshot({ path: toastPathArt });
  fs.copyFileSync(toastPathArt, toastPathDesk);
  console.log("Captured toast screenshot to", toastPathArt);

  await browser.close();
})();
