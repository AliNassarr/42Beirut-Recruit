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
import { BulletEditorRow, STRONG_VERBS } from "./BulletEditorRow";
import {
  Home,
  RefreshCw,
  Sliders,
  Settings2,
  Key,
  Download,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Building2,
  GraduationCap,
  Briefcase,
  Code2,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  FileText,
  X,
  ExternalLink,
  Target,
  Maximize2,
} from "lucide-react";
import { MOCK_42_STUDENT, createInitialCVFromIntra } from "@/lib/intra/mock-data";

export type StudioSection = "CONTACT" | "EDUCATION" | "EXPERIENCE" | "PROJECTS" | "SKILLS";

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
    studentProfile,
    setStudentProfile,
  } = useCVStore();

  // Active section pill
  const [activeSection, setActiveSection] = useState<StudioSection>("PROJECTS");
  // Active selected item in projects/experience aside list
  const [activeItemId, setActiveItemId] = useState<string>("");

  // Fullscreen Preview modal
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);
  // View mode: 'split' (deck + live canvas) or 'deck-only'
  const [viewMode, setViewMode] = useState<"split" | "preview">("split");

  // BYOK Modal & Settings Dialogs
  const [isBYOKOpen, setIsBYOKOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

  // Height budget state from canvas
  const [heightBudget, setHeightBudget] = useState<HeightBudget>({
    height: 980,
    printableBudget: 1027,
    percentage: 95,
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

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    desc: string;
    type: "success" | "info" | "warning";
  } | null>(null);

  // Export states
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
      type: "success",
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

  // SVG Circular Gauge calculation
  const gaugeColor =
    atsAudit.totalScore >= 70
      ? "#00BABC" // 42 Cyan
      : atsAudit.totalScore >= 50
      ? "#F59E0B" // Amber
      : "#EF4444"; // Red

  const circumference = 124.28; // 2 * PI * 19.78
  const strokeDashoffset = circumference - (atsAudit.totalScore / 100) * circumference;

  // Print PDF Trigger
  const handlePrintPDF = () => {
    setToastMessage({
      title: "Opening Print-to-PDF...",
      desc: "Ensure 'Headers and footers' is unchecked in your browser print settings for clean single-page margins.",
      type: "info",
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
        title: "Word (.docx) Exported!",
        desc: "Native Word document downloaded with calibrated right-aligned tab stops.",
        type: "success",
      });
    } catch (err: any) {
      console.error("DOCX generation error:", err);
      setToastMessage({
        title: "Word Export Failed",
        desc: err?.message || "Failed to generate Word document.",
        type: "warning",
      });
    } finally {
      setIsExportingDocx(false);
    }
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
      type: "success",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Global Left Navigation Rail (70px) */}
      <aside className="w-[70px] bg-[#0F172A] border-r border-slate-800 flex flex-col items-center py-6 gap-6 fixed top-0 bottom-0 left-0 z-40">
        {/* Brand 42 Logo */}
        <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono font-black text-sm text-cyan-400 shadow-md">
          42
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-3 w-full px-2 mt-2">
          {/* Dashboard / Home */}
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer ${
              viewMode === "split"
                ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
            title="Studio Editor"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Intra 42 Sync */}
          <button
            type="button"
            onClick={handleIntraSync}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition cursor-pointer"
            title="Sync / Reset 42 Intra Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* AI Settings (BYOK) */}
          <button
            type="button"
            onClick={() => setIsBYOKOpen(true)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition cursor-pointer ${
              userGeminiKey || userGroqKey
                ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
            title="AI API Keys (Gemini / Groq)"
          >
            <Key className="w-5 h-5" />
          </button>

          {/* Template Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
            title="Dr. Wissam Style & Spacing Rules"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </nav>

        {/* Bottom ATS Gauge Teaser in Left Rail */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => setIsScoreModalOpen(true)}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="View Dr. Wissam ATS Scorecard"
          >
            <svg width="40" height="40" viewBox="0 0 46 46" className="-rotate-90">
              <circle
                cx="23"
                cy="23"
                r="19.78"
                fill="none"
                stroke="#1E293B"
                strokeWidth="4"
              />
              <circle
                cx="23"
                cy="23"
                r="19.78"
                fill="none"
                stroke={gaugeColor}
                strokeWidth="4"
                strokeDasharray="124.28"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </button>
          <span className="text-[10px] font-mono font-bold text-slate-400">
            {atsAudit.totalScore}
          </span>
        </div>
      </aside>

      {/* Main Workspace Frame (Offset left by 70px) */}
      <div className="flex-1 ml-[70px] flex flex-col min-h-screen">
        {/* 2. Top Sub-Navigation Header (81px) */}
        <header className="h-[81px] bg-[#0F172A]/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Document Title Input + Autosave */}
          <div className="flex flex-col">
            <input
              type="text"
              value={cvData.contact.fullName}
              onChange={(e) => updateContact({ fullName: e.target.value })}
              className="bg-transparent text-lg font-bold text-white focus:outline-none focus:border-b focus:border-cyan-400 max-w-[260px] sm:max-w-xs truncate"
              placeholder="Your Full Name"
            />
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>42 Beirut Career Studio · Autosaved</span>
            </div>
          </div>

          {/* Center: Section Pills */}
          <nav className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-full p-1 gap-1">
            {(
              [
                "CONTACT",
                "EDUCATION",
                "EXPERIENCE",
                "PROJECTS",
                "SKILLS",
              ] as StudioSection[]
            ).map((sec) => {
              const isActive = activeSection === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setActiveSection(sec)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase transition rounded-full cursor-pointer ${
                    isActive
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {sec}
                </button>
              );
            })}
          </nav>

          {/* Right: View Mode & Export Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullScreenPreview(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Finish Up &amp; Preview</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-wider transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? "Exporting..." : "Word"}</span>
            </button>
          </div>
        </header>

        {/* Mobile Section Tabs */}
        <div className="md:hidden flex items-center overflow-x-auto bg-slate-900 border-b border-slate-800 px-4 py-2 gap-2">
          {(
            [
              "CONTACT",
              "EDUCATION",
              "EXPERIENCE",
              "PROJECTS",
              "SKILLS",
            ] as StudioSection[]
          ).map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1 text-xs font-bold uppercase whitespace-nowrap rounded-full ${
                activeSection === sec
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-400 bg-slate-800"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* 3. Asymmetric Two-Column Builder Deck */}
        <div className="flex-1 flex flex-col xl:flex-row gap-6 max-w-[1440px] w-full mx-auto p-4 md:p-8">
          {/* Left In-Aside Deck (308px) */}
          <aside className="xl:w-[308px] flex-none flex flex-col gap-4">
            {/* The 46px Circular SVG ATS Score Card */}
            <div className="bg-[#121826] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
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
                      stroke="#1E293B"
                      strokeWidth="4.5"
                    />
                    <circle
                      cx="23"
                      cy="23"
                      r="19.78"
                      fill="none"
                      stroke={gaugeColor}
                      strokeWidth="4.5"
                      strokeDasharray="124.28"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-mono font-bold text-xs text-white group-hover:text-cyan-400 transition">
                    {atsAudit.totalScore}
                  </span>
                </button>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Dr. Wissam Score
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {atsAudit.totalScore >= 70
                      ? "High ATS Match"
                      : atsAudit.totalScore >= 50
                      ? "Needs Optimization"
                      : "Critical Issues"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsScoreModalOpen(true)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
              >
                Audit
              </button>
            </div>

            {/* Draggable Item Cards (Projects or Experience) */}
            <div className="bg-[#121826] border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-lg flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {activeSection === "PROJECTS" ? "Selected Projects" : "Work Experiences"}
                </span>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {activeSection === "PROJECTS" ? cvData.projects.length : cvData.experience.length} items
                </span>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {activeSection === "PROJECTS" ? (
                  cvData.projects.map((proj, idx) => {
                    const isSelected = activeItemId === proj.id;
                    return (
                      <div
                        key={proj.id}
                        onClick={() => setActiveItemId(proj.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                          <div className="truncate">
                            <div className="font-bold truncate">{proj.name}</div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {proj.techStack || "C / C++"} · {proj.bulletPoints.length} bullets
                            </div>
                          </div>
                        </div>

                        {/* Reorder & Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveProject(idx, "up");
                              }}
                              className="p-1 hover:text-cyan-400 text-slate-500"
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
                              className="p-1 hover:text-cyan-400 text-slate-500"
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
                            className="p-1 hover:text-red-400 text-slate-500"
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
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                          <div className="truncate">
                            <div className="font-bold truncate">{exp.role}</div>
                            <div className="text-[10px] text-slate-500 truncate">
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
                              className="p-1 hover:text-cyan-400 text-slate-500"
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
                              className="p-1 hover:text-cyan-400 text-slate-500"
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
                            className="p-1 hover:text-red-400 text-slate-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add New Item Button */}
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-cyan-400 transition cursor-pointer mt-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const newExp = {
                      id: `exp-${Date.now()}`,
                      company: "Tech Company",
                      role: "Software Engineering Intern",
                      location: "Beirut, Lebanon",
                      startDate: "June 2024",
                      endDate: "September 2024",
                      bulletPoints: [
                        "Collaborated with engineering team to implement backend APIs with zero memory leaks.",
                      ],
                    };
                    addExperienceItem(newExp);
                    setActiveItemId(newExp.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-cyan-400 transition cursor-pointer mt-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Work Experience</span>
                </button>
              )}
            </div>
          </aside>

          {/* Center Form Deck (1108px max / flex-1) */}
          <main className="flex-1 bg-[#121826] border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl">
            {/* Render Active Section Content */}
            {activeSection === "CONTACT" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-white">Contact &amp; Student Standing</h3>
                  <p className="text-xs text-slate-400">
                    ATS-compliant header formatting strictly following Dr. Wissam line budgets.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.fullName}
                      onChange={(e) => updateContact({ fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      42 Common Core Level
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={cvData.contact.level ?? 9}
                      onChange={(e) => updateContact({ level: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={cvData.contact.email}
                      onChange={(e) => updateContact({ email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={cvData.contact.phoneNumber}
                      onChange={(e) => updateContact({ phoneNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      GitHub Handle / URL
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.githubUrl}
                      onChange={(e) => updateContact({ githubUrl: normalizeGitHub(e.target.value) })}
                      placeholder="github.com/login"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      LinkedIn Handle / URL
                    </label>
                    <input
                      type="text"
                      value={cvData.contact.linkedinUrl}
                      onChange={(e) => updateContact({ linkedinUrl: normalizeLinkedIn(e.target.value) })}
                      placeholder="linkedin.com/in/login"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "EDUCATION" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-white">Education &amp; Cursus Standing</h3>
                  <p className="text-xs text-slate-400">
                    Dr. Wissam rule: Explicitly states Common Core level &amp; Piscine standing without degree ambiguity.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {cvData.education.map((edu, idx) => (
                    <div key={edu.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Institution
                          </label>
                          <input
                            type="text"
                            value={edu.institution}
                            onChange={(e) => updateEducationItem(edu.id, { institution: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Degree / Program
                          </label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => updateEducationItem(edu.id, { degree: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Program / Track
                          </label>
                          <input
                            type="text"
                            value={edu.program}
                            onChange={(e) => updateEducationItem(edu.id, { program: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Graduation / End Date
                          </label>
                          <input
                            type="text"
                            value={edu.endDate}
                            onChange={(e) => updateEducationItem(edu.id, { endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "PROJECTS" && (
              <div className="flex flex-col gap-5">
                {(() => {
                  const currentProj = cvData.projects.find((p) => p.id === activeItemId) || cvData.projects[0];
                  if (!currentProj) {
                    return (
                      <div className="text-center py-12 text-slate-400">
                        No projects selected. Click &quot;+ Add Project&quot; in the left panel.
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span>{currentProj.name}</span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {currentProj.slug}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-400">
                            Dr. Wissam rule: 2 to 4 high-impact bullets with quantitative C stack metrics.
                          </p>
                        </div>
                      </div>

                      {/* Metadata Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                            Technologies / Tech Stack
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
                            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
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
                            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Bullets List with Dual-Layer BulletEditorRow */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Bullet Points ({currentProj.bulletPoints.length} / 4 recommended)
                          </label>
                          <button
                            type="button"
                            onClick={() => addProjectBullet(currentProj.id, "")}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
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
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Work Experience</h3>
                    <p className="text-xs text-slate-400">
                      Dr. Wissam rule: If you have no industry experience, toggle OFF to grant full line budget to 42 projects.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={cvData.showExperience}
                      onChange={(e) => setShowExperience(e.target.checked)}
                      className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Show Experience on CV</span>
                  </label>
                </div>

                {cvData.showExperience ? (
                  cvData.experience.map((exp, expIdx) => (
                    <div key={exp.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Company</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => updateExperienceItem(exp.id, { company: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Role / Title</label>
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) => updateExperienceItem(exp.id, { role: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Experience Bullets */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Accomplishments &amp; Bullets</label>
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
                  <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-slate-400 text-sm">
                    Work Experience section is currently hidden. 100% of vertical line budget is allocated to your 42 Projects.
                  </div>
                )}
              </div>
            )}

            {activeSection === "SKILLS" && (
              <div className="flex flex-col gap-5">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-bold text-white">Technical Skills &amp; Stack</h3>
                  <p className="text-xs text-slate-400">
                    Dr. Wissam rule: Single-line comma-separated lists categorized by technical domain.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Live Preview Viewport (Desktop View) */}
          <section className="hidden 2xl:flex flex-1 min-w-[500px] sticky top-[105px] h-[calc(100vh-130px)]">
            <CanvasPreviewViewport
              cvData={cvData}
              onHeightBudgetChange={setHeightBudget}
              onPrintPDF={handlePrintPDF}
              onExportDocx={handleExportDocx}
              onToggleFullScreen={() => setIsFullScreenPreview(true)}
            />
          </section>
        </div>
      </div>

      {/* Floating 6-Second Soft Delete Toast */}
      {undoBuffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#121826] border border-cyan-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="text-xs">
            Removed <strong>&quot;{undoBuffer.label}&quot;</strong> from CV.
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="px-3 py-1 bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold uppercase transition hover:brightness-110 flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({undoBuffer.countdown}s)</span>
          </button>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="text-xs">
            <div className="font-bold">{toastMessage.title}</div>
            <div className="text-slate-400">{toastMessage.desc}</div>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-500 hover:text-white text-sm ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Fullscreen A4 Preview Modal (Finish Up & Preview Mode) */}
      {isFullScreenPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
          <CanvasPreviewViewport
            cvData={cvData}
            isFullScreen={true}
            onToggleFullScreen={() => setIsFullScreenPreview(false)}
            onHeightBudgetChange={setHeightBudget}
            onPrintPDF={handlePrintPDF}
            onExportDocx={handleExportDocx}
          />
        </div>
      )}

      {/* ATS Score Audit Dialog */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Dr. Wissam ATS Scorecard</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScoreModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Circular Gauge Hero */}
            <div className="flex items-center gap-5 p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <svg width="70" height="70" viewBox="0 0 46 46" className="-rotate-90">
                <circle cx="23" cy="23" r="19.78" fill="none" stroke="#1E293B" strokeWidth="4" />
                <circle
                  cx="23"
                  cy="23"
                  r="19.78"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="4"
                  strokeDasharray="124.28"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <div className="text-3xl font-black font-mono text-white">
                  {atsAudit.totalScore} <span className="text-sm font-normal text-slate-500">/ 100</span>
                </div>
                <div className="text-xs text-slate-400">
                  {atsAudit.totalScore >= 70
                    ? "Passes Dr. Wissam Recruit Audits"
                    : "Action items required for 100% compliance"}
                </div>
              </div>
            </div>

            {/* Breakdown Categories */}
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl">
                <span>1. Content &amp; Quantitative Metrics</span>
                <span className="font-mono font-bold text-cyan-400">{atsAudit.contentScore} / 25</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl">
                <span>2. Format &amp; 1-Page Line Budget (≤ 1027px)</span>
                <span className="font-mono font-bold text-cyan-400">{atsAudit.formatScore} / 25</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl">
                <span>3. Best Practices (Verbs &amp; No Pronouns)</span>
                <span className="font-mono font-bold text-cyan-400">{atsAudit.bestPracticesScore} / 25</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl">
                <span>4. Application Readiness (Contact &amp; Links)</span>
                <span className="font-mono font-bold text-cyan-400">{atsAudit.applicationReadyScore} / 25</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsScoreModalOpen(false)}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs uppercase transition cursor-pointer"
            >
              Close Scorecard
            </button>
          </div>
        </div>
      )}

      {/* BYOK Modal */}
      {isBYOKOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>AI Synthesis API Keys</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBYOKOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Provide your own free Google Gemini or Groq API keys for limitless AI bullet suggestions and synthesis.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Google Gemini API Key</label>
                <input
                  type="password"
                  value={userGeminiKey}
                  onChange={(e) => setUserGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Groq API Key (Fast Llama-3)</label>
                <input
                  type="password"
                  value={userGroqKey}
                  onChange={(e) => setUserGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBYOKOpen(false)}
              className="mt-2 w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs uppercase transition cursor-pointer"
            >
              Save &amp; Close
            </button>
          </div>
        </div>
      )}

      {/* Style & Spacing Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Dr. Wissam Template Rules</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Vertical Density</div>
                  <div className="text-slate-400 text-[11px]">Calibrate line spacing to fit 1 page</div>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStyleDensity("standard")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      styleDensity === "standard" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleDensity("compact")}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      styleDensity === "compact" ? "bg-cyan-500 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">Extracurriculars</div>
                  <div className="text-slate-400 text-[11px]">Show campus Bocal &amp; Piscine activities</div>
                </div>
                <input
                  type="checkbox"
                  checked={showExtracurriculars}
                  onChange={(e) => setShowExtracurriculars(e.target.checked)}
                  className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="mt-2 w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs uppercase transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
