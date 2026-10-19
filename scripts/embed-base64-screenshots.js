const fs = require("fs");
const path = require("path");

const REPORT_PATH = path.resolve(__dirname, "..", "UI_UX_AUDIT_REPORT.md");
const SCREENSHOT_DIR = path.resolve(__dirname, "..", "audit-screenshots");
const DESKTOP_DIR = "C:\\Users\\Ali_n\\Desktop\\UI-Review-Screenshots";
const ARTIFACT_DIR = "C:\\Users\\Ali_n\\.gemini\\antigravity\\brain\\708b09a0-3ba1-4734-943b-2121f57d62c1";

let mdContent = fs.readFileSync(REPORT_PATH, "utf8");

const screenshots = [
  "01-landing-and-intra-sync.png",
  "02-phase2-setup-preview-off.png",
  "03-phase2-setup-live-preview-on.png",
  "04-phase3-milestones-live-preview-on.png",
  "05-phase4-live-editor-and-sides.png",
  "06-section-moving-broken-state.png",
  "07-mobile-or-narrow-viewport-breakage.png",
];

for (const name of screenshots) {
  const filePath = path.join(SCREENSHOT_DIR, name);
  if (fs.existsSync(filePath)) {
    const b64 = fs.readFileSync(filePath).toString("base64");
    const dataUri = `data:image/png;base64,${b64}`;
    
    // Replace all relative or direct references to this image with data URI
    const regex = new RegExp(`!\\[([^\\]]*)\\]\\([^)]*${name}\\)`, "g");
    mdContent = mdContent.replace(regex, `![$1](${dataUri})`);
    console.log(`Embedded base64 for ${name}`);
  } else {
    console.warn(`File not found: ${filePath}`);
  }
}

// Write the self-contained report with inline base64 images to project root
fs.writeFileSync(REPORT_PATH, mdContent, "utf8");
console.log(`Updated ${REPORT_PATH} with self-contained inline base64 screenshots.`);

// Also write to Desktop directory
const desktopReportPath = path.join(DESKTOP_DIR, "UI_UX_AUDIT_REPORT_SELF_CONTAINED.md");
fs.writeFileSync(desktopReportPath, mdContent, "utf8");
console.log(`Saved copy to ${desktopReportPath}`);

// Also copy to artifact directory
const artifactReportPath = path.join(ARTIFACT_DIR, "UI_UX_AUDIT_REPORT.md");
fs.writeFileSync(artifactReportPath, mdContent, "utf8");
console.log(`Saved copy to artifact directory: ${artifactReportPath}`);
