import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeStructuredFailover, DR_WISSAM_SYSTEM_PROMPT } from "@/lib/ai/client";
import { sanitizeBulletPoint, sanitizeCVData, normalizeGitHub, normalizeLinkedIn } from "@/lib/sanitizer";
import { getProjectKnowledge, KNOWN_PISCINES, CAMPUS_ROLES } from "@/lib/knowledge-base";
import { CVData, EducationItem, ExperienceItem, ProjectItem, ExtracurricularItem } from "@/types/resume";
import { prisma } from "@/lib/prisma";

export const runtime = 'edge';

const SinglePassSynthesisSchema = z.object({
  projects: z.array(
    z.object({
      slug: z.string(),
      bulletPoints: z.array(z.string().min(15).max(220)),
    })
  ),
  experience: z
    .array(
      z.object({
        id: z.string(),
        bulletPoints: z.array(z.string().min(15).max(220)),
      })
    )
    .optional()
    .default([]),
  skills: z.object({
    languages: z.array(z.string()),
    developerTools: z.array(z.string()),
    technologiesFrameworks: z.array(z.string()),
    projectManagementTools: z.array(z.string()),
  }),
  extracurriculars: z
    .array(
      z.object({
        organization: z.string(),
        role: z.string(),
        bulletPoints: z.array(z.string()),
      })
    )
    .optional()
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const userGeminiKey = req.headers.get("x-user-gemini-key");
    const userGroqKey = req.headers.get("x-user-groq-key");

    const body = await req.json();
    const {
      profile,
      educationState,
      specializationTrack,
      targetRole = "Software Engineer",
      showExperience,
      selectedProjects = [],
      projectAnswers = {},
      experienceItems = [],
      educationItems = [],
      selectedCampusRoles = [],
      campusRoleAnswers = {},
      selectedCoursework = [],
      contactInfo,
      styleDensity = "standard",
      showExtracurriculars = true,
    } = body;

    // =========================================================================
    // 1. QUERY ANTI-DUPLICATION LEDGER & EXTRACT FORBIDDEN ACTION VERBS
    // =========================================================================
    const projectSlugs = selectedProjects.map((p: any) => p.slug);
    const forbiddenBySlug: Record<string, string[]> = {};
    const forbiddenVerbsBySlug: Record<string, string[]> = {};
    const allHistoricalVerbs = new Set<string>();

    try {
      const recentBullets = await prisma.generatedBullet.findMany({
        where: { projectSlug: { in: projectSlugs } },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { projectSlug: true, bulletText: true },
      });

      for (const b of recentBullets) {
        if (!forbiddenBySlug[b.projectSlug]) forbiddenBySlug[b.projectSlug] = [];
        forbiddenBySlug[b.projectSlug].push(b.bulletText);

        const firstWord = b.bulletText.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, "");
        if (firstWord && firstWord.length > 2) {
          if (!forbiddenVerbsBySlug[b.projectSlug]) forbiddenVerbsBySlug[b.projectSlug] = [];
          if (!forbiddenVerbsBySlug[b.projectSlug].includes(firstWord)) {
            forbiddenVerbsBySlug[b.projectSlug].push(firstWord);
          }
          allHistoricalVerbs.add(firstWord);
        }
      }
    } catch (dbErr) {
      console.warn("[anti-duplication] Could not query previous bullets:", dbErr);
    }

    // =========================================================================
    // 2. CONSTRUCT UNIFIED ATOMIC PROMPT (Single LLM Call for Complete CV)
    // =========================================================================
    const projectPromptBlocks = selectedProjects.map((proj: any) => {
      const kb = getProjectKnowledge(proj.slug, proj.name);
      const answers = projectAnswers[proj.slug] || {};
      const forbidden = forbiddenBySlug[proj.slug] || [];
      const forbiddenVerbs = forbiddenVerbsBySlug[proj.slug] || [];

      return `
Project: ${proj.name} (slug: "${proj.slug}")
Default Tech: ${kb?.defaultTechStack.join(", ") || proj.techStack || "C"}
Student Answers:
${Object.entries(answers)
  .map(([k, v]) => `  * ${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
  .join("\n")}
${
  forbidden.length > 0
    ? `FORBIDDEN PREVIOUS SENTENCES FOR THIS PROJECT (DO NOT REUSE):
${forbidden.slice(0, 5).map((f) => `  - "${f}"`).join("\n")}`
    : ""
}
${
  forbiddenVerbs.length > 0
    ? `FORBIDDEN LEADING ACTION VERBS FOR THIS PROJECT (DO NOT START WITH THESE): ${forbiddenVerbs.slice(0, 8).join(", ")}`
    : ""
}
`;
    });

    const experiencePromptBlocks =
      showExperience && Array.isArray(experienceItems) && experienceItems.length > 0
        ? experienceItems.map((exp: any) => `
Experience ID: "${exp.id}"
Company: ${exp.company}
Role: ${exp.role}
Raw Implementation Notes: ${exp.rawNotes || "Delivered software features and system engineering."}
`)
        : [];

    const campusRolePromptBlocks =
      Array.isArray(selectedCampusRoles) && selectedCampusRoles.length > 0
        ? selectedCampusRoles.map((role: string) => `
Campus Role: ${role} (Title: "${role}")
Answers: ${JSON.stringify(campusRoleAnswers[role] || {})}
`)
        : [];

    const unifiedPrompt = `
Generate complete, grounded engineering CV content for a software engineering developer targeting the role: "${targetRole}".

1. SELECTED PROJECTS:
${projectPromptBlocks.join("\n")}

${experiencePromptBlocks.length > 0 ? `2. WORK EXPERIENCE:\n${experiencePromptBlocks.join("\n")}` : ""}

${campusRolePromptBlocks.length > 0 ? `3. CAMPUS ROLES & EXTRACURRICULARS:\n${campusRolePromptBlocks.join("\n")}` : ""}

4. TECHNICAL SKILLS:
Analyze all the projects and experience above, and organize the candidate's verified skills into the 4 strict categories:
- languages
- developerTools
- technologiesFrameworks
- projectManagementTools

RULES:
- For each project: generate 2 to 3 distinct, grounded past-tense action bullets.
- For each work experience: generate 2 to 3 distinct, grounded past-tense action bullets.
- ANTI-VERB MONOTONY & DIVERSITY: Each bullet point across ALL projects and work experience entries MUST start with a DISTINCT, grounded engineering action verb. NEVER repeat the same leading verb across bullets.
- FAVOR GROUNDED SYSTEMS VERBS: Built, Developed, Implemented, Configured, Wrote, Programmed, Refactored, Structured, Automated, Containerized, Integrated, Validated, Architected, Engineered, Optimized, Streamlined.
- ABSOLUTELY NO academic or generic fluff verbs ("Formulated", "Synthesized", "Spearheaded", "Leveraged", "Facilitated", "Utilized", "Delved").
- DO NOT use filler prefixes ("Engineered key functionality:", "Built and verified...", "Highlights:").
- ABSOLUTELY NO em-dashes (—). Use hyphens or commas instead.
- NO buzzwords (spearheaded, revolutionized, synergized, leveraged).
${
  allHistoricalVerbs.size > 0
    ? `- FORBIDDEN HISTORICAL LEADING VERBS (recently used in candidate's history): ${Array.from(allHistoricalVerbs).slice(0, 15).join(", ")}`
    : ""
}
`;

    // =========================================================================
    // 3. EXECUTE SINGLE-PASS ATOMIC CALL WITH CASCADING FAILOVER
    // =========================================================================
    const result = await executeStructuredFailover({
      system: DR_WISSAM_SYSTEM_PROMPT,
      prompt: unifiedPrompt,
      schema: SinglePassSynthesisSchema,
      userGeminiKey,
      userGroqKey,
      temperature: 0.1,
    });

    const aiData = result.success ? result.data : null;
    console.log(`[generate-cv] Atomic synthesis completed via provider: ${result.usedProvider || "fallback"}`);

    // =========================================================================
    // 4. MAP & CLEAN GENERATED PROJECTS
    // =========================================================================
    const bulletsToSave: { projectSlug: string; bulletText: string; userLogin: string | null }[] = [];
    const synthesizedProjects: ProjectItem[] = [];

    const DIVERSE_FALLBACK_VERBS = [
      ["Built", "Configured"],
      ["Developed", "Implemented"],
      ["Programmed", "Architected"],
      ["Structured", "Automated"],
      ["Engineered", "Validated"],
      ["Refactored", "Integrated"],
    ];

    for (const [projIndex, proj] of (selectedProjects as any[]).entries()) {
      const kbProject = getProjectKnowledge(proj.slug, proj.name);
      const aiProj = aiData?.projects?.find((p) => p.slug === proj.slug || p.slug === proj.name.toLowerCase());

      let bullets: string[] = [];

      if (aiProj && Array.isArray(aiProj.bulletPoints) && aiProj.bulletPoints.length > 0) {
        bullets = aiProj.bulletPoints.map(sanitizeBulletPoint);
      } else {
        // High-quality deterministic fallback with diverse engineering verbs
        const answers = projectAnswers[proj.slug] || {};
        const personalNote = (answers["personal-notes"] || answers["notes"] || "").trim();
        const tech = kbProject?.defaultTechStack.slice(0, 3).join(", ") || proj.techStack || "C";
        const roleFocus = targetRole ? `aligned with ${targetRole} requirements` : "with modular architecture";
        const [primaryVerb, secondaryVerb] = DIVERSE_FALLBACK_VERBS[projIndex % DIVERSE_FALLBACK_VERBS.length];

        if (personalNote) {
          const splitNotes = personalNote
            .split(/\n+|•|\*/g)
            .map((s: string) => s.replace(/^[-*•\d.]+\s*/, "").trim())
            .filter((s: string) => s.length > 15);

          if (splitNotes.length >= 2) {
            bullets = splitNotes.slice(0, 3).map(sanitizeBulletPoint);
          } else {
            const cleanNote = personalNote.replace(/^Engineered key functionality:\s*/i, "").trim();
            const startsWithVerb = /^[A-Z][a-z]+ed\b/.test(cleanNote);
            bullets = [
              sanitizeBulletPoint(`${primaryVerb} ${proj.name} using ${tech}, focusing on ${roleFocus}.`),
              sanitizeBulletPoint(
                startsWithVerb
                  ? cleanNote
                  : `${secondaryVerb} ${cleanNote.charAt(0).toLowerCase() + cleanNote.slice(1)}`
              ),
            ];
          }
        } else {
          bullets = [
            sanitizeBulletPoint(`${primaryVerb} ${proj.name} using ${tech}, focusing on ${roleFocus}.`),
            sanitizeBulletPoint(`${secondaryVerb} defensive error handling, automated test routines, and strict memory safety.`),
          ];
        }
      }

      // Collect for batch ledger save
      for (const b of bullets) {
        bulletsToSave.push({
          projectSlug: proj.slug,
          bulletText: b,
          userLogin: profile?.login || null,
        });
      }

      const cleanTitle = proj.name.includes("|") ? proj.name.split("|")[0].trim() : proj.name;
      const cleanStack =
        proj.name.includes("|") && (!proj.techStack || proj.techStack === "C")
          ? proj.name.split("|").slice(1).join("|").trim()
          : (kbProject?.defaultTechStack.join(", ") || proj.techStack || "C");

      synthesizedProjects.push({
        id: `proj-${proj.slug || Math.random()}`,
        name: cleanTitle,
        slug: proj.slug,
        is42Project: proj.is42Project ?? true,
        techStack: cleanStack,
        date: proj.date || "2024",
        bulletPoints: bullets.slice(0, 3),
      });
    }

    // Save all bullets in 1 single database batch
    if (bulletsToSave.length > 0) {
      try {
        await prisma.generatedBullet.createMany({
          data: bulletsToSave,
        });
      } catch (saveErr) {
        console.warn("[anti-duplication] Could not save batch bullets:", saveErr);
      }
    }

    // =========================================================================
    // 5. MAP & CLEAN WORK EXPERIENCE
    // =========================================================================
    const synthesizedExperience: ExperienceItem[] = [];

    if (showExperience && Array.isArray(experienceItems) && experienceItems.length > 0) {
      for (const exp of experienceItems) {
        const aiExp = aiData?.experience?.find((e) => e.id === exp.id);
        let expBullets: string[] = [];

        if (aiExp && Array.isArray(aiExp.bulletPoints) && aiExp.bulletPoints.length > 0) {
          expBullets = aiExp.bulletPoints.map(sanitizeBulletPoint);
        } else if (Array.isArray(exp.bulletPoints) && exp.bulletPoints.length > 0) {
          expBullets = exp.bulletPoints.map(sanitizeBulletPoint);
        } else {
          expBullets = [
            sanitizeBulletPoint(exp.rawNotes || "Developed software solutions and supported production systems."),
            sanitizeBulletPoint("Collaborated with technical team members to implement robust code and debugging routines."),
          ];
        }

        synthesizedExperience.push({
          id: exp.id || `exp-${Date.now()}-${Math.random()}`,
          company: exp.company || "Company",
          role: exp.role || "Software Engineer",
          location: exp.location || "San Francisco, CA",
          startDate: exp.startDate || "2023",
          endDate: exp.endDate || "Present",
          isCurrent: exp.isCurrent ?? true,
          bulletPoints: expBullets.slice(0, 3),
          rawNotes: exp.rawNotes || "",
        });
      }
    }

    // =========================================================================
    // 6. MAP SKILLS (Strict 4 Categories)
    // =========================================================================
    const languagesSet = new Set<string>(["C", "C++"]);
    const devToolsSet = new Set<string>(["VS Code", "Git", "GDB", "Valgrind", "Docker"]);
    const techSet = new Set<string>(["Linux", "POSIX Threads"]);
    const pmSet = new Set<string>(["GitHub", "JIRA"]);

    if (aiData?.skills) {
      if (Array.isArray(aiData.skills.languages)) aiData.skills.languages.forEach((s) => languagesSet.add(s));
      if (Array.isArray(aiData.skills.developerTools)) aiData.skills.developerTools.forEach((s) => devToolsSet.add(s));
      if (Array.isArray(aiData.skills.technologiesFrameworks)) aiData.skills.technologiesFrameworks.forEach((s) => techSet.add(s));
      if (Array.isArray(aiData.skills.projectManagementTools)) aiData.skills.projectManagementTools.forEach((s) => pmSet.add(s));
    } else {
      // Deterministic skill extraction from projects
      for (const proj of selectedProjects) {
        const kb = getProjectKnowledge(proj.slug, proj.name);
        for (const t of kb?.defaultTechStack || []) {
          if (["C", "C++", "Python", "SQL", "Bash", "Java", "TypeScript", "JavaScript", "Go", "Rust"].includes(t)) {
            languagesSet.add(t);
          } else if (["Git", "Docker", "Valgrind", "GDB", "VS Code", "Vim", "Make"].includes(t)) {
            devToolsSet.add(t);
          } else if (["GitHub", "JIRA", "Trello", "Linear", "Notion", "Agile"].includes(t)) {
            pmSet.add(t);
          } else {
            techSet.add(t);
          }
        }
      }
    }

    // =========================================================================
    // 7. MAP EXTRACURRICULAR ACTIVITIES
    // =========================================================================
    const synthesizedExtracurriculars: ExtracurricularItem[] = [];

    if (Array.isArray(selectedCampusRoles)) {
      for (const roleName of selectedCampusRoles) {
        const aiEc = aiData?.extracurriculars?.find(
          (e) => e.organization.toLowerCase().includes(roleName.toLowerCase()) || e.role.toLowerCase().includes(roleName.toLowerCase())
        );

        let ecBullets: string[] = [];
        if (aiEc && Array.isArray(aiEc.bulletPoints) && aiEc.bulletPoints.length > 0) {
          ecBullets = aiEc.bulletPoints.map(sanitizeBulletPoint);
        } else {
          const roleDef = CAMPUS_ROLES.find(
            (r) => r.internalName === roleName || r.professionalTitle === roleName
          );
          ecBullets = [
            sanitizeBulletPoint(roleDef?.description || `Assisted peers and contributed to campus technical operations.`),
            sanitizeBulletPoint("Organized peer evaluation sessions and verified code compliance with industry standards."),
          ];
        }

        synthesizedExtracurriculars.push({
          id: `ec-${roleName.toLowerCase().replace(/\s+/g, "-")}`,
          organization: roleName,
          role: roleName,
          startDate: "2024",
          endDate: "Present",
          isCurrent: true,
          bulletPoints: ecBullets.slice(0, 2),
        });
      }
    }

    // =========================================================================
    // 8. ASSEMBLE COMPLETE CV DATA OBJECT
    // =========================================================================
    const finalEducation: EducationItem[] = [
      {
        id: "edu-primary",
        institution: "School of Digital Technologies",
        program:
          educationState === "STATE_A_CORE"
            ? "Core Systems Curriculum – Architecture of Digital Technologies Program"
            : "Completed the Core Systems Curriculum – Architecture of Digital Technologies Program",
        startDate: "2023",
        endDate: educationState === "STATE_C_ALUMNUS" ? "2024" : "Present",
        isCurrent: educationState !== "STATE_C_ALUMNUS",
        level: profile?.level ? Math.floor(profile.level) : 9,
        state: educationState,
        specializationTrack:
          educationState === "STATE_B_SPECIALIZATION"
            ? specializationTrack || "Advanced Software Architecture"
            : undefined,
      },
    ];

    if (Array.isArray(educationItems)) {
      for (const edu of educationItems) {
        if (!edu.institution?.toLowerCase().includes("digital technologies")) {
          finalEducation.push({
            id: edu.id || `edu-${Date.now()}-${Math.random()}`,
            institution: edu.institution,
            program: edu.program || edu.degree || "Bachelor Degree",
            degree: edu.degree || edu.program || "Bachelor Degree",
            startDate: edu.startDate || "2020",
            endDate: edu.endDate || "2024",
            isCurrent: edu.isCurrent ?? false,
            state: "STATE_A_CORE",
          });
        }
      }
    }

    const cvData: CVData = {
      targetRole,
      showExperience: Boolean(showExperience),
      styleDensity: styleDensity as "standard" | "compact",
      showExtracurriculars: Boolean(showExtracurriculars),
      educationState: educationState || "STATE_A_CORE",
      specializationTrack:
        educationState === "STATE_B_SPECIALIZATION"
          ? specializationTrack || "Advanced Software Architecture"
          : undefined,
      contact: {
        fullName: contactInfo?.fullName || profile?.displayname || "Software Engineer",
        level: profile?.level ? Math.floor(profile.level) : 9,
        email: contactInfo?.email || profile?.email || "developer@printcv.me",
        phoneNumber: contactInfo?.phoneNumber || profile?.phone || "+1 (555) 019-2834",
        githubUrl: normalizeGitHub(contactInfo?.githubUrl || (profile?.login ? profile.login : "developer")),
        linkedinUrl: normalizeLinkedIn(contactInfo?.linkedinUrl || (profile?.login ? profile.login : "developer")),
        location: contactInfo?.location || "San Francisco, CA",
      },
      education: finalEducation,
      experience: showExperience ? synthesizedExperience : [],
      projects: synthesizedProjects,
      skills: {
        languages: Array.from(languagesSet),
        developerTools: Array.from(devToolsSet),
        technologiesFrameworks: Array.from(techSet),
        projectManagementTools: Array.from(pmSet),
      },
      coursework: (selectedCoursework || []).map((cw: string | { title: string; date?: string }) => ({
        id: `cw-${typeof cw === "string" ? cw : cw.title}`,
        title: typeof cw === "string" ? cw : cw.title,
        date: typeof cw === "object" && cw.date ? cw.date : "2025",
        institution: "School of Digital Technologies",
      })),
      extracurriculars: synthesizedExtracurriculars,
    };

    const sanitizedResult = sanitizeCVData(cvData);
    return NextResponse.json({
      success: true,
      cv: sanitizedResult,
      usedProvider: result.usedProvider || "deterministic-fallback",
    });
  } catch (error: any) {
    console.error("[generate-cv] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate CV" },
      { status: 500 }
    );
  }
}
