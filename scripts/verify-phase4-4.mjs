import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function verifyPhase44() {
  console.log("==============================================================");
  console.log("PHASE 4.4 E2E VERIFICATION: TECHNICAL CHIPS, VERBS & PRE-FLIGHT");
  console.log("==============================================================");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    defaultViewport: { width: 1440, height: 960 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const results = {
    step3ChipsRendered: false,
    chipCount: 0,
    chipClickAppends: false,
    chipActiveState: false,
    multiChipToggle: false,
    chipClickRemoves: false,
    step4RotateGroundedVerb: false,
    rotatedVerb: "",
  };

  try {
    console.log("Navigating to http://localhost:3000...");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1000));

    // Fast jump to Step 2 via Quick Start
    console.log("Hydrating cadet profile via Quick Start...");
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Quick Start")
      );
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Jump to Step 3 via Breadcrumb
    console.log("Navigating to Step 3 (Technical Discovery)...");
    await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const s3 = Array.from(nav?.querySelectorAll("button") || []).find((b) =>
        b.innerText.includes("Discovery")
      );
      if (s3) s3.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Verify 1-Click Technical Highlight Chips on Step 3
    console.log("\n[TEST 1] Step 3 Technical Highlight Chips Render:");
    const chipsInfo = await page.evaluate(() => {
      // Find the first project's chips container
      const chipButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const text = b.textContent?.trim() || "";
        return text.startsWith("+") || text.startsWith("✓");
      });
      return {
        count: chipButtons.length,
        chipTexts: chipButtons.slice(0, 8).map((b) => b.textContent?.trim() || ""),
      };
    });

    console.log(`✓ Technical Chips Count: ${chipsInfo.count}`);
    console.log(`✓ Sample Chips: ${chipsInfo.chipTexts.join(" | ")}`);
    results.step3ChipsRendered = chipsInfo.count >= 4;
    results.chipCount = chipsInfo.count;

    // 2. Test Clicking Chip 1 (Toggle Append)
    console.log("\n[TEST 2] Clicking First Technical Chip:");
    const chip1Name = await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const text = b.textContent?.trim() || "";
        return text.startsWith("+") || text.startsWith("✓");
      });
      if (chipButtons.length === 0) return "";
      const firstChip = chipButtons[0];
      const name = firstChip.textContent?.replace(/^[+✓]\s*/, "").trim() || "";
      firstChip.click();
      return name;
    });

    await new Promise((r) => setTimeout(r, 400));

    const afterFirstClick = await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const text = b.textContent?.trim() || "";
        return text.startsWith("+") || text.startsWith("✓");
      });
      const firstChip = chipButtons[0];
      const textarea = document.querySelector("textarea");
      return {
        noteValue: textarea?.value || "",
        chipButtonText: firstChip?.textContent?.trim() || "",
        hasActiveClasses: firstChip?.className.includes("border-cyan-400") || false,
      };
    });

    console.log(`✓ Clicked Chip: "${chip1Name}"`);
    console.log(`✓ Personal Note Updated: "${afterFirstClick?.noteValue}"`);
    console.log(`✓ Chip Active Indicator: "${afterFirstClick?.chipButtonText}" (active style: ${afterFirstClick?.hasActiveClasses})`);

    results.chipClickAppends = !!(afterFirstClick?.noteValue && afterFirstClick.noteValue.includes(chip1Name));
    results.chipActiveState = !!(afterFirstClick?.chipButtonText.startsWith("✓") && afterFirstClick.hasActiveClasses);

    // 3. Test Clicking Chip 2 (Multi-chip Append)
    console.log("\n[TEST 3] Clicking Second Technical Chip (Multi-Chip):");
    const chip2Name = await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const text = b.textContent?.trim() || "";
        return text.startsWith("+") || text.startsWith("✓");
      });
      if (chipButtons.length < 2) return "";
      const secondChip = chipButtons[1];
      const name = secondChip.textContent?.replace(/^[+✓]\s*/, "").trim() || "";
      secondChip.click();
      return name;
    });

    await new Promise((r) => setTimeout(r, 400));

    const afterSecondClick = await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      return {
        noteValue: textarea?.value || "",
      };
    });

    console.log(`✓ Clicked Second Chip: "${chip2Name}"`);
    console.log(`✓ Personal Note with Both: "${afterSecondClick?.noteValue}"`);
    results.multiChipToggle = !!(
      afterSecondClick?.noteValue &&
      afterSecondClick.noteValue.includes(chip1Name) &&
      afterSecondClick.noteValue.includes(chip2Name)
    );

    // 4. Test Clicking Chip 1 Again (Toggle Remove)
    console.log("\n[TEST 4] Clicking First Chip Again to Deselect/Remove:");
    await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const text = b.textContent?.trim() || "";
        return text.startsWith("+") || text.startsWith("✓");
      });
      if (chipButtons.length > 0) {
        chipButtons[0].click(); // Toggle off
      }
    });

    await new Promise((r) => setTimeout(r, 400));

    const afterToggleOff = await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll("button")).filter((b) => {
        const text = b.textContent?.trim() || "";
        return text.startsWith("+") || text.startsWith("✓");
      });
      const firstChip = chipButtons[0];
      const textarea = document.querySelector("textarea");
      return {
        noteValue: textarea?.value || "",
        chipButtonText: firstChip?.textContent?.trim() || "",
        hasActiveClasses: firstChip?.className.includes("border-cyan-400") || false,
      };
    });

    console.log(`✓ Note after toggling off Chip 1: "${afterToggleOff?.noteValue}"`);
    console.log(`✓ Chip 1 Reverted to Inactive: "${afterToggleOff?.chipButtonText}" (active style: ${afterToggleOff?.hasActiveClasses})`);
    results.chipClickRemoves =
      !afterToggleOff?.noteValue.includes(chip1Name) &&
      afterToggleOff?.chipButtonText.startsWith("+");

    // 5. Jump to Step 4 and Test Rotate Verb Action
    console.log("\n[TEST 5] Jump to Step 4 and Test Rotate Verb Action:");
    await page.evaluate(() => {
      const nav = document.querySelector("nav");
      const s4 = Array.from(nav?.querySelectorAll("button") || []).find((b) =>
        b.innerText.includes("Live Editor")
      );
      if (s4) s4.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Switch to Projects tab in aside
    await page.evaluate(() => {
      const projTab = Array.from(document.querySelectorAll("aside button")).find((b) =>
        b.textContent?.includes("Projects")
      );
      if (projTab) projTab.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    const origBulletValue = await page.evaluate(() => {
      const ta = document.querySelector("aside textarea");
      const original = ta ? ta.value : "";

      const rotateButtons = Array.from(document.querySelectorAll("aside button")).filter((b) =>
        b.textContent?.includes("Rotate")
      );
      if (rotateButtons.length > 0) {
        rotateButtons[0].click();
      }
      return original;
    });

    await new Promise((r) => setTimeout(r, 400));

    const rotateTest = await page.evaluate((orig) => {
      const ta = document.querySelector("aside textarea");
      const newValue = ta ? ta.value : "";
      const newVerb = newValue.trim().split(" ")[0].replace(/[^a-zA-Z]/g, "");

      const GROUNDED_VERBS = [
        "Built",
        "Developed",
        "Implemented",
        "Configured",
        "Wrote",
        "Programmed",
        "Refactored",
        "Structured",
        "Automated",
        "Containerized",
        "Integrated",
        "Validated",
        "Architected",
        "Engineered",
        "Optimized",
        "Streamlined",
      ];

      return {
        originalValue: orig,
        newValue,
        newVerb,
        isGroundedVerb: GROUNDED_VERBS.includes(newVerb),
        isNotFormulated: newVerb.toLowerCase() !== "formulated",
      };
    }, origBulletValue);

    console.log(`✓ Rotate Action Original: "${rotateTest?.originalValue?.slice(0, 50)}..."`);
    console.log(`✓ Rotate Action After:    "${rotateTest?.newValue?.slice(0, 50)}..."`);
    console.log(`✓ Rotated Leading Verb:   "${rotateTest?.newVerb}" (Grounded: ${rotateTest?.isGroundedVerb})`);

    results.step4RotateGroundedVerb = !!(rotateTest?.isGroundedVerb && rotateTest.isNotFormulated);
    results.rotatedVerb = rotateTest?.newVerb || "";

    // Screenshot
    if (!fs.existsSync("test/screenshots")) fs.mkdirSync("test/screenshots", { recursive: true });
    await page.screenshot({ path: "test/screenshots/phase4-4-chips-and-verbs.png" });
    console.log("\n✓ Screenshot captured at test/screenshots/phase4-4-chips-and-verbs.png");

    console.log("\n==============================================================");
    console.log("PHASE 4.4 VERIFICATION SUMMARY:");
    console.log(JSON.stringify(results, null, 2));
    console.log("==============================================================");

    const allPassed =
      results.step3ChipsRendered &&
      results.chipClickAppends &&
      results.chipActiveState &&
      results.multiChipToggle &&
      results.chipClickRemoves &&
      results.step4RotateGroundedVerb;

    if (allPassed) {
      console.log("\n🎉 ALL PHASE 4.4 REQUIREMENTS VERIFIED SUCCESSFULLY (100% PASS)!");
    } else {
      console.warn("\n⚠️ Some Phase 4.4 checks did not pass. Check individual results above.");
    }
  } catch (err) {
    console.error("Verification error:", err);
  } finally {
    await browser.close();
  }
}

verifyPhase44();
