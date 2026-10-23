import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeStructuredFailover, DR_WISSAM_SYSTEM_PROMPT } from "@/lib/ai/client";
import { sanitizeBulletPoint } from "@/lib/sanitizer";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';

const RegenerateBulletsSchema = z.object({
  bullets: z.array(z.string().min(15).max(220)),
});

export async function POST(req: NextRequest) {
  try {
    const userGeminiKey = req.headers.get("x-user-gemini-key");
    const userGroqKey = req.headers.get("x-user-groq-key");

    const { projectSlug, projectName, targetRole, techStack, userNotes, studentLogin } = await req.json();

    if (!projectSlug) {
      return NextResponse.json({ success: false, error: "Missing project slug" }, { status: 400 });
    }

    // 1. Fetch recent bullets for this project to enforce anti-duplication
    let forbiddenBulletList: string[] = [];
    try {
      const recentBullets = await prisma.generatedBullet.findMany({
        where: { projectSlug },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { bulletText: true },
      });
      forbiddenBulletList = recentBullets.map((b) => b.bulletText);
    } catch (dbErr) {
      console.warn(`[anti-duplication] Could not query bullets for ${projectSlug}:`, dbErr);
    }

    // 2. Query with cascading failover
    const prompt = `
Generate 2 to 3 grounded, 100% unique CV bullet points for this software systems project following Dr. Wissam Sammouri's reference template:
Project: ${projectName || projectSlug}
Tech Stack: ${techStack || "C / C++, Unix"}
Target Role: ${targetRole || "Software Engineer"}
Student's Personal Implementation Notes:
${userNotes ? `- ${userNotes}` : "- Standard systems core project implementation"}

CRITICAL UNIQUENESS RULE:
Other engineering candidates have already been given the bullet points listed below:
<forbidden_already_used_bullets>
${forbiddenBulletList.map((b) => `- "${b}"`).join("\n")}
</forbidden_already_used_bullets>

You are STRICTLY FORBIDDEN from reusing those sentences, their opening verb combinations, or their phrasing patterns.
Construct completely fresh, original, simple English sentences tailored specifically to THIS student's personal implementation notes and target role.
- NO em-dashes (—)
- NO buzzwords (spearheaded, revolutionized, etc.)
- Use past-tense action verbs (e.g., Developed, Built, Implemented, Engineered, Designed, Optimized)
`;

    const result = await executeStructuredFailover({
      system: DR_WISSAM_SYSTEM_PROMPT,
      prompt,
      schema: RegenerateBulletsSchema,
      userGeminiKey,
      userGroqKey,
      temperature: 0.1,
    });

    let bullets: string[] = [];
    if (result.success && result.data && Array.isArray(result.data.bullets) && result.data.bullets.length > 0) {
      bullets = result.data.bullets.map(sanitizeBulletPoint);
    } else {
      bullets = [
        sanitizeBulletPoint(`Engineered core components of ${projectName || projectSlug} focusing on architectural stability and edge-case handling.`),
        sanitizeBulletPoint(`Implemented defensive testing patterns to verify memory safety and system requirements under load.`),
      ];
    }

    // 3. Save new bullets to anti-duplication ledger
    try {
      await prisma.generatedBullet.createMany({
        data: bullets.map((bulletText) => ({
          projectSlug,
          bulletText,
          userLogin: studentLogin || null,
        })),
      });
    } catch (saveErr) {
      console.warn(`[anti-duplication] Could not save regenerated bullets for ${projectSlug}:`, saveErr);
    }

    return NextResponse.json({
      success: true,
      bullets,
      usedProvider: result.usedProvider || "fallback",
    });
  } catch (error: any) {
    console.error("[regenerate-project-bullets] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to regenerate bullets" },
      { status: 500 }
    );
  }
}
