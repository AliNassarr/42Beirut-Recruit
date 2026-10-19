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

async function captureAllTabs() {
  console.log("Launching headless Chrome at 1440x900...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Console Error] ${msg.text()}`);
    }
  });

  try {
    console.log("Navigating to http://localhost:3000...");
    await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 30000 });
    await page.waitForSelector("header", { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Ensure cadet profile is hydrated (click Quick Start if landing is shown)
    const isLanding = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent && b.textContent.includes("Quick Start with 42 Beirut")
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (isLanding) {
      console.log("Clicked Quick Start on landing...");
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Helper to click tab
    const selectTab = async (tabLabel) => {
      console.log(`Selecting tab: ${tabLabel}...`);
      await page.evaluate((label) => {
        const nav = document.querySelector("nav");
        if (nav) {
          const btn = Array.from(nav.querySelectorAll("button")).find(
            (b) => b.textContent && b.textContent.trim().toLowerCase() === label.toLowerCase()
          );
          if (btn) btn.click();
        }
      }, tabLabel);
      await new Promise((r) => setTimeout(r, 1200));
    };

    const saveScreenshot = async (filename) => {
      const repoPath = path.join(SCREENSHOT_DIR, filename);
      const deskPath = path.join(DESKTOP_DIR, filename);
      await page.screenshot({ path: repoPath, fullPage: false });
      fs.copyFileSync(repoPath, deskPath);
      console.log(`Saved screenshot: ${filename} (${repoPath} & ${deskPath})`);
    };

    // 1. Tab 01: Contact
    await selectTab("Contact");
    await saveScreenshot("tab-01-contact-live.png");

    // 2. Tab 02: Education
    await selectTab("Education");
    await saveScreenshot("tab-02-education-live.png");

    // 3. Tab 03: Projects
    await selectTab("Projects");
    await saveScreenshot("tab-03-projects-live.png");

    // 4. Tab 04: Experience
    await selectTab("Experience");
    await saveScreenshot("tab-04-experience-live.png");

    // 5. Tab 05: Skills
    await selectTab("Skills");
    await saveScreenshot("tab-05-skills-live.png");

    // 6. Tab 06: Summary
    await selectTab("Summary");
    await saveScreenshot("tab-06-summary-and-extra-live.png");

    // 7. Modal: Section Order Manager
    console.log("Opening Section Order modal...");
    await page.evaluate(() => {
      const headerBtns = Array.from(document.querySelectorAll("header button"));
      const orderBtn = headerBtns.find(
        (b) => b.textContent && b.textContent.includes("Section Order")
      );
      if (orderBtn) orderBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    await saveScreenshot("modal-section-reorder-live.png");

    // Close modal
    await page.evaluate(() => {
      const doneBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && b.textContent.trim() === "Done"
      );
      if (doneBtn) doneBtn.click();
    });

    console.log("All 7 screenshots captured successfully!");
  } catch (err) {
    console.error("Error during capture:", err);
  } finally {
    await browser.close();
  }
}

captureAllTabs();
