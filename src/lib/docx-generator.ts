import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  TabStopType,
  TabStopPosition,
  HeadingLevel,
  BorderStyle,
} from "docx";
import { CVData } from "@/types/resume";
import { removeEmDashes } from "@/lib/sanitizer";

/**
 * Generates an authentic Microsoft Word (.docx) file adhering 100% to Dr. Wissam's template.
 * Uses native paragraph TabStopType.RIGHT to place dates at the exact right margin without tables.
 */
export async function generateDrWissamDocx(data: CVData): Promise<Blob> {
  const sections: Paragraph[] = [];
  const FONT_FAMILY = "Calibri";
  const isCompact = data.styleDensity === "compact";

  // Helper for Section Headers with solid bottom border
  const addSectionHeader = (title: string) => {
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: isCompact ? 130 : 180, after: isCompact ? 40 : 60 },
        border: {
          bottom: { color: "111827", space: 2, style: BorderStyle.SINGLE, size: 8 },
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: isCompact ? 20 : 21, // 10pt or 10.5pt
            font: FONT_FAMILY,
            color: "111827",
          }),
        ],
      })
    );
  };

  // ==============================================================
  // HEADER: Centered Name, Subtitle, Contact Strip
  // ==============================================================
  sections.push(
    new Paragraph({
      alignment: "center",
      spacing: { before: 0, after: isCompact ? 20 : 40 },
      children: [
        new TextRun({
          text: data.contact.fullName.toUpperCase(),
          bold: true,
          size: isCompact ? 36 : 40, // 18pt or 20pt
          font: FONT_FAMILY,
          color: "111827",
        }),
      ],
    }),
    new Paragraph({
      alignment: "center",
      spacing: { after: isCompact ? 30 : 60 },
      children: [
        new TextRun({
          text: data.targetRole
            ? `${data.targetRole.includes("42") ? data.targetRole : `${data.targetRole} | 42 Student – Level ${data.contact.level}`}`
            : `42 Student – Level ${data.contact.level}`,
          bold: true,
          size: isCompact ? 20 : 22, // 10pt or 11pt
          font: FONT_FAMILY,
          color: "374151",
        }),
      ],
    }),
    new Paragraph({
      alignment: "center",
      spacing: { after: isCompact ? 120 : 180 },
      children: [
        new TextRun({
          text: `${data.contact.location ? `${data.contact.location}  |  ` : ""}${data.contact.email}  |  ${data.contact.phoneNumber}  |  ${data.contact.linkedinUrl.replace(/^https?:\/\//, "")}  |  ${data.contact.githubUrl.replace(/^https?:\/\//, "")}`,
          size: isCompact ? 17 : 19, // 8.5pt or 9.5pt
          font: FONT_FAMILY,
          color: "4B5563",
        }),
      ],
    })
  );

  // ==============================================================
  // SECTION 1: EDUCATION (States A, B, C)
  // ==============================================================
  addSectionHeader("Education");

  // 42 Beirut Entry
  sections.push(
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      spacing: { before: 40, after: 20 },
      children: [
        new TextRun({
          text: `42 Beirut - Level ${data.contact.level}`,
          bold: true,
          size: 20, // 10pt
          font: FONT_FAMILY,
        }),
        new TextRun("\t"),
        new TextRun({
          text: (() => {
            const e = data.education?.find((x) => x.institution.toLowerCase().includes("42 beirut"));
            return e?.startDate ? `${e.startDate} – ${e.endDate || "Present"}` : (data.educationState === "STATE_C_ALUMNUS" ? "2024" : "2025 – Present");
          })(),
          italics: true,
          size: 19,
          font: FONT_FAMILY,
        }),
      ],
    })
  );

  if (data.educationState === "STATE_A_CORE") {
    sections.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: "42 Core Curriculum - Architecture of Digital Technologies Program",
            size: 19,
            font: FONT_FAMILY,
          }),
        ],
      })
    );
  } else if (data.educationState === "STATE_B_SPECIALIZATION") {
    sections.push(
      new Paragraph({
        spacing: { after: 20 },
        children: [
          new TextRun({
            text: "Completed the 42 Core Curriculum - Architecture of Digital Technologies Program",
            size: 19,
            font: FONT_FAMILY,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `Advanced Curriculum - ${data.specializationTrack || "Software Engineering"} Track`,
            italics: true,
            size: 18,
            font: FONT_FAMILY,
          }),
        ],
      })
    );
  } else if (data.educationState === "STATE_C_ALUMNUS") {
    sections.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: "Completed the 42 Core Curriculum - Architecture of Digital Technologies Program",
            size: 19,
            font: FONT_FAMILY,
          }),
        ],
      })
    );
  }

  // Additional Universities
  for (const edu of data.education.filter(
    (e) => !e.institution.toLowerCase().includes("42 beirut")
  )) {
    sections.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: 40, after: 20 },
        children: [
          new TextRun({
            text: edu.institution,
            bold: true,
            size: 20,
            font: FONT_FAMILY,
          }),
          new TextRun("\t"),
          new TextRun({
            text: `${edu.startDate} – ${edu.endDate || "Present"}`,
            italics: true,
            size: 19,
            font: FONT_FAMILY,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: edu.degree || edu.program,
            size: 19,
            font: FONT_FAMILY,
          }),
        ],
      })
    );
  }

  // ==============================================================
  // SECTION 2: EXPERIENCE (Dynamic Weighting Toggle)
  // When showExperience is false, this section is completely skipped
  // ==============================================================
  if (data.showExperience && data.experience && data.experience.length > 0) {
    addSectionHeader("Experience");

    for (const exp of data.experience) {
      sections.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 40, after: 10 },
          children: [
            new TextRun({
              text: exp.company,
              bold: true,
              size: 20,
              font: FONT_FAMILY,
            }),
            new TextRun("\t"),
            new TextRun({
              text: `${exp.startDate} – ${exp.endDate}`,
              italics: true,
              size: 19,
              font: FONT_FAMILY,
            }),
          ],
        }),
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: exp.role,
              italics: true,
              size: 19,
              font: FONT_FAMILY,
            }),
            new TextRun("\t"),
            new TextRun({
              text: exp.location,
              italics: true,
              size: 18,
              font: FONT_FAMILY,
              color: "4B5563",
            }),
          ],
        })
      );

      for (const bullet of exp.bulletPoints) {
        sections.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 10, after: 20 },
            children: [
              new TextRun({
                text: removeEmDashes(bullet),
                size: 19,
                font: FONT_FAMILY,
              }),
            ],
          })
        );
      }
    }
  }

  // ==============================================================
  // SECTION 3: SELECTED PROJECTS
  // Format: Name | Tech Stack (Left) \t Date (Right)
  // ==============================================================
  addSectionHeader("Selected Projects");

  for (const proj of data.projects) {
    const cleanTitle = proj.name.includes("|") ? proj.name.split("|")[0].trim() : proj.name;
    const cleanStack =
      proj.name.includes("|") && (!proj.techStack || proj.techStack === "C")
        ? proj.name.split("|").slice(1).join("|").trim()
        : proj.techStack;

    sections.push(
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { before: isCompact ? 25 : 40, after: isCompact ? 10 : 20 },
        children: [
          new TextRun({
            text: cleanTitle,
            bold: true,
            size: isCompact ? 19 : 20,
            font: FONT_FAMILY,
          }),
          ...(cleanStack
            ? [
                new TextRun({
                  text: ` | ${cleanStack}`,
                  size: isCompact ? 18 : 19,
                  font: FONT_FAMILY,
                  color: "374151",
                }),
              ]
            : []),
          new TextRun("\t"),
          new TextRun({
            text: proj.date,
            italics: true,
            size: isCompact ? 18 : 19,
            font: FONT_FAMILY,
          }),
        ],
      })
    );

    for (const bullet of proj.bulletPoints) {
      sections.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: isCompact ? 5 : 10, after: isCompact ? 12 : 20 },
          children: [
            new TextRun({
              text: removeEmDashes(bullet),
              size: isCompact ? 18 : 19,
              font: FONT_FAMILY,
            }),
          ],
        })
      );
    }
  }

  // ==============================================================
  // SECTION 4: TECHNICAL SKILLS (Strict 4 Categories)
  // ==============================================================
  addSectionHeader("Technical Skills");

  const addSkillCategory = (label: string, items: string[]) => {
    sections.push(
      new Paragraph({
        spacing: { before: isCompact ? 15 : 20, after: isCompact ? 15 : 20 },
        children: [
          new TextRun({
            text: `${label}: `,
            bold: true,
            size: isCompact ? 18 : 19,
            font: FONT_FAMILY,
          }),
          new TextRun({
            text: items.join(", "),
            size: isCompact ? 18 : 19,
            font: FONT_FAMILY,
          }),
        ],
      })
    );
  };

  addSkillCategory("Languages", data.skills.languages);
  addSkillCategory("Developer Tools", data.skills.developerTools);
  addSkillCategory("Technologies/Frameworks", data.skills.technologiesFrameworks);
  addSkillCategory("Project Management tools", data.skills.projectManagementTools);

  // ==============================================================
  // SECTION 5: RELEVANT COURSEWORK AND WORKSHOPS
  // ==============================================================
  if (data.coursework && data.coursework.length > 0) {
    addSectionHeader("Relevant Coursework and Workshops");

    for (const cw of data.coursework) {
      sections.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          bullet: { level: 0 },
          spacing: { before: isCompact ? 5 : 10, after: isCompact ? 10 : 20 },
          children: [
            new TextRun({
              text: cw.title,
              size: isCompact ? 18 : 19,
              font: FONT_FAMILY,
            }),
            ...(cw.date
              ? [
                  new TextRun("\t"),
                  new TextRun({
                    text: cw.date,
                    italics: true,
                    size: isCompact ? 17 : 18,
                    font: FONT_FAMILY,
                  }),
                ]
              : []),
          ],
        })
      );
    }
  }

  // ==============================================================
  // SECTION 6: EXTRACURRICULAR ACTIVITIES
  // ==============================================================
  if (data.showExtracurriculars !== false && data.extracurriculars && data.extracurriculars.length > 0) {
    addSectionHeader("Extracurricular Activities");

    for (const ec of data.extracurriculars) {
      sections.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: isCompact ? 25 : 40, after: isCompact ? 5 : 10 },
          children: [
            new TextRun({
              text: ec.organization,
              bold: true,
              size: isCompact ? 19 : 20,
              font: FONT_FAMILY,
            }),
            new TextRun("\t"),
            new TextRun({
              text: `${ec.startDate} – ${ec.endDate || "Present"}`,
              italics: true,
              size: isCompact ? 18 : 19,
              font: FONT_FAMILY,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: isCompact ? 15 : 30 },
          children: [
            new TextRun({
              text: ec.role,
              italics: true,
              size: isCompact ? 18 : 19,
              font: FONT_FAMILY,
            }),
          ],
        })
      );

      for (const bullet of ec.bulletPoints) {
        sections.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: isCompact ? 5 : 10, after: isCompact ? 12 : 20 },
            children: [
              new TextRun({
                text: removeEmDashes(bullet),
                size: isCompact ? 18 : 19,
                font: FONT_FAMILY,
              }),
            ],
          })
        );
      }
    }
  }

  // Margins: Standard (720 DXAs = 0.5") or Compact (540 DXAs = 0.375")
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: isCompact
              ? { top: 540, bottom: 540, left: 600, right: 600 }
              : { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: sections,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
