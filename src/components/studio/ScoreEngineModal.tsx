"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Target,
  CheckCircle2,
  Check,
  AlertCircle,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { CVData } from "@/types/resume";
import { StudioSection } from "./ReziStudioLayout";

interface ScoreEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvData: CVData;
  heightBudget: { height: number; isOverflow: boolean; percentage: number };
  targetJobDescription: string;
  onTargetJobDescriptionChange: (jd: string) => void;
  onJumpToSection?: (section: StudioSection, itemId?: string) => void;
  initialTab?: "overview" | "matcher" | "issues";
}

const PRONOUNS_REGEX = /\b(I|me|my|mine|we|us|our|ours)\b/i;
const PASSIVE_VOICE_REGEX = /\b(responsible for|helped to|worked on|was tasked with|assisted in)\b/i;
const PHONE_LEBANON_REGEX = /(?:\+961|00961|03|70|71|76|78|79|81)\s?\d{6}/;

export function ScoreEngineModal({
  isOpen,
  onClose,
  cvData,
  heightBudget,
  targetJobDescription,
  onTargetJobDescriptionChange,
  onJumpToSection,
  initialTab = "overview",
}: ScoreEngineModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "matcher" | "issues">(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Audit Calculations
  const audit = useMemo(() => {
    // 1. Collect all text and bullets
    const allBullets: { text: string; section: StudioSection; itemId?: string; label: string }[] = [];
    cvData.projects.forEach((p) => {
      p.bulletPoints.forEach((b) => {
        allBullets.push({ text: b, section: "PROJECTS", itemId: p.id, label: p.name });
      });
    });
    cvData.experience.forEach((e) => {
      e.bulletPoints.forEach((b) => {
        allBullets.push({ text: b, section: "EXPERIENCE", itemId: e.id, label: e.role });
      });
    });

    const allWords = [
      cvData.specializationTrack || "",
      ...allBullets.map((b) => b.text),
      ...cvData.skills.languages,
      ...cvData.skills.developerTools,
      ...cvData.skills.technologiesFrameworks,
    ]
      .join(" ")
      .split(/\s+/)
      .filter(Boolean);

    const wordCount = allWords.length;

    // --- Category 1: Content (Max 20) ---
    let contentScore = 0;
    const contentIssues: string[] = [];

    // Bullet count (3-4 for projects, 3-6 for roles)
    const validProjectBullets = cvData.projects.every(
      (p) => p.bulletPoints.length >= 2 && p.bulletPoints.length <= 5
    );
    if (validProjectBullets && cvData.projects.length > 0) {
      contentScore += 7;
    } else {
      contentIssues.push("Ensure each project has 2 to 4 high-impact bullets.");
    }

    // Word count budget (400 to 800 words)
    if (wordCount >= 300 && wordCount <= 750) {
      contentScore += 6;
    } else if (wordCount < 300) {
      contentIssues.push(`CV total word count is ${wordCount} words (recommended: 350-650 words).`);
    } else {
      contentIssues.push(`CV is verbose (${wordCount} words). Trim bullets to fit 1 page.`);
    }

    // Metrics % (bullets containing numbers)
    const metricsBullets = allBullets.filter((b) => /\d+/.test(b.text));
    const metricRatio = allBullets.length > 0 ? metricsBullets.length / allBullets.length : 0;
    contentScore += Math.min(7, Math.round(metricRatio * 7));
    if (metricRatio < 0.5) {
      contentIssues.push("Fewer than 50% of your bullets include quantitative metrics/numbers.");
    }

    // --- Category 2: Format (Max 20) ---
    let formatScore = 0;
    const formatIssues: string[] = [];

    if (!heightBudget.isOverflow && heightBudget.height <= 1027) {
      formatScore += 12;
    } else {
      const overflow = heightBudget.height - 1027;
      formatScore += Math.max(2, 12 - Math.round(overflow / 25));
      formatIssues.push("Content exceeds 1-page budget. Consider trimming bullets or removing a project.");
    }

    if (cvData.projects && cvData.projects.length >= 2) {
      formatScore += 4;
    } else {
      formatIssues.push("Ensure at least 2 technical projects are featured on your CV.");
    }

    // Section spacing & title format
    if (cvData.contact.fullName.trim()) formatScore += 4;

    // --- Category 3: Optimization / Keyword Match (Max 20) ---
    let optimizationScore = 10;
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    if (targetJobDescription.trim()) {
      // Extract target keywords from job description
      const jdWords = targetJobDescription
        .toLowerCase()
        .replace(/[^a-z0-9+#\.\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      const candidateKeywords = [
        "c", "c++", "linux", "posix", "docker", "make", "valgrind", "gdb", "git",
        "networking", "sockets", "epoll", "concurrency", "threads", "mutex",
        "algorithms", "data structures", "python", "typescript", "react", "next.js",
        "sql", "postgresql", "redis", "nginx", "rest", "api", "microservices",
        "oop", "distributed", "performance", "benchmarking", "testing", "ci/cd"
      ];

      const relevantJdTerms = Array.from(new Set(candidateKeywords.filter((kw) => targetJobDescription.toLowerCase().includes(kw))));
      const cvText = [
        ...allWords,
        ...cvData.skills.languages,
        ...cvData.skills.developerTools,
        ...cvData.skills.technologiesFrameworks,
      ].join(" ").toLowerCase();

      relevantJdTerms.forEach((term) => {
        if (cvText.includes(term)) {
          matchedKeywords.push(term);
        } else {
          missingKeywords.push(term);
        }
      });

      const totalTerms = relevantJdTerms.length;
      if (totalTerms > 0) {
        const ratio = matchedKeywords.length / totalTerms;
        optimizationScore = Math.round(ratio * 20);
      }
    }

    // --- Category 4: Best Practices (Max 20) ---
    let bestPracticesScore = 0;
    const flaggedItems: { text: string; issue: string; section: StudioSection; itemId?: string; label: string }[] = [];

    // Pronouns check
    const pronounBullets = allBullets.filter((b) => PRONOUNS_REGEX.test(b.text));
    if (pronounBullets.length === 0) {
      bestPracticesScore += 8;
    } else {
      pronounBullets.forEach((b) => {
        flaggedItems.push({
          text: b.text,
          issue: "Contains forbidden personal pronoun (I/me/my/we).",
          section: b.section,
          itemId: b.itemId,
          label: b.label,
        });
      });
    }

    // Passive voice check
    const passiveBullets = allBullets.filter((b) => PASSIVE_VOICE_REGEX.test(b.text));
    if (passiveBullets.length === 0) {
      bestPracticesScore += 6;
    } else {
      passiveBullets.forEach((b) => {
        flaggedItems.push({
          text: b.text,
          issue: "Weak/passive opening phrase. Replace with active engineering verb.",
          section: b.section,
          itemId: b.itemId,
          label: b.label,
        });
      });
    }

    // Action verb diversity
    const openingVerbs = allBullets
      .map((b) => b.text.trim().split(" ")[0]?.toLowerCase() || "")
      .filter(Boolean);
    const uniqueVerbs = new Set(openingVerbs);
    const verbDiversity = openingVerbs.length > 0 ? uniqueVerbs.size / openingVerbs.length : 1;
    bestPracticesScore += Math.round(verbDiversity * 6);
    if (verbDiversity < 0.7 && openingVerbs.length >= 4) {
      flaggedItems.push({
        text: `Repeated verbs found (${openingVerbs.length - uniqueVerbs.size} duplicates).`,
        issue: "Rotate starting verbs using the AI Split Button to demonstrate diverse engineering breadth.",
        section: "PROJECTS",
        label: "Action Verbs",
      });
    }

    // --- Category 5: Application Ready (Max 20) ---
    let applicationReadyScore = 0;
    const readinessIssues: string[] = [];

    if (cvData.contact.fullName.trim()) applicationReadyScore += 4;
    else readinessIssues.push("Add your full name.");

    if (cvData.contact.email.includes("@")) applicationReadyScore += 4;
    else readinessIssues.push("Add a valid email address.");

    if (PHONE_LEBANON_REGEX.test(cvData.contact.phoneNumber) || cvData.contact.phoneNumber.length >= 8) {
      applicationReadyScore += 4;
    } else {
      readinessIssues.push("Add a valid contact phone number.");
    }

    if (cvData.contact.githubUrl || cvData.contact.linkedinUrl) {
      applicationReadyScore += 4;
    } else {
      readinessIssues.push("Add your GitHub or LinkedIn profile link.");
    }

    const hasDates = cvData.projects.every((p) => p.date && p.date.trim().length > 0);
    if (hasDates) applicationReadyScore += 4;
    else readinessIssues.push("Ensure all project completion dates are specified.");

    const totalScore = Math.min(
      100,
      Math.max(0, contentScore + formatScore + optimizationScore + bestPracticesScore + applicationReadyScore)
    );

    return {
      totalScore,
      wordCount,
      content: { score: contentScore, max: 20, issues: contentIssues },
      format: { score: formatScore, max: 20, issues: formatIssues },
      optimization: { score: optimizationScore, max: 20, matchedKeywords, missingKeywords },
      bestPractices: { score: bestPracticesScore, max: 20, flaggedItems },
      applicationReady: { score: applicationReadyScore, max: 20, issues: readinessIssues },
    };
  }, [cvData, heightBudget, targetJobDescription]);

  // Semi-circle SVG Gauge Math (236px x 118px)
  // Radius = 90px. Arc length = PI * 90 = 282.743px
  const arcLength = 282.743;
  const strokeOffset = arcLength - (audit.totalScore / 100) * arcLength;

  if (!isOpen) return null;

  return (
    <div
      data-test-id="score-dialog"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#141417] border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-150 text-white my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Target className="w-5 h-5 text-white" />
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                CV Readiness Scorecard
              </h3>
              <p className="text-xs text-zinc-400">
                ATS Standard Engineering Audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl p-1 cursor-pointer transition"
          >
            &times;
          </button>
        </div>

        {/* 236px x 118px Semi-Circular SVG Gauge Hero */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-[#1C1C21] rounded-xl border border-zinc-800 shadow-inner">
          <div className="relative flex flex-col items-center">
            {/* SVG Arc Gauge */}
            <svg
              width="236"
              height="118"
              viewBox="0 0 236 118"
              className="overflow-visible"
              data-test-id="rezi-gauge-chart"
            >
              {/* Background Track */}
              <path
                d="M 28 118 A 90 90 0 0 1 208 118"
                fill="none"
                stroke="#27272A"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Dynamic Metric Stroke */}
              <path
                d="M 28 118 A 90 90 0 0 1 208 118"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={arcLength}
                strokeDashoffset={strokeOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Score Center Number */}
            <div className="absolute bottom-1 flex flex-col items-center">
              <span className="text-4xl font-mono font-black text-white leading-none">
                {audit.totalScore}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">
                Out of 100
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                {audit.totalScore >= 80
                  ? "Application Ready"
                  : audit.totalScore >= 60
                  ? "Good Standing • Minor Fixes"
                  : "Action Required for ATS Compliance"}
              </h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calculated across 5 benchmarks: Word count ({audit.wordCount}), 1-page line budget, and action verb diversity.
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                {heightBudget.isOverflow ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                    <span>1-Page Overflow</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-zinc-200" />
                    <span>100% 1-Page Fit</span>
                  </>
                )}
              </span>
              <span>•</span>
              <span>{audit.bestPractices.flaggedItems.length} Flagged Bullets</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#0C0C0E] p-1 rounded-lg border border-zinc-800 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer text-center ${
              activeTab === "overview" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Overview Breakdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matcher")}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer text-center ${
              activeTab === "matcher" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Job Matcher ({audit.optimization.score}/20)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("issues")}
            className={`flex-1 py-1.5 rounded-md transition cursor-pointer text-center ${
              activeTab === "issues" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            Fix Issues ({audit.bestPractices.flaggedItems.length})
          </button>
        </div>

        {/* Tab 1: 5-Category Overview */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-2.5 text-xs">
            {/* 1. Content */}
            <div className="flex items-center justify-between p-3 bg-[#1C1C21] rounded-lg border border-zinc-800/80">
              <div>
                <div className="font-semibold text-white">1. Content &amp; Quantitative Metrics</div>
                <div className="text-[11px] text-zinc-400">
                  {audit.wordCount} words • 3-4 bullets per project • Numbers in bullets
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {audit.content.score} / {audit.content.max}
              </span>
            </div>

            {/* 2. Format */}
            <div className="flex items-center justify-between p-3 bg-[#1C1C21] rounded-lg border border-zinc-800/80">
              <div>
                <div className="font-semibold text-white">2. Format &amp; 1-Page Height Budget</div>
                <div className="text-[11px] text-zinc-400">
                  {heightBudget.isOverflow ? "Exceeds 1-page format" : "Fits 1-page format"} • ATS Standard single-column layout
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {audit.format.score} / {audit.format.max}
              </span>
            </div>

            {/* 3. Optimization */}
            <div className="flex items-center justify-between p-3 bg-[#1C1C21] rounded-lg border border-zinc-800/80">
              <div>
                <div className="font-semibold text-white">3. Job Description Optimization</div>
                <div className="text-[11px] text-zinc-400">
                  {targetJobDescription ? `${audit.optimization.matchedKeywords.length} matched keywords` : "Paste a target job description to benchmark keywords"}
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {audit.optimization.score} / {audit.optimization.max}
              </span>
            </div>

            {/* 4. Best Practices */}
            <div className="flex items-center justify-between p-3 bg-[#1C1C21] rounded-lg border border-zinc-800/80">
              <div>
                <div className="font-semibold text-white">4. Best Practices &amp; Syntax</div>
                <div className="text-[11px] text-zinc-400">
                  Zero pronouns • Strong opening verbs • Active voice
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {audit.bestPractices.score} / {audit.bestPractices.max}
              </span>
            </div>

            {/* 5. Application Ready */}
            <div className="flex items-center justify-between p-3 bg-[#1C1C21] rounded-lg border border-zinc-800/80">
              <div>
                <div className="font-semibold text-white">5. Application Readiness</div>
                <div className="text-[11px] text-zinc-400">
                  Phone format (+961) • GitHub • LinkedIn • Completion dates
                </div>
              </div>
              <span className="font-mono font-bold text-white text-sm">
                {audit.applicationReady.score} / {audit.applicationReady.max}
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Job Keyword Matcher */}
        {activeTab === "matcher" && (
          <div className="flex flex-col gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-1.5">
                Target Job Description
              </label>
              <textarea
                rows={4}
                value={targetJobDescription}
                onChange={(e) => onTargetJobDescriptionChange(e.target.value)}
                placeholder="Paste the target job description (e.g. C/C++ Backend Engineer, Systems Programmer, DevOps Intern)..."
                className="w-full p-3 bg-[#0C0C0E] border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-white resize-none text-xs leading-relaxed placeholder:text-zinc-500 font-mono"
              />
            </div>

            {targetJobDescription ? (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="font-bold text-white mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>Matched Keywords ({audit.optimization.matchedKeywords.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {audit.optimization.matchedKeywords.length > 0 ? (
                      audit.optimization.matchedKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white text-black font-mono font-bold text-[11px] rounded"
                        >
                          <Check className="w-3 h-3 text-black stroke-[3]" />
                          <span>{kw}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500">No matching technical keywords found yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Recommended Missing Keywords ({audit.optimization.missingKeywords.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {audit.optimization.missingKeywords.length > 0 ? (
                      audit.optimization.missingKeywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2.5 py-1 bg-[#1C1C21] border border-zinc-700 text-zinc-300 font-mono text-[11px] rounded"
                        >
                          + {kw}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500">All target skills detected in your CV!</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-400">
                Paste any engineering job description above to see real-time ATS keyword matching and missing skills.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Interactive Issue Breakdown with Jump-to-Item */}
        {activeTab === "issues" && (
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 text-xs">
            {audit.bestPractices.flaggedItems.length > 0 || audit.content.issues.length > 0 || audit.format.issues.length > 0 ? (
              <>
                {audit.bestPractices.flaggedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#1C1C21] border border-zinc-800 rounded-lg flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{item.label}: {item.issue}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 italic line-clamp-2">
                        &quot;{item.text}&quot;
                      </p>
                    </div>

                    {onJumpToSection && (
                      <button
                        type="button"
                        onClick={() => {
                          onJumpToSection(item.section, item.itemId);
                          onClose();
                        }}
                        className="shrink-0 px-2.5 py-1 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 rounded text-[11px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Fix</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

                {audit.format.issues.map((iss, idx) => (
                  <div key={idx} className="p-3 bg-[#1C1C21] border border-zinc-800 rounded-lg text-zinc-300">
                    <div className="font-bold text-white">Format Fix:</div>
                    <div>{iss}</div>
                  </div>
                ))}
              </>
            ) : (
              <div className="p-8 text-center text-zinc-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-white" />
                <div className="font-bold text-white">Zero Critical Issues Detected!</div>
                <p className="text-xs max-w-sm">
                  Your CV conforms to ATS standards with concise bullets and single-page format compliance.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-wider text-xs rounded-lg transition cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}
