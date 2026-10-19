"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  useCVStore,
  normalizeGitHub,
  normalizeLinkedIn,
} from "@/lib/store/cv-store";
import { HeightBudget, TemplateSectionId } from "@/components/templates/WissamCleanTemplate";
import { generateDrWissamDocx } from "@/lib/docx-generator";
import { CanvasPreviewViewport } from "./CanvasPreviewViewport";
import { BulletEditorRow } from "./BulletEditorRow";
import { ScoreEngineModal } from "./ScoreEngineModal";
import { FortyTwoLogo } from "@/components/ui/FortyTwoLogo";
import {
  RefreshCw,
  Sliders,
  Printer,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Target,
  FileText,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowUpDown,
  Info,
} from "lucide-react";
import { MOCK_42_STUDENT, createInitialCVFromIntra } from "@/lib/intra/mock-data";
import { SectionId, DEFAULT_SECTION_ORDER } from "@/types/resume";

export type StudioSection =
  | "CONTACT"
  | "EXPERIENCE"
  | "PROJECTS"
  | "EDUCATION"
  | "SKILLS"
  | "SUMMARY";


const SECTION_METADATA: Record<
  SectionId,
  { label: string; desc: string; getCount?: (cvData: any) => string }
> = {
  education: {
    label: "Education",
    desc: "42 Beirut cursus standing & academic degrees",
    getCount: (cv) => `Level ${cv.contact?.level ?? 9}`,
  },
  experience: {
    label: "Professional Experience",
    desc: "Software engineering roles & internships",
    getCount: (cv) =>
      cv.showExperience === false ? "Hidden" : `${cv.experience?.length || 0} roles`,
  },
  projects: {
    label: "Technical Projects",
    desc: "Selected 42 C/C++ projects with metrics",
    getCount: (cv) => `${cv.projects?.length || 0} selected`,
  },
  skills: {
    label: "Technical Skills",
    desc: "Languages, Tools, Frameworks, Project Mgmt",
    getCount: (cv) => {
      const s = cv.skills || {};
      const count =
        (s.languages?.length || 0) +
        (s.developerTools?.length || 0) +
        (s.technologiesFrameworks?.length || 0) +
        (s.projectManagementTools?.length || 0);
      return `${count} keywords`;
    },
  },
  coursework: {
    label: "Relevant Coursework",
    desc: "42 Piscines, workshops, and certifications",
    getCount: (cv) => `${cv.coursework?.length || 0} items`,
  },
  extracurriculars: {
    label: "Extracurricular Activities",
    desc: "Campus clubs, mentoring, and community",
    getCount: (cv) =>
      cv.showExtracurriculars === false
        ? "Hidden"
        : `${cv.extracurriculars?.length || 0} activities`,
  },
};

export function ReziStudioLayout() {
  const {
    cvData,
    setCVData,
    setSectionOrder,
    moveSection,
    updateContact,
    updateSkills,
    updateProjectBullet,
    addProjectBullet,
    removeProjectBullet,
    addProjectToCV,
    removeProjectFromCV,
    restoreProjectAt,
    moveProject,
    reorderProjects,
    swapProjects,
    addExperienceItem,
    updateExperienceItem,
    removeExperienceItem,
    restoreExperienceAt,
    moveExperience,
    reorderExperience,
    updateEducationItem,
    setShowExperience,
    styleDensity,
    setStyleDensity,
    showExtracurriculars,
    setShowExtracurriculars,
    setStudentProfile,
  } = useCVStore();

  // Active section pill
  const [activeSection, setActiveSection] = useState<StudioSection>("PROJECTS");
  // Active selected item in projects/experience aside list
  const [activeItemId, setActiveItemId] = useState<string>("");

  // Slide-over preview drawer (default: true for instant feedback)
  const [showSlideOverPreview, setShowSlideOverPreview] = useState(true);

  // Modals & Settings Dialogs
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [scoreModalTab, setScoreModalTab] = useState<"overview" | "matcher" | "issues">("overview");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSectionOrderModalOpen, setIsSectionOrderModalOpen] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [draggedExpIndex, setDraggedExpIndex] = useState<number | null>(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

  // Target Job Description (shared with ScoreEngineModal)
  const [targetJobDescription, setTargetJobDescription] = useState("");

  // Height budget state from canvas
  const [heightBudget, setHeightBudget] = useState<HeightBudget>({
    height: 820,
    printableBudget: 1027,
    percentage: 80,
    isOverflow: false,
  });

  // Soft Delete 6-second Undo Buffer
  interface UndoBufferItem {
    id: string;
    type: "project" | "experience";
    label: string;
    item: any;
    index: number;
    countdown: number;
  }
  const [undoBuffer, setUndoBuffer] = useState<UndoBufferItem | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monochrome Toast notifications
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    desc: string;
  } | null>(null);

  // Export state
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Set default active item on load
  useEffect(() => {
    if (activeSection === "PROJECTS" && cvData.projects.length > 0 && !activeItemId) {
      setActiveItemId(cvData.projects[0].id);
    } else if (activeSection === "EXPERIENCE" && cvData.experience.length > 0 && !activeItemId) {
      setActiveItemId(cvData.experience[0].id);
    }
  }, [activeSection, cvData.projects, cvData.experience, activeItemId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  // Soft delete countdown
  const startUndoCountdown = (bufferItem: Omit<UndoBufferItem, "countdown">) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    setUndoBuffer({ ...bufferItem, countdown: 6 });

    undoIntervalRef.current = setInterval(() => {
      setUndoBuffer((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) {
          if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
          return null;
        }
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      setUndoBuffer(null);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    }, 6000);
  };

  const handleUndo = () => {
    if (!undoBuffer) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    if (undoBuffer.type === "project") {
      restoreProjectAt(undoBuffer.item, undoBuffer.index);
    } else if (undoBuffer.type === "experience") {
      restoreExperienceAt(undoBuffer.item, undoBuffer.index);
    }

    const restoredLabel = undoBuffer.label;
    setUndoBuffer(null);
    setToastMessage({
      title: "Item Restored",
      desc: `Restored "${restoredLabel}" back to your CV.`,
    });
  };

  // Dr. Wissam ATS Score Heuristic Calculation
  const atsAudit = useMemo(() => {
    let contentScore = 0;
    let formatScore = 0;
    let bestPracticesScore = 0;
    let applicationReadyScore = 0;

    const allBullets: string[] = [];
    cvData.projects.forEach((p) => allBullets.push(...p.bulletPoints));
    cvData.experience.forEach((e) => allBullets.push(...e.bulletPoints));

    // 1. Content: Bullet count per item & metrics
    const hasEnoughBullets = cvData.projects.every(
      (p) => p.bulletPoints.length >= 2 && p.bulletPoints.length <= 5
    );
    if (hasEnoughBullets) contentScore += 12;

    const metricCount = allBullets.filter((b) => /\d+/.test(b)).length;
    const metricRatio = allBullets.length > 0 ? metricCount / allBullets.length : 0;
    contentScore += Math.round(metricRatio * 13); // up to 25

    // 2. Format: Single page height budget
    if (!heightBudget.isOverflow && heightBudget.height <= 1027) {
      formatScore = 25;
    } else {
      const overflowPx = heightBudget.height - 1027;
      formatScore = Math.max(5, Math.round(25 - (overflowPx / 20)));
    }

    // 3. Best Practices: Action verbs & zero pronouns
    const pronounsRegex = /\b(I|me|my|mine|we|us|our)\b/i;
    const hasPronouns = allBullets.some((b) => pronounsRegex.test(b));
    if (!hasPronouns) bestPracticesScore += 15;

    const openingVerbs = allBullets.map((b) => b.trim().split(" ")[0]?.toLowerCase() || "");
    const uniqueVerbs = new Set(openingVerbs);
    const verbDiversity = openingVerbs.length > 0 ? uniqueVerbs.size / openingVerbs.length : 1;
    bestPracticesScore += Math.round(verbDiversity * 10); // up to 25

    // 4. Application Ready: Valid contact details
    const { contact } = cvData;
    if (contact.fullName?.trim()) applicationReadyScore += 5;
    if (contact.email?.includes("@")) applicationReadyScore += 5;
    if (contact.phoneNumber?.trim()) applicationReadyScore += 5;
    if (contact.githubUrl || contact.linkedinUrl) applicationReadyScore += 5;
    if (contact.location?.trim()) applicationReadyScore += 5; // up to 25

    const totalScore = Math.min(100, Math.max(0, contentScore + formatScore + bestPracticesScore + applicationReadyScore));

    return {
      totalScore,
      contentScore,
      formatScore,
      bestPracticesScore,
      applicationReadyScore,
    };
  }, [cvData, heightBudget]);

  // Pure monochrome SVG circular gauge parameters
  const circumference = 124.281; // 2 * PI * 19.78
  const strokeDashoffset = circumference - (atsAudit.totalScore / 100) * circumference;

  // Print PDF Trigger
  const handlePrintPDF = () => {
    setToastMessage({
      title: "Opening Print-to-PDF...",
      desc: "Ensure 'Headers and footers' is unchecked in browser print settings.",
    });
    window.print();
  };

  // Word (.docx) Export Trigger
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
        title: "Word (.docx) Exported",
        desc: "Native Word document downloaded with right-aligned tab stops.",
      });
    } catch (err: any) {
      console.error("DOCX generation error:", err);
      setToastMessage({
        title: "Word Export Failed",
        desc: err?.message || "Failed to generate Word document.",
      });
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
      title: "Auto-Fit Applied",
      desc: "Switched line density to compact to ensure 100% 1-page fit.",
    });
  };

  // Intra Sync Trigger
  const handleIntraSync = () => {
    const mock = MOCK_42_STUDENT;
    setStudentProfile(mock);
    const initialCV = createInitialCVFromIntra(mock);
    setCVData(initialCV);
    setToastMessage({
      title: "42 Intra Synced",
      desc: `Hydrated validated projects and cursors for ${mock.displayname}.`,
    });
  };

  // Contact Hygiene Checklist calculations
  const contactChecklist = useMemo(() => {
    return [
      { label: "Full Legal Name", isComplete: !!cvData.contact.fullName?.trim() },
      { label: "Email Address", isComplete: !!cvData.contact.email?.includes("@") && cvData.contact.email.includes(".") },
      { label: "Lebanese Phone (+961)", isComplete: !!cvData.contact.phoneNumber && cvData.contact.phoneNumber.length >= 8 },
      { label: "GitHub Profile", isComplete: !!cvData.contact.githubUrl && cvData.contact.githubUrl.length > 3 },
      { label: "LinkedIn Profile", isComplete: !!cvData.contact.linkedinUrl && cvData.contact.linkedinUrl.length > 3 },
      { label: "42 Common Core Level", isComplete: Number(cvData.contact.level ?? 0) > 0 },
    ];
  }, [cvData.contact]);

  const contactCompletedCount = useMemo(() => {
    return contactChecklist.filter((c) => c.isComplete).length;
  }, [contactChecklist]);

  // Core 42 Skills Matrix Quick-Add definitions
  const core42SkillSuggestions = [
    { name: "C (C98)", category: "languages" as const },
    { name: "C++ (C11)", category: "languages" as const },
    { name: "POSIX Threads", category: "systems" as const },
    { name: "Sockets & epoll", category: "systems" as const },
    { name: "Docker & Alpine", category: "tools" as const },
    { name: "Valgrind", category: "tools" as const },
    { name: "Make & Makefile", category: "tools" as const },
    { name: "Git & CI/CD", category: "tools" as const },
    { name: "Algorithms & Data Structures", category: "systems" as const },
    { name: "TypeScript", category: "languages" as const },
    { name: "React / Next.js", category: "frameworks" as const },
    { name: "PostgreSQL", category: "frameworks" as const },
  ];

  const allSkillsList = useMemo(() => {
    return [
      ...cvData.skills.languages,
      ...cvData.skills.developerTools,
      ...cvData.skills.technologiesFrameworks,
    ];
  }, [cvData.skills]);

  const totalSkillsCount = allSkillsList.length;

  const handleToggleSkillSuggestion = (skill: { name: string; category: "languages" | "tools" | "frameworks" | "systems" }) => {
    const isAdded = allSkillsList.some((s) => s.toLowerCase() === skill.name.toLowerCase());
    if (isAdded) {
      if (skill.category === "languages") {
        updateSkills({ languages: cvData.skills.languages.filter((s) => s.toLowerCase() !== skill.name.toLowerCase()) });
      } else if (skill.category === "tools" || skill.category === "systems") {
        updateSkills({ developerTools: cvData.skills.developerTools.filter((s) => s.toLowerCase() !== skill.name.toLowerCase()) });
      } else {
        updateSkills({ technologiesFrameworks: cvData.skills.technologiesFrameworks.filter((s) => s.toLowerCase() !== skill.name.toLowerCase()) });
      }
      setToastMessage({ title: "Skill Removed", desc: `Removed "${skill.name}" from your skills matrix.` });
    } else {
      if (skill.category === "languages") {
        updateSkills({ languages: [...cvData.skills.languages, skill.name] });
      } else if (skill.category === "tools" || skill.category === "systems") {
        updateSkills({ developerTools: [...cvData.skills.developerTools, skill.name] });
      } else {
        updateSkills({ technologiesFrameworks: [...cvData.skills.technologiesFrameworks, skill.name] });
      }
      setToastMessage({ title: "Skill Added", desc: `Added "${skill.name}" to your skills matrix.` });
    }
  };

  // Profile Archetypes for Executive Summary
  const summaryArchetypes = [
    {
      title: "Systems & Low-Level Engineer",
      role: "Systems Software Engineer",
      summary: "Software engineering student at 42 Beirut specializing in Unix systems programming, POSIX-compliant multi-threading, and network protocols in C/C++. Experienced in low-level memory management with zero Valgrind leaks and rigorous peer evaluation standards.",
    },
    {
      title: "Full-Stack Software Architect",
      role: "Full-Stack Software Engineer",
      summary: "Full-stack developer with strong foundational systems engineering from 42 Beirut. Skilled in modern TypeScript, React, and containerized microservice architectures with real-time WebSocket communications.",
    },
    {
      title: "DevOps & Cloud Systems Cadet",
      role: "DevOps & Systems Engineer",
      summary: "Systems-oriented engineer trained at 42 Beirut with hands-on expertise in Docker container orchestration, automated CI/CD pipelines, and high-availability Linux infrastructure.",
    },
  ];

  const handleApplySummaryArchetype = (arch: (typeof summaryArchetypes)[0]) => {
    setCVData({
      ...cvData,
      targetRole: arch.role,
      specializationTrack: arch.summary,
    });
    setToastMessage({
      title: "Archetype Applied",
      desc: `Applied "${arch.title}" profile and Dr. Wissam summary formula.`,
    });
  };

  return (
    <div className="flex min-h-screen bg-[#09090B] text-white font-sans antialiased overflow-x-hidden selection:bg-white selection:text-black">
      {/* Main Workspace Frame (Full width, zero 70px offset) */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-[72px] bg-[#0C0C0E]/95 backdrop-blur border-b border-zinc-800 sticky top-0 z-30">
          <div className="w-full max-w-[1800px] h-full mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
            {/* Left: 42 Mark & Cadet Name & Quick Intra Sync */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-inner">
                <FortyTwoLogo className="w-5 h-4 text-white" />
              </div>
              <input
                type="text"
                value={cvData.contact.fullName}
                onChange={(e) => updateContact({ fullName: e.target.value })}
                className="text-sm font-bold text-white bg-transparent hover:bg-zinc-900 focus:bg-zinc-900 px-2 py-1 rounded-md transition focus:outline-none focus:ring-1 focus:ring-zinc-700 max-w-[180px] sm:max-w-xs truncate"
                placeholder="Your Full Name"
              />
              <button
                type="button"
                onClick={handleIntraSync}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 rounded-md transition cursor-pointer"
                title="Sync from 42 Intra profile"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync Intra</span>
              </button>
            </div>

            {/* Center: Clean Section Tabs in Title Case */}
            <nav className="hidden md:flex items-center bg-[#141417] border border-zinc-800 rounded-full p-1 gap-0.5 shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: "CONTACT", label: "Contact" },
                { id: "EDUCATION", label: "Education" },
                { id: "PROJECTS", label: "Projects" },
                { id: "EXPERIENCE", label: "Experience" },
                { id: "SKILLS", label: "Skills" },
                { id: "SUMMARY", label: "Summary" },
              ].map((tab) => {
                const isActive = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSection(tab.id as StudioSection)}
                    className={`px-3.5 py-1.5 text-xs font-semibold tracking-wide transition rounded-full cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-white text-black shadow-sm font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Right: Exactly 3 Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* 1. Section Order */}
              <button
                type="button"
                onClick={() => setIsSectionOrderModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer bg-zinc-900 text-zinc-200 border border-zinc-800 hover:border-zinc-600 hover:text-white shadow-sm"
                title="Reorder Resume Sections"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Section Order</span>
              </button>

              {/* 2. Live Preview Toggle */}
              <button
                type="button"
                onClick={() => setShowSlideOverPreview(!showSlideOverPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer border shadow-sm ${
                  showSlideOverPreview
                    ? "bg-zinc-800 border-zinc-600 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                }`}
                title="Toggle Live Resume Preview"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    showSlideOverPreview ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                  }`}
                />
                <span className="hidden sm:inline">Live Preview</span>
              </button>

              {/* 3. Primary CTA: Download PDF */}
              <button
                type="button"
                onClick={handlePrintPDF}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center overflow-x-auto bg-[#0C0C0E] border-b border-zinc-800 px-4 py-2 gap-2">
          {[
            { id: "CONTACT", label: "Contact" },
            { id: "EDUCATION", label: "Education" },
            { id: "PROJECTS", label: "Projects" },
            { id: "EXPERIENCE", label: "Experience" },
            { id: "SKILLS", label: "Skills" },
            { id: "SUMMARY", label: "Summary" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as StudioSection)}
              className={`px-3 py-1 text-xs font-medium whitespace-nowrap rounded-full ${
                activeSection === tab.id
                  ? "bg-white text-black font-bold"
                  : "text-zinc-400 bg-[#141417]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Builder Deck (Fluid 3-column / 2-column split) */}
        <div className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-4 md:px-6 pt-5 pb-12 flex flex-col lg:flex-row gap-4 xl:gap-6 min-w-0">
            {/* Column 1 — Left In-Aside Deck (Responsive width: collapses to 2-column split on < 1536px when preview is ON) */}
            <aside className={`w-full shrink-0 flex flex-col gap-4 transition-all duration-200 ${
              showSlideOverPreview ? "hidden 2xl:flex 2xl:w-[280px]" : "lg:w-[308px]"
            }`}>
              {/* Score Engine Card */}
              <div className="bg-[#141417] border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setScoreModalTab("overview");
                      setIsScoreModalOpen(true);
                    }}
                    className="relative flex items-center justify-center cursor-pointer group"
                    aria-label="View Dr. Wissam ATS Score"
                  >
                    <svg width="46" height="46" viewBox="0 0 46 46" className="-rotate-90">
                      <circle
                        cx="23"
                        cy="23"
                        r="19.78"
                        fill="none"
                        stroke="#27272A"
                        strokeWidth="4"
                      />
                      <circle
                        cx="23"
                        cy="23"
                        r="19.78"
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-white">
                      {atsAudit.totalScore}
                    </span>
                  </button>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      CV Readiness
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-2 h-2 rounded-full ${heightBudget.isOverflow ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className="text-xs text-zinc-300 font-medium">
                        {heightBudget.isOverflow ? "Overflows Page 1" : "Fits on 1 Page"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScoreModalTab("overview");
                    setIsScoreModalOpen(true);
                  }}
                  className="text-xs text-white font-bold underline hover:text-zinc-300 cursor-pointer"
                >
                  Audit
                </button>
              </div>

              {/* Tailored Contextual Aside Tools by Section */}
              {activeSection === "CONTACT" ? (
                /* Contact Information Checklist */
                <div className="bg-[#141417] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm flex-1">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-zinc-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Contact Information
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {contactCompletedCount}/6 Complete
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="bg-white h-full transition-all duration-500 rounded-full"
                      style={{ width: `${(contactCompletedCount / 6) * 100}%` }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="flex flex-col gap-2 text-xs">
                    {contactChecklist.map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                          item.isComplete
                            ? "bg-[#0C0C0E] border-zinc-800/90 text-zinc-200"
                            : "bg-[#18181D]/60 border-zinc-800/60 text-zinc-400"
                        }`}
                      >
                        <span className="font-medium">{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          {item.isComplete ? (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                              <Check className="w-3.5 h-3.5 text-zinc-200" />
                              <span>Ready</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                              <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Missing</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Contact Tip Callout */}
                  <div className="mt-auto p-3.5 bg-[#0C0C0E] border border-zinc-800/90 rounded-lg text-xs text-zinc-400 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-300 text-xs">
                      <Info className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Tip</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-400">
                      Include full GitHub and LinkedIn URLs and your international dialing code (e.g., +961).
                    </p>
                  </div>
                </div>
              ) : activeSection === "SKILLS" ? (
                /* Core 42 Skills Quick-Add & Category Matrix */
                <div className="bg-[#141417] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm flex-1">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-zinc-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Core 42 Skills
                      </span>
                    </div>
                    <span className="text-xs font-mono text-white font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                      {totalSkillsCount} Skills
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    1-Click add authentic 42 Beirut competencies into your ATS skills matrix:
                  </p>

                  {/* Quick-Add Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {core42SkillSuggestions.map((skill) => {
                      const isAdded = allSkillsList.some(
                        (s) => s.toLowerCase() === skill.name.toLowerCase()
                      );
                      return (
                        <button
                          key={skill.name}
                          type="button"
                          onClick={() => handleToggleSkillSuggestion(skill)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1.5 border ${
                            isAdded
                              ? "bg-zinc-800/90 border-zinc-600 text-white"
                              : "bg-[#0C0C0E] border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                          }`}
                        >
                          {isAdded ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <Plus className="w-3 h-3 text-zinc-400" />
                          )}
                          <span>{skill.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* ATS Target Gauge */}
                  <div className="mt-auto p-3.5 bg-[#0C0C0E] border border-zinc-800/90 rounded-lg text-xs text-zinc-400 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-400 font-bold uppercase">ATS Keyword Target</span>
                      <span className="text-white font-bold">{totalSkillsCount} / 20</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="bg-white h-full transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, (totalSkillsCount / 20) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Recommended: 15–25 specific technical keywords across Languages, Tools, and Frameworks.
                    </p>
                  </div>
                </div>
              ) : activeSection === "SUMMARY" ? (
                /* 42 Profile Archetypes & Power Verbs Assistant */
                <div className="bg-[#141417] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm flex-1">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Profile Archetypes
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Select an archetype to draft a concise 2-line professional summary:
                  </p>

                  {/* Archetype Buttons */}
                  <div className="flex flex-col gap-2">
                    {summaryArchetypes.map((arch) => (
                      <button
                        key={arch.title}
                        type="button"
                        onClick={() => handleApplySummaryArchetype(arch)}
                        className="p-3 bg-[#0C0C0E] hover:bg-[#18181D] border border-zinc-800 hover:border-zinc-600 rounded-lg text-left transition cursor-pointer flex flex-col gap-1 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-zinc-100">
                            {arch.title}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400">
                            Apply
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {arch.summary}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Power Action Verbs Reference */}
                  <div className="mt-auto p-3.5 bg-[#0C0C0E] border border-zinc-800/90 rounded-lg text-xs text-zinc-400 flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                      Power Opening Verbs
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {["Engineered", "Architected", "Spearheaded", "Optimized", "Benchmarked", "Automated"].map((v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeSection === "EDUCATION" ? (
                /* 42 Beirut Academic Standing & Curriculum Card */
                <div className="bg-[#141417] border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm flex-1">
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-300" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        42 Cursus Standing
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#0C0C0E] border border-zinc-800/90 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">École 42 Beirut</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-700">
                        Level {cvData.contact.level ?? 9}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Peer-to-peer curriculum accredited by École 42 Paris with rigorous peer-evaluation standards.
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-zinc-300">
                      <Check className="w-3.5 h-3.5 text-zinc-200" />
                      <span>Common Core Validated</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleIntraSync}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-200 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Re-Sync 42 Intra Profile</span>
                  </button>
                </div>
              ) : (
                /* Draggable Item List (Positions or Projects) */
                <div className="bg-[#141417] border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-sm flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      {activeSection === "PROJECTS" ? "Selected Projects" : "Work Experiences"}
                    </span>
                    <span className="text-xs font-mono text-white font-bold">
                      {activeSection === "PROJECTS" ? cvData.projects.length : cvData.experience.length} items
                    </span>
                  </div>

                  {/* Instant Search & Circle Filter Chips for Projects */}
                  {/* Items List */}
                  <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                    {activeSection === "PROJECTS" ? (
                      cvData.projects.length === 0 ? (
                        <div className="text-center py-6 text-zinc-500 text-xs">
                          No projects added. Click &quot;+ Add Project&quot; below.
                        </div>
                      ) : (
                        cvData.projects.map((proj, idx) => {
                          const isSelected = activeItemId === proj.id;
                          const canMoveUp = idx > 0;
                          const canMoveDown = idx < cvData.projects.length - 1;

                          return (
                            <div
                              key={proj.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", proj.id);
                                setDraggedProjectId(proj.id);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                const sourceId = e.dataTransfer.getData("text/plain") || draggedProjectId;
                                if (sourceId && sourceId !== proj.id) {
                                  swapProjects(sourceId, proj.id);
                                }
                                setDraggedProjectId(null);
                              }}
                              onClick={() => setActiveItemId(proj.id)}
                              className={`relative flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition select-none ${
                                draggedProjectId === proj.id ? "opacity-50 border-white/50" : ""
                              } ${
                                isSelected
                                  ? "bg-[#1C1C22] border-zinc-700/90 text-white shadow-md before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:bg-white before:rounded-r"
                                  : "bg-[#0C0C0E] border-zinc-800/80 text-zinc-300 hover:bg-[#18181D] hover:border-zinc-700/80 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <GripVertical className="w-4 h-4 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing shrink-0" />
                                <div className="truncate">
                                  <div className="font-bold truncate">{proj.name}</div>
                                  <div className="text-[10px] text-zinc-500 truncate">
                                    {proj.techStack || "C / C++"} · {proj.bulletPoints.length} bullets
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {canMoveUp && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      swapProjects(proj.id, cvData.projects[idx - 1].id);
                                    }}
                                    className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                                    title="Move Up"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canMoveDown && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      swapProjects(proj.id, cvData.projects[idx + 1].id);
                                    }}
                                    className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                                    title="Move Down"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeProjectFromCV(proj.id);
                                    startUndoCountdown({
                                      id: proj.id,
                                      type: "project",
                                      label: proj.name,
                                      item: proj,
                                      index: idx,
                                    });
                                  }}
                                  className="p-1 hover:text-red-400 text-zinc-500 hover:bg-zinc-800 rounded transition cursor-pointer"
                                  title="Remove project"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )
                    ) : (
                      cvData.experience.map((exp, idx) => {
                        const isSelected = activeItemId === exp.id;
                        return (
                          <div
                            key={exp.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", String(idx));
                              setDraggedExpIndex(idx);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const sourceIdxStr = e.dataTransfer.getData("text/plain");
                              const sourceIdx =
                                sourceIdxStr !== "" ? parseInt(sourceIdxStr, 10) : draggedExpIndex;
                              if (sourceIdx !== null && !isNaN(sourceIdx) && sourceIdx !== idx) {
                                reorderExperience(sourceIdx, idx);
                              }
                              setDraggedExpIndex(null);
                            }}
                            onClick={() => setActiveItemId(exp.id)}
                            className={`relative flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition select-none ${
                              draggedExpIndex === idx ? "opacity-50 border-white/50" : ""
                            } ${
                              isSelected
                                ? "bg-[#1C1C22] border-zinc-700/90 text-white shadow-md before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-[3px] before:bg-white before:rounded-r"
                                : "bg-[#0C0C0E] border-zinc-800/80 text-zinc-300 hover:bg-[#18181D] hover:border-zinc-700/80 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <GripVertical className="w-4 h-4 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing shrink-0" />
                              <div className="truncate">
                                <div className="font-bold truncate">{exp.role}</div>
                                <div className="text-[10px] text-zinc-500 truncate">
                                  {exp.company}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveExperience(idx, "up");
                                  }}
                                  className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                                  title="Move Up"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {idx < cvData.experience.length - 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveExperience(idx, "down");
                                  }}
                                  className="p-1 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                                  title="Move Down"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeExperienceItem(exp.id);
                                  startUndoCountdown({
                                    id: exp.id,
                                    type: "experience",
                                    label: `${exp.role} @ ${exp.company}`,
                                    item: exp,
                                    index: idx,
                                  });
                                }}
                                className="p-1 hover:text-red-400 text-zinc-500 hover:bg-zinc-800 rounded transition cursor-pointer"
                                title="Remove position"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Item Full-Width Button */}
                  {activeSection === "PROJECTS" ? (
                    <button
                      type="button"
                      onClick={() => {
                        const newProj = {
                          id: `proj-${Date.now()}`,
                          name: "Custom Software Project",
                          slug: `custom-${Date.now()}`,
                          techStack: "C, POSIX, Make",
                          date: "2024",
                          bulletPoints: [
                            "Engineered scalable systems software module conforming to 42 Norminette standards.",
                          ],
                          isCustom: true,
                        };
                        addProjectToCV(newProj);
                        setActiveItemId(newProj.id);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/80 text-zinc-200 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer mt-auto shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Project</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const newExp = {
                          id: `exp-${Date.now()}`,
                          company: "Engineering Co.",
                          role: "Software Engineering Intern",
                          location: "Beirut, Lebanon",
                          startDate: "June 2024",
                          endDate: "September 2024",
                          bulletPoints: [
                            "Implemented low-level backend service modules with zero memory leaks.",
                          ],
                        };
                        addExperienceItem(newExp);
                        setActiveItemId(newExp.id);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/80 text-zinc-200 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer mt-auto shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Position</span>
                    </button>
                  )}
                </div>
              )}
            </aside>

            {/* Column 2 — Center Form Deck (Fluid max 1108px / min-w-0) */}
            <main className="flex-1 min-w-0 max-w-[1108px] bg-[#141417] border border-zinc-800 rounded-xl p-5 md:p-8 flex flex-col gap-6 shadow-sm">
              {/* Form Deck Sub-Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    {activeSection}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {activeSection === "CONTACT" && "Strict single-line contact header formatted for ATS parsers."}
                    {activeSection === "EDUCATION" && "Formal 42 Cursus standing and previous university qualifications."}
                    {activeSection === "EXPERIENCE" && "Relevant industry roles and software engineering internships."}
                    {activeSection === "PROJECTS" && "Key engineering projects with technical achievements and impact."}
                    {activeSection === "SKILLS" && "Categorized technical skills, systems, and tools."}
                    {activeSection === "SUMMARY" && "Target engineering role and 2-line professional overview."}
                  </p>
                </div>
              </div>

              {/* Form Views */}
              {activeSection === "CONTACT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.fullName}
                      onChange={(e) => updateContact({ fullName: e.target.value })}
                      placeholder="e.g. Ali Noureddine"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      42 Common Core Level
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={cvData.contact.level ?? 9}
                      onChange={(e) => updateContact({ level: parseFloat(e.target.value) || 0 })}
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={cvData.contact.email}
                      onChange={(e) => updateContact({ email: e.target.value })}
                      placeholder="cadet@student.42beirut.com"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={cvData.contact.phoneNumber}
                      onChange={(e) => updateContact({ phoneNumber: e.target.value })}
                      placeholder="+961 70 123456"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      GitHub Profile URL
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.githubUrl}
                      onChange={(e) => updateContact({ githubUrl: normalizeGitHub(e.target.value) })}
                      placeholder="github.com/login"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      LinkedIn Profile URL
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.linkedinUrl}
                      onChange={(e) => updateContact({ linkedinUrl: normalizeLinkedIn(e.target.value) })}
                      placeholder="linkedin.com/in/login"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeSection === "EDUCATION" && (
                <div className="flex flex-col gap-5">
                  {cvData.education.map((edu) => (
                    <div key={edu.id} className="p-5 bg-[#0C0C0E] border border-zinc-800/90 rounded-xl flex flex-col gap-4 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">Institution</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => updateEducationItem(edu.id, { institution: e.target.value })}
                            className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">Degree</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => updateEducationItem(edu.id, { degree: e.target.value })}
                            className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">Program / Track</label>
                          <input
                            type="text"
                            value={edu.program}
                            onChange={(e) => updateEducationItem(edu.id, { program: e.target.value })}
                            className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">Graduation / Date</label>
                          <input
                            type="text"
                            value={edu.endDate}
                            onChange={(e) => updateEducationItem(edu.id, { endDate: e.target.value })}
                            className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === "PROJECTS" && (
                <div className="flex flex-col gap-5">
                  {(() => {
                    const currentProj = cvData.projects.find((p) => p.id === activeItemId) || cvData.projects[0];
                    if (!currentProj) {
                      return (
                        <div className="text-center py-12 text-zinc-500">
                          No projects selected. Click &quot;+ Add Project&quot; in the left panel.
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-5">
                        {/* Compact Project Switcher when aside is collapsed on laptop split view */}
                        {showSlideOverPreview && cvData.projects.length > 1 && (
                          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 2xl:hidden border-b border-zinc-800/80 pb-3">
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">
                              Active:
                            </span>
                            {cvData.projects.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setActiveItemId(p.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition shrink-0 cursor-pointer ${
                                  p.id === currentProj.id
                                    ? "bg-white text-black font-bold shadow-sm"
                                    : "bg-[#0A0A0D] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                                }`}
                              >
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{currentProj.name}</span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C1C21] border border-zinc-800 text-zinc-300">
                              {currentProj.slug}
                            </span>
                          </h4>
                        </div>

                        {/* Metadata Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                              Technologies Stack
                            </label>
                            <input
                              type="text"
                              value={currentProj.techStack || ""}
                              onChange={(e) => {
                                const updated = cvData.projects.map((p) =>
                                  p.id === currentProj.id ? { ...p, techStack: e.target.value } : p
                                );
                                setCVData({ ...cvData, projects: updated });
                              }}
                              placeholder="C, POSIX, Docker, Make, Linux"
                              className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                              Completion Date
                            </label>
                            <input
                              type="text"
                              value={currentProj.date || ""}
                              onChange={(e) => {
                                const updated = cvData.projects.map((p) =>
                                  p.id === currentProj.id ? { ...p, date: e.target.value } : p
                                );
                                setCVData({ ...cvData, projects: updated });
                              }}
                              placeholder="May 2024"
                              className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Bullets List */}
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                              Bullet Points ({currentProj.bulletPoints.length} / 4 recommended)
                            </label>
                            <button
                              type="button"
                              onClick={() => addProjectBullet(currentProj.id, "")}
                              className="flex items-center gap-1 text-xs text-white font-bold hover:underline cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Bullet</span>
                            </button>
                          </div>

                          {currentProj.bulletPoints.map((bullet, bIdx) => (
                            <BulletEditorRow
                              key={bIdx}
                              bullet={bullet}
                              index={bIdx}
                              contextSlug={currentProj.slug}
                              onChange={(newVal) => updateProjectBullet(currentProj.id, bIdx, newVal)}
                              onDelete={() => removeProjectBullet(currentProj.id, bIdx)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeSection === "EXPERIENCE" && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="text-xs font-bold uppercase text-zinc-400">
                      Include Industry Experience
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input
                        type="checkbox"
                        checked={cvData.showExperience}
                        onChange={(e) => setShowExperience(e.target.checked)}
                        className="rounded accent-white w-4 h-4 cursor-pointer"
                      />
                      <span>Show on CV</span>
                    </label>
                  </div>

                  {cvData.showExperience ? (
                    cvData.experience.map((exp) => (
                      <div key={exp.id} className="p-5 bg-[#0C0C0E] border border-zinc-800/90 rounded-xl flex flex-col gap-4 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">Company</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperienceItem(exp.id, { company: e.target.value })}
                              className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">Role / Title</label>
                            <input
                              type="text"
                              value={exp.role}
                              onChange={(e) => updateExperienceItem(exp.id, { role: e.target.value })}
                              className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Experience Bullets */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold uppercase text-zinc-400">Accomplishments &amp; Bullets</label>
                          {exp.bulletPoints.map((bullet, bIdx) => (
                            <BulletEditorRow
                              key={bIdx}
                              bullet={bullet}
                              index={bIdx}
                              contextRole={exp.role}
                              onChange={(newVal) => {
                                const newBullets = [...exp.bulletPoints];
                                newBullets[bIdx] = newVal;
                                updateExperienceItem(exp.id, { bulletPoints: newBullets });
                              }}
                              onDelete={() => {
                                const newBullets = exp.bulletPoints.filter((_, i) => i !== bIdx);
                                updateExperienceItem(exp.id, { bulletPoints: newBullets });
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center bg-[#0C0C0E]/60 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-sm">
                      Work Experience is hidden. 100% of vertical line budget is allocated to your 42 Projects.
                    </div>
                  )}
                </div>
              )}

              {activeSection === "SKILLS" && (
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Programming Languages
                    </label>
                    <input
                      type="text"
                      value={cvData.skills.languages.join(", ")}
                      onChange={(e) =>
                        updateSkills({
                          languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="C, C++, TypeScript, Python, Bash, SQL"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Developer Tools &amp; Systems
                    </label>
                    <input
                      type="text"
                      value={cvData.skills.developerTools.join(", ")}
                      onChange={(e) =>
                        updateSkills({
                          developerTools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Git, Docker, Valgrind, GDB, Make, Linux, Nginx"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Technologies &amp; Frameworks
                    </label>
                    <input
                      type="text"
                      value={cvData.skills.technologiesFrameworks.join(", ")}
                      onChange={(e) =>
                        updateSkills({
                          technologiesFrameworks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Node.js, React, Next.js, PostgreSQL, WebSockets, REST APIs"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeSection === "SUMMARY" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Target Role / Job Title
                    </label>
                    <input
                      type="text"
                      value={cvData.targetRole || "Software Engineer"}
                      onChange={(e) => setCVData({ ...cvData, targetRole: e.target.value })}
                      placeholder="Software Engineer"
                      className="w-full h-11 px-3.5 py-2.5 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.06em] mb-2">
                      Professional Summary
                    </label>
                    <textarea
                      rows={3}
                      value={cvData.specializationTrack || ""}
                      onChange={(e) => setCVData({ ...cvData, specializationTrack: e.target.value })}
                      placeholder="Motivated 42 Beirut student with strong foundation in low-level systems programming in C/C++..."
                      className="w-full p-4 bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus:border-zinc-400 focus:ring-2 focus:ring-white/[0.08] rounded-lg text-[15px] font-normal text-zinc-100 placeholder:text-zinc-600 transition-all focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </main>

            {/* Optional Slide-Over Preview (Responsive on lg+ displays, Toggled via Header) */}
            {showSlideOverPreview && (
              <section className="hidden lg:flex w-[420px] xl:w-[460px] 2xl:w-[480px] shrink-0 sticky top-[95px] h-[calc(100vh-115px)]">
                <CanvasPreviewViewport
                  cvData={cvData}
                  onHeightBudgetChange={setHeightBudget}
                  onPrintPDF={handlePrintPDF}
                  onExportDocx={handleExportDocx}
                />
              </section>
            )}
          </div>
      </div>

      {/* Floating 6-Second Soft Delete Toast */}
      {undoBuffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#141417] border border-zinc-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs">
            Removed <strong>&quot;{undoBuffer.label}&quot;</strong> from CV.
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1 bg-white hover:bg-zinc-200 text-black rounded text-xs font-bold uppercase transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoBuffer.countdown}s)</span>
          </button>
        </div>
      )}

      {/* Subtle Monochrome Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141417] border border-zinc-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
          <div className="text-xs">
            <div className="font-bold">{toastMessage.title}</div>
            <div className="text-zinc-400">{toastMessage.desc}</div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-zinc-500 hover:text-white text-sm ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* ATS & Dr. Wissam ScoreEngine Modal (5 Categories + Job Matcher) */}
      <ScoreEngineModal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        cvData={cvData}
        heightBudget={heightBudget}
        targetJobDescription={targetJobDescription}
        onTargetJobDescriptionChange={setTargetJobDescription}
        initialTab={scoreModalTab}
        onJumpToSection={(sec, itemId) => {
          setActiveSection(sec);
          if (itemId) setActiveItemId(itemId);
          setIsScoreModalOpen(false);
        }}
      />

      {/* Reset Draft Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <RotateCcw className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">Reset CV Draft?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will re-hydrate your CV from your 42 Intra profile and reset all bullet points to default. Any custom edits not backed up will be lost.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleIntraSync();
                  setIsResetModalOpen(false);
                }}
                className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style & Spacing Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-white" />
                <span>42 Template Rules</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Vertical Density</div>
                  <div className="text-zinc-400 text-[11px]">Calibrate line spacing to fit 1 page</div>
                </div>
                <div className="flex items-center gap-1 bg-[#1C1C21] p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStyleDensity("standard")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      styleDensity === "standard" ? "bg-white text-black font-bold" : "text-zinc-400"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleDensity("compact")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      styleDensity === "compact" ? "bg-white text-black font-bold" : "text-zinc-400"
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Campus Extracurriculars</div>
                  <div className="text-zinc-400 text-[11px]">Show Bocal &amp; Piscine activities</div>
                </div>
                <input
                  type="checkbox"
                  checked={showExtracurriculars}
                  onChange={(e) => setShowExtracurriculars(e.target.checked)}
                  className="rounded accent-white w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="mt-2 w-full py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Resume Section Order Manager Modal */}
      {isSectionOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-white" />
                <span>Resume Section Order</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSectionOrderModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Drag items or click the Up / Down arrows to customize the vertical hierarchy of your resume. Contact header always remains anchored at the very top. Changes update the Live Preview instantly.
            </p>

            <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
              {(cvData.sectionOrder && cvData.sectionOrder.length > 0
                ? cvData.sectionOrder
                : DEFAULT_SECTION_ORDER
              ).map((secId, idx, arr) => {
                const meta = SECTION_METADATA[secId];
                const countBadge = meta?.getCount ? meta.getCount(cvData) : null;
                const isFirst = idx === 0;
                const isLast = idx === arr.length - 1;

                return (
                  <div
                    key={secId}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(idx));
                      setDraggedSectionIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceIdxStr = e.dataTransfer.getData("text/plain");
                      const sourceIdx =
                        sourceIdxStr !== "" ? parseInt(sourceIdxStr, 10) : draggedSectionIndex;
                      if (sourceIdx !== null && !isNaN(sourceIdx) && sourceIdx !== idx) {
                        moveSection(sourceIdx, idx);
                      }
                      setDraggedSectionIndex(null);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border bg-[#0C0C0E] border-zinc-800 text-xs transition select-none ${
                      draggedSectionIndex === idx ? "opacity-50 border-white/50" : "hover:border-zinc-700 hover:bg-[#18181D]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing shrink-0" />
                      <span className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{meta?.label || secId}</span>
                          {countBadge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                              {countBadge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">{meta?.desc}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveSection(idx, idx - 1)}
                        className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move Section Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveSection(idx, idx + 1)}
                        className="p-1.5 hover:text-white text-zinc-400 hover:bg-zinc-800 rounded transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move Section Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800 mt-1">
              <button
                type="button"
                onClick={() => setSectionOrder([...DEFAULT_SECTION_ORDER])}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:underline transition cursor-pointer"
              >
                Reset to Default Order
              </button>
              <button
                type="button"
                onClick={() => setIsSectionOrderModalOpen(false)}
                className="px-4 py-2 bg-white text-black hover:bg-zinc-200 font-bold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
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
