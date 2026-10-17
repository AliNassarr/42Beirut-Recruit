"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCVStore, normalizeGitHub, normalizeLinkedIn } from "@/lib/store/cv-store";
import {
  WissamCleanTemplate,
  HeightBudget,
  TemplateSectionId,
} from "@/components/templates/WissamCleanTemplate";
import { generateDrWissamDocx } from "@/lib/docx-generator";
import {
  Download,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  Building2,
  GraduationCap,
  Briefcase,
  Code2,
  User,
  Sliders,
  Loader2,
  CheckCircle2,
  Key,
  X,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Scissors,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// Strong engineering verbs for rotating bullet points
const STRONG_VERBS = [
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

// Lightweight smart bullet tightener
function shortenBullet(bullet: string): string {
  let cleaned = bullet
    .replace(/[—–]/g, ",")
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bresponsible for implementing\b/gi, "implemented")
    .replace(/\bresponsible for building\b/gi, "built")
    .replace(/\bresponsible for developing\b/gi, "developed")
    .replace(/\bresponsible for designing\b/gi, "designed")
    .replace(/\bresponsible for\b/gi, "")
    .replace(/\bsuccessfully\s+/gi, "")
    .replace(/\bwhich allowed the team to\b/gi, "enabling the team to")
    .replace(/\bwhich allowed for\b/gi, "enabling")
    .replace(/\bwhich resulted in\b/gi, "resulting in")
    .replace(/\bfor the purpose of\b/gi, "to")
    .replace(/\bwith the aim of\b/gi, "to")
    .replace(/\bdue to the fact that\b/gi, "because")
    .replace(/\bas well as\b/gi, "and")
    .replace(/\butilizing\b/gi, "using")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length > 165 && cleaned.includes(";")) {
    cleaned = cleaned.split(";")[0].trim() + ".";
  } else if (cleaned.length > 175 && cleaned.includes(", and ")) {
    cleaned = cleaned.split(", and ")[0].trim() + ".";
  }

  if (!cleaned.endsWith(".")) {
    cleaned += ".";
  }
  return cleaned;
}

// Rotate bullet opening verb
function rotateBulletVerb(bullet: string): string {
  const words = bullet.trim().split(" ");
  if (words.length === 0) return bullet;
  const firstWord = words[0].replace(/[^a-zA-Z]/g, "");

  const currIndex = STRONG_VERBS.findIndex(
    (v) => v.toLowerCase() === firstWord.toLowerCase()
  );

  const nextVerb =
    currIndex >= 0
      ? STRONG_VERBS[(currIndex + 1) % STRONG_VERBS.length]
      : STRONG_VERBS[0];

  words[0] = nextVerb;
  return words.join(" ");
}

export function Step4SplitEditor() {
  const {
    cvData,
    setCVData,
    updateContact,
    updateSkills,
    updateProjectBullet,
    addProjectBullet,
    removeProjectBullet,
    addProjectToCV,
    removeProjectFromCV,
    moveProject,
    addExperienceItem,
    updateExperienceItem,
    removeExperienceItem,
    moveExperience,
    addEducationItem,
    updateEducationItem,
    removeEducationItem,
    setEducationState,
    setSpecializationTrack,
    setShowExperience,
    styleDensity,
    setStyleDensity,
    showExtracurriculars,
    setShowExtracurriculars,
    userGeminiKey,
    setUserGeminiKey,
    userGroqKey,
    setUserGroqKey,
    setCurrentStep,
    projectAnswers,
    studentProfile,
  } = useCVStore();

  const [activeTab, setActiveTab] = useState<
    "projects" | "experience" | "education" | "skills" | "contact" | "settings"
  >("projects");
  const [scale, setScale] = useState(0.85);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [regeneratingProjId, setRegeneratingProjId] = useState<string | null>(null);
  const [isBYOKOpen, setIsBYOKOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    desc: string;
    type: "success" | "info";
  } | null>(null);

  const [pageBudget, setPageBudget] = useState<HeightBudget>({
    height: 980,
    printableBudget: 1027,
    percentage: 95,
    isOverflow: false,
  });

  const printRef = useRef<HTMLDivElement>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss export toast notifications
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Handle PDF Export using native browser vector print (Zero-cost)
  const handlePrintPDF = () => {
    setToastMessage({
      title: "Opening Print-to-PDF...",
      desc: "Opening Print-to-PDF! Ensure 'Headers and footers' is unchecked in your browser print dialog.",
      type: "info",
    });
    window.print();
  };

  // Handle Word (.docx) Export using client-side docx npm package
  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const blob = await generateDrWissamDocx(cvData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cvData.contact.fullName.replace(/\s+/g, "_")}_42_Beirut_CV.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage({
        title: "Word (.docx) Exported!",
        desc: "Word (.docx) downloaded! Formatted with native right-aligned tab stops.",
        type: "success",
      });
    } catch (err: any) {
      console.error("DOCX generation error:", err);
      alert("Failed to export Word document: " + err.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // 1-Click Auto-Fit 1-Page
  const handleAutoFit = () => {
    setStyleDensity("compact");
    if (cvData.extracurriculars.length === 0) {
      setShowExtracurriculars(false);
    }
    setToastMessage({
      title: "Auto-Fit Applied!",
      desc: "Switched to Compact (1-Page) density to guarantee strict Dr. Wissam 1-page alignment.",
      type: "success",
    });
  };

  // Click-to-Focus sync from canvas section to editor tab
  const handleSectionClick = (section: TemplateSectionId) => {
    if (section === "contact") {
      setActiveTab("contact");
    } else if (section === "education") {
      setActiveTab("education");
    } else if (section === "experience") {
      setActiveTab("experience");
    } else if (section === "projects") {
      setActiveTab("projects");
    } else if (section === "skills") {
      setActiveTab("skills");
    } else {
      setActiveTab("settings");
    }

    if (formScrollRef.current) {
      formScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Regenerate project bullets with fresh angle and anti-duplication
  const handleRegenerateProject = async (proj: any) => {
    setRegeneratingProjId(proj.id);
    try {
      const personalNote = projectAnswers[proj.slug || ""]?.["personal-notes"] || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userGeminiKey) headers["x-user-gemini-key"] = userGeminiKey;
      if (userGroqKey) headers["x-user-groq-key"] = userGroqKey;

      const res = await fetch("/api/ai/regenerate-project-bullets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          projectSlug: proj.slug || proj.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          projectName: proj.name,
          techStack: proj.techStack,
          targetRole: cvData.targetRole,
          userNotes: personalNote,
          studentLogin: studentProfile?.login,
        }),
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.bullets) && json.bullets.length > 0) {
        const nextProjects = cvData.projects.map((p) =>
          p.id === proj.id ? { ...p, bulletPoints: json.bullets } : p
        );
        setCVData({ ...cvData, projects: nextProjects });
      } else {
        alert("Failed to regenerate bullets: " + (json.error || "Unknown error"));
      }
    } catch (err: any) {
      alert("Error regenerating bullets: " + err.message);
    } finally {
      setRegeneratingProjId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentStep("SETUP")}
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
          >
            &larr; Reconfigure Projects
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-sm font-bold text-slate-200">
            {cvData.contact.fullName} &bull; <span className="text-cyan-400">Dr. Wissam CV</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {cvData.educationState === "STATE_A_CORE"
              ? "State A: In Core"
              : cvData.educationState === "STATE_B_SPECIALIZATION"
              ? "State B: Specialization"
              : "State C: Alumnus"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Live Page-Budget Meter */}
          <div className="flex items-center">
            {!pageBudget.isOverflow ? (
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5"
                title={`Live Content Height: ${pageBudget.height}px / ${pageBudget.printableBudget}px printable budget`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">1-Page Fit ({pageBudget.percentage}%)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 animate-pulse"
                  title={`Live Content Height: ${pageBudget.height}px exceeds ${pageBudget.printableBudget}px budget by ${pageBudget.height - pageBudget.printableBudget}px!`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-bold">Page Overflow ({pageBudget.percentage}%)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFit}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer"
                  title="Switch to Compact density and optimize spacing to guarantee strict 1-page fit"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Fit 1-Page</span>
                </button>
              </div>
            )}
          </div>

          {/* Density Control (Standard vs Compact) */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs mr-1">
            <button
              onClick={() => setStyleDensity("standard")}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                cvData.styleDensity !== "compact"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Standard spacing"
            >
              Standard
            </button>
            <button
              onClick={() => setStyleDensity("compact")}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                cvData.styleDensity === "compact"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Compact spacing for strict 1-page fit"
            >
              Compact (1-Page)
            </button>
          </div>

          {/* Scale Slider */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 mr-2">
            <span>Zoom</span>
            <input
              type="range"
              min="0.6"
              max="1.1"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="w-8 text-[11px]">{Math.round(scale * 100)}%</span>
          </div>

          {/* AI Settings / BYOK Button */}
          <button
            onClick={() => setIsBYOKOpen(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
              userGeminiKey || userGroqKey
                ? "bg-purple-950/40 border-purple-500/50 text-purple-300 hover:bg-purple-900/50"
                : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
            }`}
            title="Configure personal Gemini or Groq API keys to bypass rate limits"
          >
            <Key className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Keys {userGeminiKey || userGroqKey ? "(Custom)" : "(BYOK)"}</span>
          </button>

          {/* Export to Word Button */}
          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isExportingDocx ? "Generating..." : "Export Word (.docx)"}</span>
          </button>

          {/* Export to PDF Button */}
          <button
            onClick={handlePrintPDF}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export PDF (Vector)</span>
          </button>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================== */}
        {/* LEFT PANE: Form Editor with Tabs                               */}
        {/* ============================================================== */}
        <aside className="w-full lg:w-[480px] border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0 print:hidden">
          {/* Section Tab Bar */}
          <div className="flex border-b border-slate-800 text-xs font-semibold overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-3 py-3 text-center border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === "projects"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Projects ({cvData.projects.length})
            </button>
            <button
              onClick={() => setActiveTab("experience")}
              className={`px-3 py-3 text-center border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === "experience"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Experience ({cvData.experience.length})
            </button>
            <button
              onClick={() => setActiveTab("education")}
              className={`px-3 py-3 text-center border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === "education"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Education
            </button>
            <button
              onClick={() => setActiveTab("skills")}
              className={`px-3 py-3 text-center border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === "skills"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Skills
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`px-3 py-3 text-center border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === "contact"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Header
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-3 text-center border-b-2 whitespace-nowrap transition cursor-pointer ${
                activeTab === "settings"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Layout
            </button>
          </div>

          {/* Tab Content Body */}
          <div ref={formScrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 1. PROJECTS TAB */}
            {activeTab === "projects" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Selected Projects ({cvData.projects.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      addProjectToCV({
                        name: "BC Capture – Mobile Inventory Scanner",
                        techStack: "Next.js, Supabase, Cloudflare R2, Vision AI",
                        date: "2026",
                        bulletPoints: [
                          "Engineered a mobile-first progressive web scanner allowing in-store staff to photograph, process, and digitize physical retail inventory in under 15 seconds per item.",
                          "Designed an asynchronous background upload queue to offload heavy image payloads to Cloudflare R2, preventing UI thread freezing and ensuring smooth touch responsiveness on mobile devices.",
                          "Integrated Vision AI OCR pipelines to automatically extract product titles, brands, weights, and nutritional data from camera captures with automated field validation.",
                        ],
                      })
                    }
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                </div>

                {cvData.projects.map((proj, projIdx) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 uppercase font-semibold">Project Title</label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) => {
                            const next = cvData.projects.map((p) =>
                              p.id === proj.id ? { ...p, name: e.target.value } : p
                            );
                            setCVData({ ...cvData, projects: next });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-bold"
                        />
                      </div>
                      <div className="w-28">
                        <label className="text-[10px] text-slate-500 uppercase font-semibold">Date</label>
                        <input
                          type="text"
                          value={proj.date}
                          onChange={(e) => {
                            const next = cvData.projects.map((p) =>
                              p.id === proj.id ? { ...p, date: e.target.value } : p
                            );
                            setCVData({ ...cvData, projects: next });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                        />
                      </div>
                      <div className="flex items-center gap-0.5 mt-3">
                        <button
                          type="button"
                          onClick={() => moveProject(projIdx, "up")}
                          disabled={projIdx === 0}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition cursor-pointer"
                          title="Move project up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveProject(projIdx, "down")}
                          disabled={projIdx === cvData.projects.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition cursor-pointer"
                          title="Move project down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeProjectFromCV(proj.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                          title="Remove project from CV"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-semibold">
                        Tech Stack (Comma-separated)
                      </label>
                      <input
                        type="text"
                        value={proj.techStack}
                        onChange={(e) => {
                          const next = cvData.projects.map((p) =>
                            p.id === proj.id ? { ...p, techStack: e.target.value } : p
                          );
                          setCVData({ ...cvData, projects: next });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300"
                      />
                    </div>

                    {/* Bullet Points */}
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Bullet Points
                      </label>
                      {proj.bulletPoints.map((bullet, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <textarea
                            rows={2}
                            value={bullet}
                            onChange={(e) => updateProjectBullet(proj.id, idx, e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                          />
                          <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const shortened = shortenBullet(bullet);
                                updateProjectBullet(proj.id, idx, shortened);
                              }}
                              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition cursor-pointer flex items-center gap-1 border border-slate-800"
                              title="Shorten bullet: trim wordy clauses to fit cleanly on 1-2 lines"
                            >
                              <Scissors className="w-2.5 h-2.5 text-cyan-400" />
                              <span>Shorten</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const rotated = rotateBulletVerb(bullet);
                                updateProjectBullet(proj.id, idx, rotated);
                              }}
                              className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded transition cursor-pointer flex items-center gap-1 border border-slate-800"
                              title="Rotate opening verb with strong past-tense engineering verb"
                            >
                              <RefreshCw className="w-2.5 h-2.5 text-purple-400" />
                              <span>Rotate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProjectBullet(proj.id, idx)}
                              className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer self-end"
                              title="Remove bullet"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        {proj.bulletPoints.length < 4 && (
                          <button
                            onClick={() => addProjectBullet(proj.id)}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Add bullet point
                          </button>
                        )}

                        {/* REGENERATE WITH FRESH ANGLE BUTTON */}
                        <button
                          onClick={() => handleRegenerateProject(proj)}
                          disabled={regeneratingProjId === proj.id}
                          className="text-[11px] py-1 px-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {regeneratingProjId === proj.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Cycling fresh angle...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-cyan-400" />
                              <span>Regenerate with Fresh Angle</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. EXPERIENCE TAB */}
            {activeTab === "experience" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-cyan-400" />
                      <span>Experience Section</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Toggle ON/OFF dynamically. Off reallocates space to Projects.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !cvData.showExperience;
                      setShowExperience(next);
                      if (next && cvData.experience.length === 0) {
                        addExperienceItem({
                          company: "Company Name",
                          role: "Software Developer",
                          location: "Beirut, Lebanon",
                          startDate: "2023",
                          endDate: "Present",
                        });
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      cvData.showExperience ? "bg-cyan-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        cvData.showExperience ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {cvData.showExperience ? (
                  <div className="space-y-4">
                    {cvData.experience.map((exp, expIdx) => (
                      <div
                        key={exp.id}
                        className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                      >
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                          <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Job #{expIdx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveExperience(expIdx, "up")}
                              disabled={expIdx === 0}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition cursor-pointer"
                              title="Move job up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveExperience(expIdx, "down")}
                              disabled={expIdx === cvData.experience.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 transition cursor-pointer"
                              title="Move job down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeExperienceItem(exp.id)}
                              className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition cursor-pointer p-1"
                              title="Remove job from experience"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Company</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperienceItem(exp.id, { company: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Role</label>
                            <input
                              type="text"
                              value={exp.role}
                              onChange={(e) => updateExperienceItem(exp.id, { role: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Location</label>
                            <input
                              type="text"
                              value={exp.location}
                              onChange={(e) => updateExperienceItem(exp.id, { location: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Dates</label>
                            <input
                              type="text"
                              value={`${exp.startDate} – ${exp.endDate}`}
                              onChange={(e) => {
                                const parts = e.target.value.split(/[–-]/);
                                updateExperienceItem(exp.id, {
                                 startDate: parts[0]?.trim() || "2023",
                                  endDate: parts[1]?.trim() || "Present",
                                });
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                        </div>

                        {/* Bullet Points */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Bullet Points
                          </label>
                          {exp.bulletPoints.map((bullet, bIdx) => (
                            <div key={bIdx} className="flex gap-2 items-start">
                              <textarea
                                rows={2}
                                value={bullet}
                                onChange={(e) => {
                                  const nextBullets = [...exp.bulletPoints];
                                  nextBullets[bIdx] = e.target.value;
                                  updateExperienceItem(exp.id, { bulletPoints: nextBullets });
                                }}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                              />
                              <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const shortened = shortenBullet(bullet);
                                    const nextBullets = [...exp.bulletPoints];
                                    nextBullets[bIdx] = shortened;
                                    updateExperienceItem(exp.id, { bulletPoints: nextBullets });
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition cursor-pointer flex items-center gap-1 border border-slate-800"
                                  title="Shorten bullet: trim wordy clauses to fit cleanly on 1-2 lines"
                                >
                                  <Scissors className="w-2.5 h-2.5 text-cyan-400" />
                                  <span>Shorten</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const rotated = rotateBulletVerb(bullet);
                                    const nextBullets = [...exp.bulletPoints];
                                    nextBullets[bIdx] = rotated;
                                    updateExperienceItem(exp.id, { bulletPoints: nextBullets });
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-purple-300 hover:bg-slate-800 rounded transition cursor-pointer flex items-center gap-1 border border-slate-800"
                                  title="Rotate opening verb with strong past-tense engineering verb"
                                >
                                  <RefreshCw className="w-2.5 h-2.5 text-purple-400" />
                                  <span>Rotate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextBullets = exp.bulletPoints.filter((_, idx) => idx !== bIdx);
                                    updateExperienceItem(exp.id, { bulletPoints: nextBullets });
                                  }}
                                  className="p-1 text-slate-500 hover:text-red-400 rounded transition cursor-pointer self-end"
                                  title="Remove bullet"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              updateExperienceItem(exp.id, {
                                bulletPoints: [...exp.bulletPoints, "Contributed to software development and system testing."],
                              });
                            }}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer pt-1"
                          >
                            <Plus className="w-3 h-3" /> Add bullet point
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        addExperienceItem({
                          company: "Company Name",
                          role: "Software Developer",
                          location: "Beirut, Lebanon",
                          startDate: "2023",
                          endDate: "Present",
                        })
                      }
                      className="w-full py-2.5 border border-dashed border-slate-700 hover:border-cyan-400 rounded-xl text-xs text-cyan-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Job / Internship
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-400">
                    <p className="mb-2">Experience is currently toggled OFF.</p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Its vertical space has been reallocated to Selected Projects to maintain a full 1-page layout.
                    </p>
                    <button
                      onClick={() => setShowExperience(true)}
                      className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded-lg text-xs font-semibold hover:bg-cyan-500/30 transition"
                    >
                      Enable Experience Section
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. EDUCATION TAB */}
            {activeTab === "education" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-cyan-400" />
                    <span>42 Beirut Education Milestone</span>
                  </span>

                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      onClick={() => setEducationState("STATE_A_CORE")}
                      className={`py-1.5 text-center font-semibold rounded ${
                        cvData.educationState === "STATE_A_CORE" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      In Core (A)
                    </button>
                    <button
                      onClick={() => setEducationState("STATE_B_SPECIALIZATION")}
                      className={`py-1.5 text-center font-semibold rounded ${
                        cvData.educationState === "STATE_B_SPECIALIZATION" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      Specialization (B)
                    </button>
                    <button
                      onClick={() => setEducationState("STATE_C_ALUMNUS")}
                      className={`py-1.5 text-center font-semibold rounded ${
                        cvData.educationState === "STATE_C_ALUMNUS" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                      }`}
                    >
                      Alumnus (C)
                    </button>
                  </div>

                  {cvData.educationState === "STATE_B_SPECIALIZATION" && (
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase font-semibold">Specialization Track</label>
                      <input
                        type="text"
                        value={cvData.specializationTrack || ""}
                        onChange={(e) => setSpecializationTrack(e.target.value)}
                        placeholder="e.g. Cybersecurity Track"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Additional University Degrees */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Additional University Degrees ({cvData.education.filter((e) => !e.institution.toLowerCase().includes("42 beirut")).length})
                    </span>
                    <button
                      onClick={() =>
                        addEducationItem({
                          institution: "Lebanese University",
                          degree: "Bachelor of Science in Computer Science",
                          startDate: "2019",
                          endDate: "2023",
                        })
                      }
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Degree
                    </button>
                  </div>

                  {cvData.education
                    .filter((e) => !e.institution.toLowerCase().includes("42 beirut"))
                    .map((edu) => (
                      <div
                        key={edu.id}
                        className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-800/80">
                          <span className="text-xs font-semibold text-slate-300">{edu.institution}</span>
                          <button
                            onClick={() => removeEducationItem(edu.id)}
                            className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Institution</label>
                            <input
                              type="text"
                              value={edu.institution}
                              onChange={(e) => updateEducationItem(edu.id, { institution: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 uppercase font-semibold">Degree</label>
                            <input
                              type="text"
                              value={edu.degree || edu.program}
                              onChange={(e) => updateEducationItem(edu.id, { degree: e.target.value, program: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 uppercase font-semibold">Years</label>
                          <input
                            type="text"
                            value={`${edu.startDate} – ${edu.endDate || "Present"}`}
                            onChange={(e) => {
                              const parts = e.target.value.split(/[–-]/);
                              updateEducationItem(edu.id, {
                                startDate: parts[0]?.trim() || "2020",
                                endDate: parts[1]?.trim() || "2024",
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 4. SKILLS TAB */}
            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="bg-cyan-950/20 border border-cyan-500/20 p-3 rounded-xl text-xs text-cyan-300">
                  Dr. Wissam Template requires strictly these 4 exact categories.
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Languages:</label>
                  <input
                    type="text"
                    value={cvData.skills.languages.join(", ")}
                    onChange={(e) =>
                      updateSkills({
                        languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Developer Tools:</label>
                  <input
                    type="text"
                    value={cvData.skills.developerTools.join(", ")}
                    onChange={(e) =>
                      updateSkills({
                        developerTools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Technologies/Frameworks:
                  </label>
                  <input
                    type="text"
                    value={cvData.skills.technologiesFrameworks.join(", ")}
                    onChange={(e) =>
                      updateSkills({
                        technologiesFrameworks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Project Management tools:
                  </label>
                  <input
                    type="text"
                    value={cvData.skills.projectManagementTools.join(", ")}
                    onChange={(e) =>
                      updateSkills({
                        projectManagementTools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* 5. CONTACT / HEADER TAB */}
            {activeTab === "contact" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={cvData.contact.fullName}
                    onChange={(e) => updateContact({ fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    value={cvData.contact.email}
                    onChange={(e) => updateContact({ email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={cvData.contact.phoneNumber}
                    onChange={(e) => updateContact({ phoneNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={cvData.contact.linkedinUrl}
                    onChange={(e) => updateContact({ linkedinUrl: e.target.value })}
                    onBlur={(e) => updateContact({ linkedinUrl: normalizeLinkedIn(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={cvData.contact.githubUrl}
                    onChange={(e) => updateContact({ githubUrl: e.target.value })}
                    onBlur={(e) => updateContact({ githubUrl: normalizeGitHub(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* 6. LAYOUT & DENSITY SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <Sliders className="w-4 h-4" />
                    <span>Page Spacing & Density</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dr. Wissam Sammouri&apos;s CV template requires a strictly balanced 1-page A4 document. If you have 4 projects or extensive work experience, use Compact mode to prevent page overflow.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setStyleDensity("standard")}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                        cvData.styleDensity !== "compact"
                          ? "bg-cyan-500/10 border-cyan-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="font-semibold text-xs">Standard Density</div>
                      <div className="text-[10px] text-slate-400 mt-1">12mm margins, 1.35 line height. Ideal for 3 projects.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStyleDensity("compact")}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                        cvData.styleDensity === "compact"
                          ? "bg-cyan-500/10 border-cyan-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div className="font-semibold text-xs">Compact (1-Page Fit)</div>
                      <div className="text-[10px] text-slate-400 mt-1">10mm margins, 1.25 line height. Ideal for 4+ projects or experience.</div>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Optional Section Toggles
                  </div>

                  {/* Extracurriculars Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cvData.showExtracurriculars !== false}
                      onChange={(e) => setShowExtracurriculars(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">Include Extracurricular Activities</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Shows campus mentoring, clubs, or external activities. Uncheck to save vertical space.
                      </div>
                    </div>
                  </label>

                  {/* Work Experience Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cvData.showExperience}
                      onChange={(e) => setShowExperience(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-0 accent-cyan-400"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">Include Work Experience Section</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Toggle off if you want a pure academic / 42 project-focused 1-page CV.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT PANE: Live A4 Visual Canvas Preview                      */}
        {/* ============================================================== */}
        <main className="flex-1 overflow-auto bg-slate-950/80 p-8 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
          <div className="relative">
            <WissamCleanTemplate
              ref={printRef}
              data={cvData}
              scale={scale}
              onHeightBudgetChange={setPageBudget}
              onSectionClick={handleSectionClick}
            />
          </div>
        </main>
      </div>

      {/* Export Confirmation Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-cyan-500/40 text-white p-4 rounded-2xl shadow-2xl shadow-cyan-500/10 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200 print:hidden">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold text-white mb-0.5">{toastMessage.title}</h4>
            <p className="text-[11px] text-slate-300 leading-snug">{toastMessage.desc}</p>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
            title="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* BYOK Modal / Drawer */}
      {isBYOKOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setIsBYOKOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <Key className="w-5 h-5" />
              <h2 className="text-lg font-bold text-white">Campus AI Settings & BYOK</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              42Beirut-Recruit provides zero-cost AI generation via campus Google Gemini and Groq Cloud. If the campus shared quota reaches rate limits during busy project deadlines, provide your own free personal API key below. Keys are stored locally on your device in browser localStorage.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Personal Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>Get Free Gemini Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={userGeminiKey}
                  onChange={(e) => setUserGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Personal Groq Cloud API Key
                  </label>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
                  >
                    <span>Get Free Groq Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  value={userGroqKey}
                  onChange={(e) => setUserGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Provider Priority Order
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Primary: Google Gemini (gemini-2.5-flash)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>Failover: Groq Cloud (llama-3.3-70b-versatile, instant failover on 429)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Status: {userGeminiKey || userGroqKey ? "Custom Student Keys Active" : "Shared Campus Pool Active"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBYOKOpen(false)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
