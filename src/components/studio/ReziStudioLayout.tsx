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
import { FortyTwoLogo } from "@/components/ui/FortyTwoLogo";
import {
  Home,
  RefreshCw,
  Sliders,
  Key,
  Download,
  Printer,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Eye,
  Target,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import { MOCK_42_STUDENT, createInitialCVFromIntra } from "@/lib/intra/mock-data";

export type StudioSection =
  | "CONTACT"
  | "EDUCATION"
  | "EXPERIENCE"
  | "PROJECTS"
  | "SKILLS"
  | "SUMMARY";

export function ReziStudioLayout() {
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
    restoreProjectAt,
    moveProject,
    addExperienceItem,
    updateExperienceItem,
    removeExperienceItem,
    restoreExperienceAt,
    moveExperience,
    updateEducationItem,
    setShowExperience,
    styleDensity,
    setStyleDensity,
    showExtracurriculars,
    setShowExtracurriculars,
    userGeminiKey,
    setUserGeminiKey,
    userGroqKey,
    setUserGroqKey,
    setStudentProfile,
  } = useCVStore();

  // Active section pill
  const [activeSection, setActiveSection] = useState<StudioSection>("PROJECTS");
  // Active selected item in projects/experience aside list
  const [activeItemId, setActiveItemId] = useState<string>("");

  // View mode: 'builder' (strictly 2 columns) vs 'preview' (Rezi full A4 preview studio)
  const [viewMode, setViewMode] = useState<"builder" | "preview">("builder");
  // Optional slide-over preview drawer for ultra-wide screens (default: false)
  const [showSlideOverPreview, setShowSlideOverPreview] = useState(false);

  // Modals & Settings Dialogs
  const [isBYOKOpen, setIsBYOKOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-[#09090B] text-white font-sans antialiased overflow-x-hidden selection:bg-white selection:text-black">
      {/* 1. Global Left Navigation Rail (70px Fixed Width) */}
      <aside className="w-[70px] bg-[#09090B] border-r border-zinc-800 flex flex-col items-center py-6 gap-6 fixed top-0 bottom-0 left-0 z-40">
        {/* Crisp Monochrome 42 Stencil Container */}
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
          <FortyTwoLogo className="w-7 h-5 text-white" />
        </div>

        {/* Navigation Action Buttons */}
        <nav className="flex flex-col items-center gap-3 w-full px-2 mt-2">
          {/* Home / Studio Builder */}
          <button
            type="button"
            onClick={() => setViewMode("builder")}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer ${
              viewMode === "builder"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
            title="Studio Editor"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Intra 42 Sync */}
          <button
            type="button"
            onClick={handleIntraSync}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
            title="Sync / Hydrate 42 Intra Profile"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* AI Settings (BYOK) */}
          <button
            type="button"
            onClick={() => setIsBYOKOpen(true)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer ${
              userGeminiKey || userGroqKey
                ? "text-white bg-zinc-800 border border-zinc-700"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
            title="AI Keys (BYOK Gemini/Groq)"
          >
            <Key className="w-5 h-5" />
          </button>
        </nav>

        {/* Bottom Clean Settings Icon ONLY (No Duplicate Gauge) */}
        <div className="mt-auto flex flex-col items-center">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
            title="Dr. Wissam Template Rules & Spacing"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame (Offset Left by 70px) */}
      <div className="flex-1 ml-[70px] flex flex-col min-h-screen">
        {/* 2. Top Sub-Navigation Header (81px Height) */}
        <header className="h-[81px] bg-[#09090B]/95 backdrop-blur border-b border-zinc-800 sticky top-0 z-30">
          <div className="max-w-[1440px] h-full mx-auto px-4 md:px-8 flex items-center justify-between">
            {/* Left Cluster: Document Identity with FortyTwoLogo */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 items-center justify-center shadow-sm shrink-0">
                <FortyTwoLogo className="w-6 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <input
                  type="text"
                  value={cvData.contact.fullName}
                  onChange={(e) => updateContact({ fullName: e.target.value })}
                  className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b focus:border-white max-w-[240px] sm:max-w-xs truncate"
                  placeholder="Your Full Name"
                />
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>42 Beirut Studio • Autosaved</span>
                </div>
              </div>
            </div>

            {/* Center Cluster: Section Tabs */}
            <nav className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-full p-1 gap-1">
              {(
                [
                  "CONTACT",
                  "EDUCATION",
                  "EXPERIENCE",
                  "PROJECTS",
                  "SKILLS",
                  "SUMMARY",
                ] as StudioSection[]
              ).map((sec) => {
                const isActive = viewMode === "builder" && activeSection === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      setViewMode("builder");
                      setActiveSection(sec);
                    }}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition rounded-full cursor-pointer ${
                      isActive
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sec}
                  </button>
                );
              })}
            </nav>

            {/* Right Cluster: View Mode & Export Actions */}
            <div className="flex items-center gap-2">
              {/* Finish Up & Preview Mode Switcher */}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "preview" ? "builder" : "preview")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  viewMode === "preview"
                    ? "bg-white text-black shadow-sm"
                    : "bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Finish Up &amp; Preview</span>
              </button>

              {/* Export PDF */}
              <button
                type="button"
                onClick={handlePrintPDF}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-700 text-white hover:bg-white hover:text-black rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>

              {/* Export Word */}
              <button
                type="button"
                onClick={handleExportDocx}
                disabled={isExportingDocx}
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-700 text-white hover:bg-white hover:text-black rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExportingDocx ? "..." : "Word"}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Section Tabs */}
        <div className="md:hidden flex items-center overflow-x-auto bg-zinc-900 border-b border-zinc-800 px-4 py-2 gap-2">
          {(
            [
              "CONTACT",
              "EDUCATION",
              "EXPERIENCE",
              "PROJECTS",
              "SKILLS",
              "SUMMARY",
            ] as StudioSection[]
          ).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => {
                setViewMode("builder");
                setActiveSection(sec);
              }}
              className={`px-3 py-1 text-xs font-bold uppercase whitespace-nowrap rounded-full ${
                viewMode === "builder" && activeSection === sec
                  ? "bg-white text-black"
                  : "text-zinc-400 bg-zinc-800"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* 3. DEDICATED PREVIEW MODE OR 2-COLUMN BUILDER DECK */}
        {viewMode === "preview" ? (
          /* Full A4 Document Preview & Line-Budget Studio (Section 2.5 of Spec) */
          <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-8 flex flex-col">
            <CanvasPreviewViewport
              cvData={cvData}
              onHeightBudgetChange={setHeightBudget}
              onPrintPDF={handlePrintPDF}
              onExportDocx={handleExportDocx}
              onAutoFit={handleAutoFit}
            />
          </div>
        ) : (
          /* Main Builder Deck (Strictly 2 Columns when editing tabs) */
          <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-8 pt-6 pb-12 flex flex-col md:flex-row gap-x-6 gap-y-4">
            {/* Column 1 — Left In-Aside Deck (Fixed 308px) */}
            <aside className="md:w-[308px] flex-none flex flex-col gap-4">
              {/* Score Engine Card */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsScoreModalOpen(true)}
                    className="relative flex items-center justify-center cursor-pointer group"
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
                      Dr. Wissam Score
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {heightBudget.height}px / 1027px • {heightBudget.isOverflow ? "Overflow" : "1-Page Fit"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScoreModalOpen(true)}
                  className="text-xs text-white font-bold underline hover:text-zinc-300 cursor-pointer"
                >
                  Audit
                </button>
              </div>

              {/* Draggable Item List (Positions or Projects) */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-sm flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    {activeSection === "PROJECTS" ? "Selected Projects" : "Work Experiences"}
                  </span>
                  <span className="text-xs font-mono text-white font-bold">
                    {activeSection === "PROJECTS" ? cvData.projects.length : cvData.experience.length} items
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {activeSection === "PROJECTS" ? (
                    cvData.projects.map((proj, idx) => {
                      const isSelected = activeItemId === proj.id;
                      return (
                        <div
                          key={proj.id}
                          onClick={() => setActiveItemId(proj.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-zinc-900 border-white text-white shadow-sm"
                              : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
                            <div className="truncate">
                              <div className="font-bold truncate">{proj.name}</div>
                              <div className="text-[10px] text-zinc-500 truncate">
                                {proj.techStack || "C / C++"} · {proj.bulletPoints.length} bullets
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {idx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveProject(idx, "up");
                                }}
                                className="p-1 hover:text-white text-zinc-500"
                                title="Move Up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {idx < cvData.projects.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveProject(idx, "down");
                                }}
                                className="p-1 hover:text-white text-zinc-500"
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
                              className="p-1 hover:text-red-400 text-zinc-500"
                              title="Remove project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    cvData.experience.map((exp, idx) => {
                      const isSelected = activeItemId === exp.id;
                      return (
                        <div
                          key={exp.id}
                          onClick={() => setActiveItemId(exp.id)}
                          className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-zinc-900 border-white text-white shadow-sm"
                              : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
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
                                className="p-1 hover:text-white text-zinc-500"
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
                                className="p-1 hover:text-white text-zinc-500"
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
                              className="p-1 hover:text-red-400 text-zinc-500"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-zinc-700 hover:border-white text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer mt-auto"
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-zinc-700 hover:border-white text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer mt-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Position</span>
                  </button>
                )}
              </div>
            </aside>

            {/* Column 2 — Center Form Deck (1108px max / flex-1) */}
            <main className="flex-1 max-w-[1108px] bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 md:p-8 flex flex-col gap-6 shadow-sm">
              {/* Form Deck Sub-Header with Slide-Over Toggle */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    {activeSection}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {activeSection === "CONTACT" && "Strict single-line contact header following Dr. Wissam standards."}
                    {activeSection === "EDUCATION" && "Formal 42 Cursus standing and previous university qualifications."}
                    {activeSection === "EXPERIENCE" && "Industry roles (toggle off to reallocate line budget to 42 projects)."}
                    {activeSection === "PROJECTS" && "2 to 4 bullet points per project with quantitative C metrics."}
                    {activeSection === "SKILLS" && "Categorized comma-separated technical keywords for ATS parsers."}
                    {activeSection === "SUMMARY" && "Target engineering role and 2-line professional profile."}
                  </p>
                </div>

                {/* Subtle Slide-Over Preview Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSlideOverPreview(!showSlideOverPreview)}
                  className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono rounded-md transition cursor-pointer"
                  title="Toggle Slide-Over Preview on Wide Display"
                >
                  {showSlideOverPreview ? (
                    <>
                      <PanelRightClose className="w-3.5 h-3.5" />
                      <span>Preview: On</span>
                    </>
                  ) : (
                    <>
                      <PanelRight className="w-3.5 h-3.5" />
                      <span>Preview: Off</span>
                    </>
                  )}
                </button>
              </div>

              {/* Form Views */}
              {activeSection === "CONTACT" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.fullName}
                      onChange={(e) => updateContact({ fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      42 Common Core Level
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={cvData.contact.level ?? 9}
                      onChange={(e) => updateContact({ level: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={cvData.contact.email}
                      onChange={(e) => updateContact({ email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={cvData.contact.phoneNumber}
                      onChange={(e) => updateContact({ phoneNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      GitHub Handle / URL
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.githubUrl}
                      onChange={(e) => updateContact({ githubUrl: normalizeGitHub(e.target.value) })}
                      placeholder="github.com/login"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      LinkedIn Handle / URL
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.linkedinUrl}
                      onChange={(e) => updateContact({ linkedinUrl: normalizeLinkedIn(e.target.value) })}
                      placeholder="linkedin.com/in/login"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeSection === "EDUCATION" && (
                <div className="flex flex-col gap-4">
                  {cvData.education.map((edu) => (
                    <div key={edu.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Institution</label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => updateEducationItem(edu.id, { institution: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Degree</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => updateEducationItem(edu.id, { degree: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Program / Track</label>
                          <input
                            type="text"
                            value={edu.program}
                            onChange={(e) => updateEducationItem(edu.id, { program: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Graduation / Date</label>
                          <input
                            type="text"
                            value={edu.endDate}
                            onChange={(e) => updateEducationItem(edu.id, { endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
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
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{currentProj.name}</span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {currentProj.slug}
                            </span>
                          </h4>
                        </div>

                        {/* Metadata Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
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
                              placeholder="C, POSIX, Docker, Make"
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
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
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
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
                      <div key={exp.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Company</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperienceItem(exp.id, { company: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Role / Title</label>
                            <input
                              type="text"
                              value={exp.role}
                              onChange={(e) => updateExperienceItem(exp.id, { role: e.target.value })}
                              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm text-white focus:outline-none focus:border-white"
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
                    <div className="p-8 text-center bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800 text-zinc-500 text-sm">
                      Work Experience is hidden. 100% of vertical line budget is allocated to your 42 Projects.
                    </div>
                  )}
                </div>
              )}

              {activeSection === "SKILLS" && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeSection === "SUMMARY" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Target Role / Job Title
                    </label>
                    <input
                      type="text"
                      value={cvData.targetRole || "Software Engineer"}
                      onChange={(e) => setCVData({ ...cvData, targetRole: e.target.value })}
                      placeholder="Software Engineer"
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Professional Summary (Dr. Wissam 2-Line Rule)
                    </label>
                    <textarea
                      rows={3}
                      value={cvData.specializationTrack || ""}
                      onChange={(e) => setCVData({ ...cvData, specializationTrack: e.target.value })}
                      placeholder="Motivated 42 Beirut student with strong foundation in low-level systems programming in C/C++..."
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-white rounded-md text-sm text-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </main>

            {/* Optional Slide-Over Preview (Wide Displays Only, Toggled via Header) */}
            {showSlideOverPreview && (
              <section className="hidden 2xl:flex w-[480px] shrink-0 sticky top-[105px] h-[calc(100vh-130px)]">
                <CanvasPreviewViewport
                  cvData={cvData}
                  onHeightBudgetChange={setHeightBudget}
                  onPrintPDF={handlePrintPDF}
                  onExportDocx={handleExportDocx}
                />
              </section>
            )}
          </div>
        )}
      </div>

      {/* Floating 6-Second Soft Delete Toast */}
      {undoBuffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-zinc-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
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
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
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

      {/* ATS Score Audit Dialog Modal */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">Dr. Wissam ATS Scorecard</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScoreModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Circular Gauge Hero */}
            <div className="flex items-center gap-5 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <svg width="70" height="70" viewBox="0 0 46 46" className="-rotate-90">
                <circle cx="23" cy="23" r="19.78" fill="none" stroke="#27272A" strokeWidth="4" />
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
                />
              </svg>
              <div>
                <div className="text-3xl font-black font-mono text-white">
                  {atsAudit.totalScore} <span className="text-sm font-normal text-zinc-500">/ 100</span>
                </div>
                <div className="text-xs text-zinc-400">
                  {atsAudit.totalScore >= 70
                    ? "Passes Dr. Wissam Recruit Audits"
                    : "Action items required for 100% compliance"}
                </div>
              </div>
            </div>

            {/* Breakdown Categories */}
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg">
                <span className="text-zinc-300">1. Content &amp; Quantitative Metrics</span>
                <span className="font-mono font-bold text-white">{atsAudit.contentScore} / 25</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg">
                <span className="text-zinc-300">2. Format &amp; 1-Page Line Budget (≤ 1027px)</span>
                <span className="font-mono font-bold text-white">{atsAudit.formatScore} / 25</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg">
                <span className="text-zinc-300">3. Best Practices (Verbs &amp; No Pronouns)</span>
                <span className="font-mono font-bold text-white">{atsAudit.bestPracticesScore} / 25</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded-lg">
                <span className="text-zinc-300">4. Application Readiness (Contact &amp; Links)</span>
                <span className="font-mono font-bold text-white">{atsAudit.applicationReadyScore} / 25</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScoreModalOpen(false)}
              className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Close Scorecard
            </button>
          </div>
        </div>
      )}

      {/* BYOK Modal */}
      {isBYOKOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-white" />
                <span>AI Synthesis API Keys</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBYOKOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Provide your own free Google Gemini or Groq API keys for limitless AI bullet suggestions.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Google Gemini API Key</label>
                <input
                  type="password"
                  value={userGeminiKey}
                  onChange={(e) => setUserGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Groq API Key (Fast Llama-3)</label>
                <input
                  type="password"
                  value={userGroqKey}
                  onChange={(e) => setUserGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBYOKOpen(false)}
              className="mt-2 w-full py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Save &amp; Close
            </button>
          </div>
        </div>
      )}

      {/* Style & Spacing Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-white" />
                <span>Dr. Wissam Template Rules</span>
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
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setStyleDensity("standard")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      styleDensity === "standard" ? "bg-white text-black" : "text-zinc-400"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleDensity("compact")}
                    className={`px-3 py-1 rounded text-xs font-semibold ${
                      styleDensity === "compact" ? "bg-white text-black" : "text-zinc-400"
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
    </div>
  );
}
