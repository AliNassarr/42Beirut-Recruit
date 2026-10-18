"use client";

import React, { useState } from "react";
import { useCVStore } from "@/lib/store/cv-store";
import { getProjectKnowledge, getProjectTechnicalChips, CAMPUS_ROLES } from "@/lib/knowledge-base";
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Code2, Users, Briefcase, AlertCircle, AlertTriangle, RotateCcw, X } from "lucide-react";

export function Step3Questionnaire() {
  const {
    studentProfile,
    targetRole,
    educationState,
    specializationTrack,
    showExperience,
    selectedProjects,
    projectAnswers,
    setProjectAnswer,
    selectedCampusRoles,
    campusRoleAnswers,
    setCampusRoleAnswer,
    selectedCoursework,
    setCurrentStep,
    setCVData,
    cvData,
    updateExperienceItem,
    userGeminiKey,
    userGroqKey,
  } = useCVStore();

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    rootCause: string;
    onRetry?: () => void;
  }>({ isOpen: false, title: "", rootCause: "" });

  // Check that every selected project has a non-empty personal implementation note
  const missingPersonalNotes = selectedProjects.filter((p) => {
    const note = projectAnswers[p.slug]?.["personal-notes"];
    return !note || note.trim().length < 5;
  });

  const toggleTechnicalChip = (slug: string, chipText: string) => {
    const currentNote = projectAnswers[slug]?.["personal-notes"] || "";
    const escaped = chipText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[,.]\\s*)${escaped}([,.]\\s*|$)`, "i");

    if (regex.test(currentNote) || currentNote.toLowerCase().includes(chipText.toLowerCase())) {
      // Remove chip
      let updated = currentNote;
      if (regex.test(currentNote)) {
        updated = currentNote.replace(regex, (_match: string, p1: string, p2: string) => {
          if (p1 && p2 && (p1.includes(",") || p1.includes(".")) && (p2.includes(",") || p2.includes("."))) {
            return ", ";
          }
          return "";
        });
      } else {
        const simpleRegex = new RegExp(escaped, "i");
        updated = currentNote.replace(simpleRegex, "");
      }
      updated = updated
        .replace(/,\s*,+/g, ",")
        .replace(/^\s*[,.\s]+/, "")
        .replace(/[,.\s]+$/, "")
        .trim();
      setProjectAnswer(slug, "personal-notes", updated);
    } else {
      // Append chip
      const trimmed = currentNote.trim();
      let updated = "";
      if (!trimmed) {
        updated = chipText;
      } else if (trimmed.endsWith(".") || trimmed.endsWith("!")) {
        updated = `${trimmed} ${chipText}.`;
      } else if (trimmed.endsWith(",")) {
        updated = `${trimmed} ${chipText}`;
      } else {
        updated = `${trimmed}, ${chipText}`;
      }
      setProjectAnswer(slug, "personal-notes", updated);
    }
  };

  const handleSynthesize = async () => {
    if (missingPersonalNotes.length > 0) {
      setValidationError(
        `Please fill the required personal note for: ${missingPersonalNotes.map((p) => p.name).join(", ")}. This ensures your CV sentences are 100% unique!`
      );
      return;
    }

    setValidationError(null);
    setIsSynthesizing(true);
    try {
      const payload = {
        profile: studentProfile,
        educationState,
        specializationTrack,
        targetRole,
        showExperience,
        styleDensity: cvData.styleDensity || "standard",
        showExtracurriculars: cvData.showExtracurriculars !== false,
        selectedProjects,
        projectAnswers,
        experienceItems: showExperience ? cvData.experience : [],
        educationItems: cvData.education,
        contactInfo: cvData.contact,
        selectedCampusRoles,
        campusRoleAnswers,
        selectedCoursework,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userGeminiKey) headers["x-user-gemini-key"] = userGeminiKey;
      if (userGroqKey) headers["x-user-groq-key"] = userGroqKey;

      const res = await fetch("/api/ai/generate-cv", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.cv) {
        setCVData(data.cv);
        setCurrentStep("EDITOR");
      } else {
        const rootCause = data.error || "The AI server returned an empty or unparseable response.";
        setErrorModal({
          isOpen: true,
          title: "AI Synthesis Error",
          rootCause,
          onRetry: () => {
            setErrorModal((prev) => ({ ...prev, isOpen: false }));
            handleSynthesize();
          },
        });
      }
    } catch (err: any) {
      console.error("Synthesis error:", err);
      const rootCause = err?.message || "Network timeout or connection refused while connecting to /api/ai/generate-cv.";
      setErrorModal({
        isOpen: true,
        title: "Connection / Network Failure",
        rootCause,
        onRetry: () => {
          setErrorModal((prev) => ({ ...prev, isOpen: false }));
          handleSynthesize();
        },
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => setCurrentStep("SETUP")}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to project setup
        </button>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Targeted Engineering Discovery</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Step 3 of 4
          </span>
        </h1>
        <p className="text-sm text-slate-400">
          Answer a few quick questions about what you built in each project. The short personal note guarantees
          the Anti-Duplication Engine generates 100% unique bullet points tailored to your code.
        </p>
      </div>

      <div className="space-y-6">
        {/* ============================================================== */}
        {/* Dynamic Project Cards                                          */}
        {/* ============================================================== */}
        {selectedProjects.map((proj) => {
          const kb = getProjectKnowledge(proj.slug, proj.name);
          const technicalChips = getProjectTechnicalChips(proj.slug || proj.name, proj.techStack);
          const questions = kb.questionnaireQuestions;
          const personalNote = projectAnswers[proj.slug]?.["personal-notes"] || "";

          return (
            <div
              key={proj.slug}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {proj.name}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400">
                        {proj.date || "2024"}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">{kb?.description || "42 Engineering Project"}</p>
                  </div>
                </div>
              </div>

              {/* Technical Checkbox / Radio Questions */}
              <div className="space-y-4 mb-5">
                {questions.map((q) => {
                  const currentAnswer = projectAnswers[proj.slug]?.[q.id];

                  if (q.type === "checkbox") {
                    const selectedOpts: string[] = Array.isArray(currentAnswer) ? currentAnswer : [];
                    return (
                      <div key={q.id}>
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          {q.question}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options?.map((opt) => {
                            const isChecked = selectedOpts.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const next = isChecked
                                    ? selectedOpts.filter((o) => o !== opt)
                                    : [...selectedOpts, opt];
                                  setProjectAnswer(proj.slug, q.id, next);
                                }}
                                className={`text-left text-xs p-2.5 rounded-lg border transition cursor-pointer flex items-center gap-2 ${
                                  isChecked
                                    ? "bg-cyan-500/15 border-cyan-400 text-cyan-200 font-medium"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                }`}
                              >
                                <span
                                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                    isChecked
                                      ? "bg-cyan-400 border-cyan-400 text-slate-950 text-[10px] font-bold"
                                      : "border-slate-700"
                                  }`}
                                >
                                  {isChecked && "✓"}
                                </span>
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (q.type === "radio") {
                    return (
                      <div key={q.id}>
                        <label className="text-xs font-semibold text-slate-300 block mb-2">
                          {q.question}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {q.options?.map((opt) => {
                            const isSelected = currentAnswer === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setProjectAnswer(proj.slug, q.id, opt)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                                  isSelected
                                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold"
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={q.id}>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                        {q.question}
                      </label>
                      <input
                        type="text"
                        value={currentAnswer || ""}
                        onChange={(e) => setProjectAnswer(proj.slug, q.id, e.target.value)}
                        placeholder={q.placeholder}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  );
                })}
              </div>

              {/* MANDATORY PERSONAL IMPLEMENTATION NOTE (ANTI-DUPLICATION) */}
              <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5">
                <label className="text-xs font-bold text-cyan-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>Specific Part You Coded or Bug You Fixed</span>
                    <span className="text-red-400">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Enforces 100% Unique Phrasing</span>
                </label>

                {/* 1-Click Technical Highlight Chips */}
                {technicalChips.length > 0 && (
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>1-Click Technical Highlights (click to toggle):</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Quick-fill notes</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {technicalChips.map((chip) => {
                        const isSelected = personalNote.toLowerCase().includes(chip.toLowerCase());
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleTechnicalChip(proj.slug, chip)}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold shadow-sm shadow-cyan-500/10"
                                : "bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                            }`}
                          >
                            <span className="text-xs">{isSelected ? "✓" : "+"}</span>
                            <span>{chip}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <textarea
                  rows={2}
                  value={personalNote}
                  onChange={(e) => setProjectAnswer(proj.slug, "personal-notes", e.target.value)}
                  placeholder="In your own words or click the technical highlight chips above: e.g., 'I wrote the signal handling for Ctrl-C in child processes, wrote the lexer to handle nested quotes, and fixed a file descriptor leak in the pipe loop.'"
                  className={`w-full bg-slate-900 border rounded-lg p-2.5 text-xs text-white focus:outline-none ${
                    personalNote.trim().length >= 5 ? "border-slate-700 focus:border-cyan-400" : "border-amber-500/60"
                  }`}
                />
                {personalNote.trim().length < 5 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    * Required: Click one or more technical chips above, or write at least one sentence about your specific contribution.
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* ============================================================== */}
        {/* Work Experience Refinement Section (If Toggled ON)             */}
        {/* ============================================================== */}
        {showExperience && cvData.experience.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <span>Prior Work Experience Notes</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Gemini AI will synthesize these notes into 2 to 3 concise, grounded bullet points adhering to Dr. Wissam&apos;s format.
            </p>

            <div className="space-y-3">
              {cvData.experience.map((exp, i) => (
                <div key={exp.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-200">
                      {exp.role} @ {exp.company}
                    </span>
                    <span className="text-xs text-slate-500">
                      {exp.startDate} – {exp.endDate}
                    </span>
                  </div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Job Notes / Achievements to Refine:
                  </label>
                  <textarea
                    rows={2}
                    value={exp.rawNotes || ""}
                    onChange={(e) => updateExperienceItem(exp.id, { rawNotes: e.target.value })}
                    placeholder="Describe what you built, technologies used, and any team responsibilities..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* Campus Roles Section (If Selected)                             */}
        {/* ============================================================== */}
        {selectedCampusRoles.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Campus Role Leadership</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select which mentorship and peer support activities you performed.
            </p>

            {selectedCampusRoles.map((role) => {
              const answers = campusRoleAnswers[role] || {};
              const boActivities: string[] = Array.isArray(answers["bo-activities"])
                ? answers["bo-activities"]
                : [];

              return (
                <div key={role} className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {role} Activities &amp; Responsibilities
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Mentored newer cadets through Common Core C programming and Unix system concepts",
                      "Supervised peer evaluations and guided candidates through debugging routines",
                      "Conducted technical orientation workshops for incoming Piscine batches",
                      "Assisted campus administration with lab maintenance and exam setups",
                    ].map((opt) => {
                      const isChecked = boActivities.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? boActivities.filter((o) => o !== opt)
                              : [...boActivities, opt];
                            setCampusRoleAnswer(role, "bo-activities", next);
                          }}
                          className={`text-left text-xs p-2.5 rounded-lg border transition cursor-pointer flex items-center gap-2 ${
                            isChecked
                              ? "bg-cyan-500/15 border-cyan-400 text-cyan-200 font-medium"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? "bg-cyan-400 border-cyan-400 text-slate-950 text-[10px] font-bold"
                                : "border-slate-700"
                            }`}
                          >
                            {isChecked && "✓"}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={() => setCurrentStep("SETUP")}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup
        </button>

        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing || missingPersonalNotes.length > 0}
          className={`px-8 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition shadow-xl ${
            !isSynthesizing && missingPersonalNotes.length === 0
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 cursor-pointer"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {isSynthesizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing 100% Unique CV...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Dr. Wissam CV</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* In-App Error Modal with Root Cause & Automated Retry */}
      {errorModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{errorModal.title}</h3>
                <p className="text-xs text-slate-400">Unable to complete CV synthesis</p>
              </div>
            </div>

            <div className="mb-5 bg-red-950/40 border border-red-900/60 rounded-xl p-3.5 text-xs text-red-200">
              <span className="font-semibold block mb-1 text-red-300">Root Cause Details:</span>
              <p className="font-mono text-[11px] leading-relaxed break-words">{errorModal.rootCause}</p>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Dismiss
              </button>
              {errorModal.onRetry && (
                <button
                  type="button"
                  onClick={errorModal.onRetry}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition shadow-lg shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Synthesis</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
