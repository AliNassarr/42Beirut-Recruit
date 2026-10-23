const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runAuditCapture() {
  console.log("Starting Audit Suite Screenshot Capture...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();

  try {
    console.log("Navigating to " + BASE_URL + "...");
    await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Ensure cadet profile is hydrated (click Quick Start if landing is shown)
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent && (b.textContent.includes("Quick Start") || b.textContent.includes("Developer Profile"))
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Ensure Live Preview is ON
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const previewBtn = buttons.find((b) =>
        b.textContent && b.textContent.includes("Live Preview: OFF")
      );
      if (previewBtn) previewBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Helper to select tab
    const selectTab = async (label) => {
      console.log(`Selecting tab: ${label}...`);
      await page.evaluate((tabName) => {
        const nav = document.querySelector("nav");
        if (nav) {
          const btn = Array.from(nav.querySelectorAll("button")).find(
            (b) => b.textContent && b.textContent.trim().toLowerCase() === tabName.toLowerCase()
          );
          if (btn) btn.click();
        }
      }, label);
      await new Promise((r) => setTimeout(r, 1000));
    };

    const saveShot = async (filename) => {
      const filePath = path.join(SCREENSHOT_DIR, filename);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved screenshot: ${filename} -> ${filePath}`);
    };

    // 1. Contact Tab (1440x900, Live Side Preview ON)
    await selectTab("Contact");
    await saveShot("01-contact-tab.png");

    // 2. Education Tab
    await selectTab("Education");
    await saveShot("02-education-tab.png");

    // 3. Projects Tab
    await selectTab("Projects");
    await saveShot("03-projects-tab.png");

    // 4. Experience Tab
    await selectTab("Experience");
    await saveShot("04-experience-tab.png");

    // 5. Skills Tab
    await selectTab("Skills");
    await saveShot("05-skills-tab.png");

    // 6. Activities Tab
    await selectTab("Activities");
    await saveShot("06-activities-tab.png");

    // 7. Section Reorder Modal
    console.log("Opening Section Order Modal...");
    await page.evaluate(() => {
      const headerBtns = Array.from(document.querySelectorAll("header button"));
      const orderBtn = headerBtns.find(
        (b) => b.textContent && b.textContent.includes("Section Order")
      );
      if (orderBtn) orderBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));
    await saveShot("07-section-reorder-modal.png");

    // Close Section Reorder Modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const doneBtn = btns.find((b) => b.textContent && b.textContent.trim() === "Done");
      if (doneBtn) doneBtn.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // 8. Bullet Editor Row Detail
    console.log("Capturing Bullet Editor Row Detail in Projects tab...");
    await selectTab("Projects");
    await new Promise((r) => setTimeout(r, 1000));
    
    // Find bullet editor row card and capture either element screenshot or zoomed view
    const bulletCard = await page.$(".group.relative.bg-\\[\\#0A0A0D\\]");
    if (bulletCard) {
      const bulletPath = path.join(SCREENSHOT_DIR, "08-bullet-editor-row-detail.png");
      await bulletCard.screenshot({ path: bulletPath });
      console.log("Saved screenshot: 08-bullet-editor-row-detail.png (element card)");
    } else {
      await saveShot("08-bullet-editor-row-detail.png");
    }

    console.log("Audit capture suite completed successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
  } finally {
    await browser.close();
  }
}

runAuditCapture();
