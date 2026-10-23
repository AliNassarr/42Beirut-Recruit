import { extractText } from "unpdf";
import { normalizeGitHub, normalizeLinkedIn } from "../src/lib/sanitizer";
import { executeStructuredFailover } from "../src/lib/ai/client";
import { z } from "zod";

async function runAudit() {
  console.log("==================================================================");
  console.log("AGENT 4 AUDIT: MULTI-AGENT INFERENCE RESILIENCE & ZERO-COST SCALE");
  console.log("==================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: unpdf Serverless Text Extraction & Regex Normalization
  // --------------------------------------------------------------------------
  function createValidPdf(): Buffer {
    const streamContent =
      "BT\n/F1 10 Tf\n50 700 Td\n(mhamdan@printcv.me) Tj\n0 -15 Td\n(+961 70 123 456) Tj\n0 -15 Td\n(https://linkedin.com/in/mhamdan) Tj\n0 -15 Td\n(https://github.com/mhamdan) Tj\nET\n";
    const streamLen = Buffer.byteLength(streamContent);
    let body = "%PDF-1.4\n";
    const offsets: number[] = [];

    const addObj = (s: string) => {
      offsets.push(Buffer.byteLength(body));
      body += s + "\n";
    };

    addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
    addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
    addObj("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj");
    addObj(`4 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}endstream\nendobj`);
    addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");

    const xrefStart = Buffer.byteLength(body);
    body += "xref\n0 6\n0000000000 65535 f \n";
    for (const off of offsets) {
      body += off.toString().padStart(10, "0") + " 00000 n \n";
    }
    body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(body);
  }

  const pdfBuffer = createValidPdf();
  const { text, totalPages } = await extractText(new Uint8Array(pdfBuffer));
  const rawText = Array.isArray(text) ? text.join("\n") : String(text);

  console.log(`✓ unpdf extracted ${rawText.length} chars across ${totalPages} page(s) with 0 canvas errors.`);

  const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-\.]+)/i);
  const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)/i);

  const cleanEmail = emailMatch?.[0] || "";
  const cleanPhone = phoneMatch?.[0] || "";
  const cleanLinkedIn = linkedinMatch ? normalizeLinkedIn(linkedinMatch[0]) : "";
  const cleanGitHub = githubMatch ? normalizeGitHub(githubMatch[0]) : "";

  console.log(`  - Clean Email:    ${cleanEmail}`);
  console.log(`  - Clean Phone:    ${cleanPhone}`);
  console.log(`  - Clean LinkedIn: ${cleanLinkedIn}`);
  console.log(`  - Clean GitHub:   ${cleanGitHub}`);

  if (cleanEmail !== "mhamdan@printcv.me") throw new Error("Email extraction failed");
  if (cleanLinkedIn !== "linkedin.com/in/mhamdan") throw new Error("LinkedIn normalization failed");
  if (cleanGitHub !== "github.com/mhamdan") throw new Error("GitHub normalization failed");
  console.log("✓ TEST 1 PASSED: Deterministic unpdf extraction verified.\n");

  // --------------------------------------------------------------------------
  // TEST 2: Cascading Failover Verification
  // --------------------------------------------------------------------------
  console.log("[TEST 2] Testing cascading failover interception...");
  const DummySchema = z.object({
    status: z.string(),
  });

  // Test with invalid key simulating HTTP 401 / 429
  const failoverTest = await executeStructuredFailover({
    system: "You are a test agent.",
    prompt: "Return JSON with status 'ok'",
    schema: DummySchema,
    userGeminiKey: "invalid_simulated_key_for_failover_test",
    userGroqKey: "invalid_simulated_groq_key",
  });

  console.log("Failover result:", failoverTest);
  console.log("✓ TEST 2 PASSED: Failover caught provider errors gracefully without unhandled crashes.\n");

  // --------------------------------------------------------------------------
  // TEST 3: Atomic Single-Pass API Synthesis & Anti-Boilerplate Verification
  // --------------------------------------------------------------------------
  console.log("[TEST 3] Testing live /api/ai/generate-cv atomic endpoint...");

  const testPayload = {
    targetRole: "Systems & Backend Engineer",
    showExperience: true,
    styleDensity: "standard",
    showExtracurriculars: true,
    contactInfo: {
      fullName: "Mohammad Hamdan",
      email: "mhamdan@printcv.me",
      phoneNumber: "+961 70 123 456",
      linkedinUrl: "https://linkedin.com/in/mhamdan",
      githubUrl: "https://github.com/mhamdan",
    },
    selectedProjects: [
      {
        name: "Webserv",
        slug: "webserv",
        techStack: "C++, HTTP/1.1, Sockets",
        date: "February 2025",
        is42Project: true,
      },
      {
        name: "Minishell",
        slug: "minishell",
        techStack: "C, Unix System Calls",
        date: "June 2024",
        is42Project: true,
      },
    ],
    projectAnswers: {
      webserv: {
        "personal-notes": "Engineered non-blocking I/O event loop using poll() and custom HTTP parser with chunked transfer encoding.",
      },
      minishell: {
        "personal-notes": "Designed command execution pipelines with fork and execve, managing environment variable expansions and signal handlers.",
      },
    },
    experienceItems: [
      {
        id: "exp-test-1",
        company: "Balance Center",
        role: "Independent Mobile & Web Developer",
        location: "San Francisco, CA",
        startDate: "February 2026",
        endDate: "September 2026",
        rawNotes: "Built BC Capture mobile-first inventory application using Next.js, Supabase, and Vision AI for rapid scanning.",
      },
    ],
    selectedCampusRoles: ["Black Ops"],
    campusRoleAnswers: {
      "Black Ops": {
        scope: "Mentored 30+ newer students in C pointers and memory management.",
      },
    },
    selectedCoursework: ["Extracurricular Cybersecurity Intensive Bootcamp"],
  };

  try {
    const res = await fetch("http://localhost:3000/api/ai/generate-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API returned ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (!json.success || !json.cv) {
      throw new Error(`Synthesis was not successful: ${JSON.stringify(json)}`);
    }

    const cv = json.cv;
    console.log(`✓ Atomic generation returned successfully via provider: ${json.usedProvider}`);
    console.log(`  - Projects count: ${cv.projects?.length}`);
    console.log(`  - Experience count: ${cv.experience?.length}`);
    console.log(`  - Extracurriculars count: ${cv.extracurriculars?.length}`);
    console.log(`  - Skills Languages: ${cv.skills?.languages?.join(", ")}`);

    // Verify Anti-Boilerplate constraint
    for (const proj of cv.projects || []) {
      for (const bullet of proj.bulletPoints || []) {
        console.log(`    [Project Bullet] ${bullet}`);
        if (bullet.includes("Built and verified")) {
          throw new Error(`Found robotic boilerplate 'Built and verified' in: ${bullet}`);
        }
        if (bullet.includes("Engineered key functionality:")) {
          throw new Error(`Found robotic boilerplate 'Engineered key functionality:' in: ${bullet}`);
        }
        if (bullet.includes("—")) {
          throw new Error(`Found forbidden em-dash in: ${bullet}`);
        }
      }
    }

    // Verify Experience bullets
    for (const exp of cv.experience || []) {
      for (const bullet of exp.bulletPoints || []) {
        console.log(`    [Experience Bullet] ${bullet}`);
        if (bullet.includes("—")) {
          throw new Error(`Found forbidden em-dash in: ${bullet}`);
        }
      }
    }

    // Verify 4 strict skill categories
    if (!Array.isArray(cv.skills.languages) || !Array.isArray(cv.skills.developerTools) ||
        !Array.isArray(cv.skills.technologiesFrameworks) || !Array.isArray(cv.skills.projectManagementTools)) {
      throw new Error("Skills does not have the strict 4 categories");
    }

    // Verify clean contact links
    if (cv.contact.linkedinUrl.includes("linkedin.com/in/linkedin.com/in/")) {
      throw new Error("Recursive LinkedIn URL detected");
    }
    if (cv.contact.githubUrl.includes("github.com/github.com/")) {
      throw new Error("Recursive GitHub URL detected");
    }

    console.log("✓ TEST 3 PASSED: Single-pass atomic synthesis is 100% compliant with zero boilerplate prefixes!\n");
  } catch (apiErr: any) {
    console.error("Test 3 API verification failed:", apiErr.message);
    throw apiErr;
  }

  console.log("==================================================================");
  console.log("ALL AGENT AUDIT TESTS COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
}

runAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
