"use client";

import React, { forwardRef, useRef, useEffect, useState } from "react";
import { CVData, SectionId, DEFAULT_SECTION_ORDER } from "@/types/resume";
import { removeEmDashes } from "@/lib/sanitizer";

export interface HeightBudget {
  height: number;
  printableBudget: number;
  percentage: number;
  isOverflow: boolean;
}

export type TemplateSectionId =
  | "contact"
  | "education"
  | "experience"
  | "projects"
  | "skills"
  | "coursework"
  | "extracurriculars";

interface WissamCleanTemplateProps {
  data: CVData;
  scale?: number;
  onHeightBudgetChange?: (budget: HeightBudget) => void;
  onSectionClick?: (section: TemplateSectionId) => void;
  forceOverflowIndicator?: boolean;
}

export const WissamCleanTemplate = forwardRef<HTMLDivElement, WissamCleanTemplateProps>(
  ({ data, scale = 1, onHeightBudgetChange, onSectionClick, forceOverflowIndicator }, ref) => {
    const innerContentRef = useRef<HTMLDivElement>(null);
    const onHeightBudgetChangeRef = useRef(onHeightBudgetChange);
    onHeightBudgetChangeRef.current = onHeightBudgetChange;

    const [isInternalOverflow, setIsInternalOverflow] = useState(false);

    // Live Page Budget calculation via ResizeObserver
    useEffect(() => {
      if (!innerContentRef.current) return;
      const PRINTABLE_BUDGET = 1027; // 1027px printable A4 vertical budget at 96 DPI

      const calculateBudget = () => {
        if (!innerContentRef.current) return;
        const height = innerContentRef.current.scrollHeight;
        const percentage = Math.round((height / PRINTABLE_BUDGET) * 100);
        const isOverflow = height > PRINTABLE_BUDGET;
        setIsInternalOverflow(isOverflow);

        if (onHeightBudgetChangeRef.current) {
          onHeightBudgetChangeRef.current({
            height,
            printableBudget: PRINTABLE_BUDGET,
            percentage,
            isOverflow,
          });
        }
      };

      calculateBudget();

      const observer = new ResizeObserver(() => {
        calculateBudget();
      });

      observer.observe(innerContentRef.current);
      return () => observer.disconnect();
    }, [data]);

    const {
      contact,
      educationState,
      specializationTrack,
      showExperience,
      education,
      experience,
      projects,
      skills,
      coursework,
      extracurriculars,
      showExtracurriculars,
    } = data;

    const isCompact = data.styleDensity === "compact";
    const isOverflow = forceOverflowIndicator ?? isInternalOverflow;

    const fontPrimary = "'Calibri', 'Arial', sans-serif";

    const renderEducation = () => (
      <section
        key="education"
        onClick={() => onSectionClick?.("education")}
        className={`group relative ${isCompact ? "mb-2" : "mb-3"} ${
          onSectionClick
            ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
            : ""
        }`}
      >
        {onSectionClick && (
          <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
            Click to edit
          </span>
        )}

        <div
          className={`font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 ${
            isCompact ? "mb-1" : "mb-1.5"
          }`}
          style={{ fontSize: isCompact ? "10pt" : "10.5pt" }}
        >
          Education
        </div>

        {/* 42 Beirut Entry (With Conditional States A, B, C) */}
        <div className={isCompact ? "mb-1.5" : "mb-2"}>
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-gray-900" style={{ fontSize: isCompact ? "9.5pt" : "10pt" }}>
              42 Beirut - Level {contact.level}
            </span>
            <span className="text-gray-800 italic" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
              {educationState === "STATE_C_ALUMNUS" ? "2024" : "2023 – Present"}
            </span>
          </div>

          {educationState === "STATE_A_CORE" && (
            <div className="text-gray-800" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
              42 Core Curriculum - Architecture of Digital Technologies Program
            </div>
          )}

          {educationState === "STATE_B_SPECIALIZATION" && (
            <div className="text-gray-800" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
              <div>Completed the 42 Core Curriculum - Architecture of Digital Technologies Program</div>
              <div className="italic text-gray-700">
                Advanced Curriculum - {specializationTrack || "Advanced Software Architecture Track"}
              </div>
            </div>
          )}

          {educationState === "STATE_C_ALUMNUS" && (
            <div className="text-gray-800" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
              <div>42 Beirut Graduate &amp; Alumnus</div>
              {specializationTrack && (
                <div className="italic text-gray-700">Specialization: {specializationTrack}</div>
              )}
            </div>
          )}
        </div>

        {/* Previous University Degree (If provided) */}
        {education &&
          education
            .filter((edu) => !edu.institution.toLowerCase().includes("42 beirut"))
            .map((edu) => (
              <div key={edu.id} className={isCompact ? "mb-1.5" : "mb-2"}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-900" style={{ fontSize: isCompact ? "9.5pt" : "10pt" }}>
                    {edu.institution}
                  </span>
                  <span className="text-gray-800 italic" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                    {edu.startDate} – {edu.endDate || "Present"}
                  </span>
                </div>
                <div className="text-gray-800" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                  {edu.degree || edu.program}
                </div>
              </div>
            ))}
      </section>
    );

    const renderExperience = () => {
      if (!showExperience || !experience || experience.length === 0) return null;
      return (
        <section
          key="experience"
          onClick={() => onSectionClick?.("experience")}
          className={`group relative ${isCompact ? "mb-2" : "mb-3"} ${
            onSectionClick
              ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
              : ""
          }`}
        >
          {onSectionClick && (
            <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
              Click to edit
            </span>
          )}

          <div
            className={`font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 ${
              isCompact ? "mb-1" : "mb-1.5"
            }`}
            style={{ fontSize: isCompact ? "10pt" : "10.5pt" }}
          >
            Experience
          </div>

          {experience.map((exp) => (
            <div key={exp.id} className={isCompact ? "mb-2" : "mb-2.5"}>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-900" style={{ fontSize: isCompact ? "9.5pt" : "10pt" }}>
                  {exp.company}
                </span>
                <span className="text-gray-800 italic" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="italic text-gray-800" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                  {exp.role}
                </span>
                <span className="italic text-gray-600" style={{ fontSize: isCompact ? "8.5pt" : "9pt" }}>
                  {exp.location}
                </span>
              </div>
              <ul
                className={isCompact ? "list-disc ml-4 space-y-0 text-gray-800" : "list-disc ml-5 space-y-0.5 text-gray-800"}
                style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}
              >
                {exp.bulletPoints.map((bullet, idx) => (
                  <li key={idx} className="leading-snug">
                    {removeEmDashes(bullet)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      );
    };

    const renderProjects = () => {
      if (!projects || projects.length === 0) return null;
      return (
        <section
          key="projects"
          onClick={() => onSectionClick?.("projects")}
          className={`group relative ${isCompact ? "mb-2" : "mb-3"} ${
            onSectionClick
              ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
              : ""
          }`}
        >
          {onSectionClick && (
            <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
              Click to edit
            </span>
          )}

          <div
            className={`font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 ${
              isCompact ? "mb-1" : "mb-1.5"
            }`}
            style={{ fontSize: isCompact ? "10pt" : "10.5pt" }}
          >
            Selected Projects
          </div>

          {projects.map((proj) => {
            const cleanTitle = proj.name.includes("|") ? proj.name.split("|")[0].trim() : proj.name;
            const cleanStack =
              proj.name.includes("|") && (!proj.techStack || proj.techStack === "C")
                ? proj.name.split("|").slice(1).join("|").trim()
                : proj.techStack;

            const hasExplicitBullets = proj.bulletPoints && proj.bulletPoints.length > 0;
            const bulletsToRender = hasExplicitBullets
              ? proj.bulletPoints
              : [
                  `Developed ${cleanTitle} adhering to strict 42 Beirut C/POSIX system specifications.`,
                  "Implemented modular, memory-safe architecture verified via automated test suites.",
                ];

            return (
              <div key={proj.id} className={isCompact ? "mb-1.5" : "mb-2"}>
                <div className="flex justify-between items-baseline mb-0.5">
                  <div>
                    <span className="font-bold text-gray-900" style={{ fontSize: isCompact ? "9.5pt" : "10pt" }}>
                      {cleanTitle}
                    </span>
                    {cleanStack && (
                      <span className="text-gray-600 font-normal ml-1" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                        | {cleanStack}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-800 italic shrink-0 ml-2" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                    {proj.date}
                  </span>
                </div>

                <ul
                  className={isCompact ? "list-disc ml-4 space-y-0 text-gray-800" : "list-disc ml-5 space-y-0.5 text-gray-800"}
                  style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}
                >
                  {bulletsToRender.map((bullet, idx) => (
                    <li key={idx} className="leading-snug">
                      {removeEmDashes(bullet)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      );
    };

    const renderSkills = () => {
      if (!skills) return null;
      return (
        <section
          key="skills"
          onClick={() => onSectionClick?.("skills")}
          className={`group relative ${isCompact ? "mb-2" : "mb-3"} ${
            onSectionClick
              ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
              : ""
          }`}
        >
          {onSectionClick && (
            <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
              Click to edit
            </span>
          )}

          <div
            className={`font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 ${
              isCompact ? "mb-1" : "mb-1.5"
            }`}
            style={{ fontSize: isCompact ? "10pt" : "10.5pt" }}
          >
            Technical Skills
          </div>

          <div
            className={isCompact ? "space-y-0 text-gray-800" : "space-y-0.5 text-gray-800"}
            style={{ fontSize: isCompact ? "9pt" : "9.5pt", lineHeight: isCompact ? "1.3" : "1.4" }}
          >
            <div>
              <span className="font-bold text-gray-900">Languages:</span>{" "}
              {skills.languages.join(", ")}
            </div>
            <div>
              <span className="font-bold text-gray-900">Developer Tools:</span>{" "}
              {skills.developerTools.join(", ")}
            </div>
            <div>
              <span className="font-bold text-gray-900">Technologies/Frameworks:</span>{" "}
              {skills.technologiesFrameworks.join(", ")}
            </div>
            <div>
              <span className="font-bold text-gray-900">Project Management tools:</span>{" "}
              {skills.projectManagementTools.join(", ")}
            </div>
          </div>
        </section>
      );
    };

    const renderCoursework = () => {
      if (!coursework || coursework.length === 0) return null;
      return (
        <section
          key="coursework"
          onClick={() => onSectionClick?.("coursework")}
          className={`group relative ${isCompact ? "mb-2" : "mb-3"} ${
            onSectionClick
              ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
              : ""
          }`}
        >
          {onSectionClick && (
            <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
              Click to edit
            </span>
          )}

          <div
            className={`font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 ${
              isCompact ? "mb-1" : "mb-1.5"
            }`}
            style={{ fontSize: isCompact ? "10pt" : "10.5pt" }}
          >
            Relevant Coursework and Workshops
          </div>

          <ul
            className={isCompact ? "list-disc ml-4 space-y-0 text-gray-800" : "list-disc ml-5 space-y-0.5 text-gray-800"}
            style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}
          >
            {coursework.map((cw) => (
              <li key={cw.id} className="leading-snug">
                <div className="flex justify-between items-baseline">
                  <span>{cw.title}</span>
                  {cw.date && (
                    <span className="text-gray-700 italic ml-2" style={{ fontSize: isCompact ? "8.5pt" : "9pt" }}>
                      {cw.date}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      );
    };

    const renderExtracurriculars = () => {
      if (showExtracurriculars === false || !extracurriculars || extracurriculars.length === 0) return null;
      return (
        <section
          key="extracurriculars"
          onClick={() => onSectionClick?.("extracurriculars")}
          className={`group relative ${isCompact ? "mb-2" : "mb-3"} ${
            onSectionClick
              ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
              : ""
          }`}
        >
          {onSectionClick && (
            <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
              Click to edit
            </span>
          )}

          <div
            className={`font-bold uppercase tracking-wider text-gray-900 border-b border-gray-800 pb-0.5 ${
              isCompact ? "mb-1" : "mb-1.5"
            }`}
            style={{ fontSize: isCompact ? "10pt" : "10.5pt" }}
          >
            Extracurricular Activities
          </div>

          {extracurriculars.map((ec) => (
            <div key={ec.id} className={isCompact ? "mb-1.5" : "mb-2"}>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-900" style={{ fontSize: isCompact ? "9.5pt" : "10pt" }}>
                  {ec.organization}
                </span>
                <span className="text-gray-800 italic" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                  {ec.startDate} – {ec.endDate || "Present"}
                </span>
              </div>
              <div className="italic text-gray-800 mb-0.5" style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}>
                {ec.role}
              </div>
              {ec.bulletPoints && ec.bulletPoints.length > 0 && (
                <ul
                  className={isCompact ? "list-disc ml-4 space-y-0 text-gray-800" : "list-disc ml-5 space-y-0.5 text-gray-800"}
                  style={{ fontSize: isCompact ? "9pt" : "9.5pt" }}
                >
                  {ec.bulletPoints.map((bullet, idx) => (
                    <li key={idx} className="leading-snug">
                      {removeEmDashes(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      );
    };

    return (
      <div
        ref={ref}
        className="cv-sheet relative bg-white text-gray-950 font-sans shadow-2xl mx-auto print:shadow-none print:m-0"
        style={{
          width: "210mm",
          minHeight: "297mm",
          fontFamily: fontPrimary,
          fontSize: isCompact ? "9.5pt" : "10pt",
          lineHeight: isCompact ? "1.25" : "1.35",
          padding: isCompact ? "10mm 12mm 10mm 12mm" : "12mm 15mm 12mm 15mm",
          boxSizing: "border-box",
          color: "#111827",
          transformOrigin: "top center",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
        }}
      >
        {/* Dashed 1-Page A4 Cutoff Boundary Indicator (Screen Only, Hidden in Print) */}
        {isOverflow && (
          <div
            className="absolute left-0 right-0 border-b-2 border-dashed border-zinc-800 pointer-events-none z-30 print:hidden flex items-center justify-end px-3"
            style={{ top: "1123px" }}
          >
            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-900 bg-zinc-100 border border-zinc-300 px-2 py-0.5 rounded shadow-sm -mt-6">
              1-Page A4 Cutoff Boundary (1123px)
            </span>
          </div>
        )}

        {/* Inner Content Observed by ResizeObserver */}
        <div ref={innerContentRef} className="w-full">
        {/* ============================================================== */}
        {/* HEADER: Centered Name, Subtitle, Contact Strip                 */}
        {/* ============================================================== */}
        <header
          onClick={() => onSectionClick?.("contact")}
          className={`group relative ${isCompact ? "text-center mb-2.5 pb-0.5" : "text-center mb-4 pb-1"} ${
            onSectionClick
              ? "cursor-pointer hover:outline hover:outline-1 hover:outline-zinc-800 hover:bg-zinc-100/60 rounded transition-all print:cursor-default print:outline-none print:bg-transparent"
              : ""
          }`}
        >
          {onSectionClick && (
            <span className="absolute top-0 right-1 text-[9px] font-semibold bg-black text-white px-1.5 py-0.5 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm print:hidden">
              Click to edit
            </span>
          )}

          <h1
            className="font-bold tracking-tight text-gray-900"
            style={{ fontSize: isCompact ? "18pt" : "20pt", lineHeight: "1.1", marginBottom: "2px" }}
          >
            {contact.fullName.toUpperCase()}
          </h1>

          <div
            className="text-gray-700 font-semibold mb-0.5"
            style={{ fontSize: isCompact ? "10pt" : "11pt" }}
          >
            42 Student – Level {contact.level}
          </div>

          <div
            className="flex items-center justify-center flex-wrap text-gray-600 gap-x-2"
            style={{ fontSize: isCompact ? "8.5pt" : "9pt" }}
          >
            {contact.location && (
              <>
                <span>{contact.location}</span>
                <span>|</span>
              </>
            )}
            <span>{contact.email}</span>
            <span>|</span>
            <span>{contact.phoneNumber}</span>
            <span>|</span>
            <a
              href={`https://${contact.linkedinUrl.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-gray-700"
            >
              {contact.linkedinUrl.replace(/^https?:\/\//, "")}
            </a>
            <span>|</span>
            <a
              href={`https://${contact.githubUrl.replace(/^https?:\/\//, "")}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-gray-700"
            >
              {contact.githubUrl.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </header>

        {/* ============================================================== */}
        {/* DYNAMIC SECTIONS ORDERED BY cvData.sectionOrder               */}
        {/* ============================================================== */}
        {(data.sectionOrder && data.sectionOrder.length > 0
          ? data.sectionOrder
          : DEFAULT_SECTION_ORDER
        ).map((secId) => {
          switch (secId) {
            case "education":
              return renderEducation();
            case "experience":
              return renderExperience();
            case "projects":
              return renderProjects();
            case "skills":
              return renderSkills();
            case "coursework":
              return renderCoursework();
            case "extracurriculars":
              return renderExtracurriculars();
            default:
              return null;
          }
        })}
        </div>

        {/* Global Print-CSS Style: Vector A4 PDF via window.print() */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            html,
            body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .cv-sheet {
              box-shadow: none !important;
              margin: 0 !important;
              width: 100% !important;
              min-height: 100vh !important;
              padding: ${isCompact ? "10mm 12mm 10mm 12mm" : "12mm 15mm 12mm 15mm"} !important;
              transform: none !important;
            }
          }
        `}</style>
      </div>
    );
  }
);

WissamCleanTemplate.displayName = "WissamCleanTemplate";
