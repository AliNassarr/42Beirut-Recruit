import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import { z } from "zod";
import { executeStructuredFailover } from "@/lib/ai/client";
import { normalizeGitHub, normalizeLinkedIn } from "@/lib/sanitizer";

export const runtime = "nodejs";

const ParsedCVSchema = z.object({
  contact: z
    .object({
      fullName: z.string().default(""),
      email: z.string().default(""),
      phone: z.string().default(""),
      linkedin: z.string().default(""),
      github: z.string().default(""),
    })
    .default({
      fullName: "",
      email: "",
      phone: "",
      linkedin: "",
      github: "",
    }),
  education: z
    .array(
      z.object({
        institution: z.string().default(""),
        degree: z.string().default(""),
        location: z.string().default(""),
        startDate: z.string().default(""),
        endDate: z.string().default(""),
      })
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().default(""),
        role: z.string().default(""),
        location: z.string().default("Beirut, Lebanon"),
        startDate: z.string().default(""),
        endDate: z.string().default(""),
        descriptionBullets: z.array(z.string()).default([]),
        rawNotes: z.string().default(""),
      })
    )
    .default([]),
  skills: z
    .object({
      languages: z.array(z.string()).default([]),
      developerTools: z.array(z.string()).default([]),
      technologiesFrameworks: z.array(z.string()).default([]),
      projectManagementTools: z.array(z.string()).default([]),
    })
    .default({
      languages: [],
      developerTools: [],
      technologiesFrameworks: [],
      projectManagementTools: [],
    }),
  customProjects: z
    .array(
      z.object({
        name: z.string().default(""),
        techStack: z.string().default(""),
        date: z.string().default(""),
        summaryBullets: z.array(z.string()).default([]),
        rawNotes: z.string().default(""),
      })
    )
    .default([]),
  extracurriculars: z
    .array(
      z.object({
        organization: z.string().default(""),
        role: z.string().default(""),
        startDate: z.string().default(""),
        endDate: z.string().default(""),
        bulletPoints: z.array(z.string()).default([]),
      })
    )
    .default([]),
  coursework: z.array(z.string()).default([]),
});

type ParsedCVOutput = z.infer<typeof ParsedCVSchema>;

function extractSkillsHeuristically(text: string) {
  const lower = text.toLowerCase();
  const knownLanguages = [
    "C", "C++", "C#", "Python", "JavaScript", "TypeScript", "Bash", "Shell", "SQL", "HTML", "CSS", "Java", "Rust", "Go", "PHP", "Ruby"
  ];
  const knownTools = [
    "Git", "GitHub", "Docker", "Make", "CMake", "Linux", "Unix", "VS Code", "GDB", "Valgrind", "Postman", "Vite"
  ];
  const knownTech = [
    "React", "Next.js", "Node.js", "Express", "NGINX", "Supabase", "Firebase", "PostgreSQL", "MariaDB", "MySQL", "SQLite", "Redis", "Tailwind CSS", "Bootstrap", "Shopify", "Cloudflare"
  ];
  const knownPM = [
    "JIRA", "Trello", "Notion", "Agile", "Scrum", "GitHub Projects", "ClickUp"
  ];

  const matchSet = (list: string[]) => {
    return list.filter((item) => {
      const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(^|[^a-zA-Z0-9#+])${escaped}([^a-zA-Z0-9#+]|$)`, "i");
      return regex.test(lower);
    });
  };

  return {
    languages: matchSet(knownLanguages),
    developerTools: matchSet(knownTools),
    technologiesFrameworks: matchSet(knownTech),
    projectManagementTools: matchSet(knownPM),
  };
}

export async function POST(req: NextRequest) {
  try {
    const userGeminiKey = req.headers.get("x-user-gemini-key");
    const userGroqKey = req.headers.get("x-user-groq-key");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf");
    const isDocx = fileName.endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { success: false, error: "Only PDF (.pdf) and Word (.docx) files are supported" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    // =========================================================================
    // 1. DETERMINISTIC RAW TEXT EXTRACTION (Zero-Multimodal, Pure Text)
    // =========================================================================
    let rawText = "";

    if (isPdf) {
      try {
        const uint8Array = new Uint8Array(arrayBuffer);
        const { text, totalPages } = await extractText(uint8Array);
        rawText = Array.isArray(text) ? text.join("\n\n") : String(text || "");
        console.log(`[parse-old-cv] Extracted ${rawText.length} characters across ${totalPages} page(s) using unpdf`);
      } catch (pdfErr: any) {
        console.error("[parse-old-cv] unpdf extraction error:", pdfErr);
        return NextResponse.json(
          { success: false, error: `Failed to extract text from PDF: ${pdfErr.message}` },
          { status: 422 }
        );
      }
    } else {
      try {
        const extraction = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        rawText = extraction.value || "";
        console.log(`[parse-old-cv] Extracted ${rawText.length} characters from DOCX using mammoth`);
      } catch (docxErr: any) {
        console.error("[parse-old-cv] mammoth extraction error:", docxErr);
        return NextResponse.json(
          { success: false, error: `Failed to extract text from DOCX: ${docxErr.message}` },
          { status: 422 }
        );
      }
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: "Could not extract readable text from document. Ensure it is not an image-only scan." },
        { status: 422 }
      );
    }

    // =========================================================================
    // 2. DETERMINISTIC REGEX NORMALIZATION (Zero-Token Contact Extraction)
    // =========================================================================
    const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    const detectedEmail = emailMatch ? emailMatch[0].trim() : "";

    const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
    const detectedPhone = phoneMatch ? phoneMatch[0].trim() : "";

    const linkedinMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-\.]+)/i);
    const detectedLinkedIn = linkedinMatch ? normalizeLinkedIn(linkedinMatch[1] || linkedinMatch[0]) : "";

    const githubMatch = rawText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)/i);
    const detectedGitHub = githubMatch ? normalizeGitHub(githubMatch[1] || githubMatch[0]) : "";

    const firstLines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 5);
    const detectedName = firstLines.find(
      (line) =>
        line.length >= 3 &&
        line.length <= 40 &&
        !line.includes("@") &&
        !line.includes("http") &&
        !line.includes("github") &&
        !line.includes("linkedin") &&
        !/^\+?\d/.test(line) &&
        !/curriculum|resume|cv/i.test(line)
    ) || "";

    // Bound document text to 12,000 characters to cover full 1-2 page resumes completely
    const boundedText = rawText.slice(0, 12000);

    // =========================================================================
    // 3. ATOMIC STRUCTURED INGESTION VIA CASCADING FAILOVER
    // =========================================================================
    const systemPrompt = `
You are an expert ATS CV parser for 42 school software engineering candidates.
Extract ALL information from the candidate's previous CV into typed JSON adhering strictly to the schema.

CRITICAL INSTRUCTIONS:
1. "contact":
   - Extract candidate's full name, email, phone number, LinkedIn, and GitHub.
   - Use the provided contact hints if present.
2. "education":
   - Extract ALL university degrees, diplomas, or institutions outside 42 (e.g. Lebanese University, AUB, LAU, etc.).
   - Capture institution, degree/program, location, startDate, and endDate.
   - If no prior university degree outside 42 is found, return [].
3. "experience":
   - Extract EVERY past job, internship, or freelance software position.
   - Capture company name, role/title, location, startDate, endDate.
   - "descriptionBullets": string array of bullet points describing responsibilities and achievements.
   - "rawNotes": 1-2 sentence summary of what was accomplished.
   - If no prior work experience is present, return [].
4. "skills":
   - Categorize ALL technical skills strictly into Dr. Wissam Sammouri's 4 CV categories:
     - "languages": Programming & scripting languages (e.g. C, C++, Python, JavaScript, TypeScript, Bash, SQL, Go, Rust, Java, HTML, CSS).
     - "developerTools": Developer & OS tools (e.g. Git, GitHub, Docker, Make, CMake, Linux, Unix, VS Code, GDB, Valgrind, Postman, Vite).
     - "technologiesFrameworks": Frameworks, libraries, platforms, databases (e.g. React, Next.js, Node.js, Express, NGINX, Supabase, PostgreSQL, MySQL, Redis, Tailwind CSS, Shopify, Cloudflare R2).
     - "projectManagementTools": Collaboration & management tools (e.g. JIRA, Trello, Notion, GitHub Projects, Agile, Scrum).
5. "customProjects":
   - Extract non-42 personal, client, or freelance software projects (e.g. "BC Capture", "E-commerce Website", hackathons, portfolio apps).
   - Capture name, techStack (comma-separated), date, summaryBullets, and rawNotes.
6. "extracurriculars":
   - Extract community service, clubs, hackathons, or leadership roles.
7. "coursework":
   - Extract certifications, online courses, or specialized bootcamps.
8. Style:
   - Strictly NO em-dashes (—). Use hyphens (-).
`;

    const userPrompt = `
Extract complete structured CV information from this candidate's CV text:

CANDIDATE RAW CV TEXT:
${boundedText}

Extracted Regex Contact Hints:
- Name hint: ${detectedName || "None"}
- Email hint: ${detectedEmail || "None"}
- Phone hint: ${detectedPhone || "None"}
- LinkedIn hint: ${detectedLinkedIn || "None"}
- GitHub hint: ${detectedGitHub || "None"}
`;

    const result = await executeStructuredFailover({
      system: systemPrompt,
      prompt: userPrompt,
      schema: ParsedCVSchema,
      userGeminiKey,
      userGroqKey,
      temperature: 0.1,
    });

    let finalData: any;

    if (result.success && result.data) {
      finalData = result.data;
    } else {
      console.warn(`[parse-old-cv] AI extraction failed or unavailable (${result.error}). Using deterministic regex and heuristic fallback.`);
      const heuristicSkills = extractSkillsHeuristically(rawText);
      finalData = {
        contact: {
          fullName: detectedName,
          email: detectedEmail,
          phone: detectedPhone,
          linkedin: detectedLinkedIn,
          github: detectedGitHub,
        },
        education: [],
        experience: [],
        skills: heuristicSkills,
        customProjects: [],
        extracurriculars: [],
        coursework: [],
      };
    }

    // =========================================================================
    // 4. SANITIZE AND RECONCILE CONTACT DETAILS
    // =========================================================================
    const cleanEmail = detectedEmail || finalData.contact?.email || "";
    const cleanPhone = detectedPhone || finalData.contact?.phone || "";
    const cleanFullName = finalData.contact?.fullName || detectedName || "";
    const cleanLinkedIn = detectedLinkedIn
      ? normalizeLinkedIn(detectedLinkedIn)
      : normalizeLinkedIn(finalData.contact?.linkedin || "");
    const cleanGitHub = detectedGitHub
      ? normalizeGitHub(detectedGitHub)
      : normalizeGitHub(finalData.contact?.github || "");

    const unifiedContact = {
      fullName: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      linkedin: cleanLinkedIn,
      github: cleanGitHub,
    };

    // Return unified payload with both nested and top-level fields for full client compatibility
    return NextResponse.json({
      success: true,
      data: {
        contact: unifiedContact,
        fullName: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        linkedin: cleanLinkedIn,
        github: cleanGitHub,

        education: finalData.education || [],
        previousUniversity: finalData.education?.[0] || null,

        experience: finalData.experience || [],
        workExperience: finalData.experience || [],

        skills: finalData.skills || {
          languages: [],
          developerTools: [],
          technologiesFrameworks: [],
          projectManagementTools: [],
        },

        customProjects: finalData.customProjects || [],
        extracurriculars: finalData.extracurriculars || [],
        coursework: finalData.coursework || [],
      },
      usedProvider: result.usedProvider || "deterministic-fallback",
    });
  } catch (error: any) {
    console.error("[parse-old-cv] Internal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to parse document" },
      { status: 500 }
    );
  }
}
