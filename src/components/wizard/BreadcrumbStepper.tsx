"use client";

import React, { useState, useEffect } from "react";
import { useCVStore, WizardStep } from "@/lib/store/cv-store";
import {
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Save,
  CheckCircle2,
} from "lucide-react";

interface StepConfig {
  id: WizardStep;
  number: number;
  label: string;
  shortDesc: string;
}

const STEPS: StepConfig[] = [
  { id: "LOGIN", number: 1, label: "Intra Sync", shortDesc: "42 Authentication" },
  { id: "SETUP", number: 2, label: "Setup & Experience", shortDesc: "Milestones & Projects" },
  { id: "QUESTIONNAIRE", number: 3, label: "Technical Discovery", shortDesc: "Personal Insights" },
  { id: "EDITOR", number: 4, label: "Live Editor & Export", shortDesc: "Dr. Wissam Template" },
];

export function BreadcrumbStepper() {
  const {
    currentStep,
    setCurrentStep,
    lastSavedTimestamp,
    resetToDefaults,
    studentProfile,
    cvData,
  } = useCVStore();

  const [timeAgo, setTimeAgo] = useState("Draft saved");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update relative time ago every 15 seconds
  useEffect(() => {
    const update = () => {
      if (!lastSavedTimestamp) {
        setTimeAgo("Draft saved");
        return;
      }
      const diffSec = Math.max(0, Math.floor((Date.now() - lastSavedTimestamp) / 1000));
      if (diffSec < 10) {
        setTimeAgo("Saved just now");
      } else if (diffSec < 60) {
        setTimeAgo(`Saved ${diffSec}s ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) {
          setTimeAgo(`Saved ${diffMin}m ago`);
        } else {
          const diffHr = Math.floor(diffMin / 60);
          setTimeAgo(`Saved ${diffHr}h ago`);
        }
      }
    };

    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, [lastSavedTimestamp]);

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Determine if a step is clickable
  const isStepClickable = (step: StepConfig, index: number): boolean => {
    // Current step is not re-navigated
    if (step.id === currentStep) return false;

    // If authenticated or has student profile or custom data, steps 1, 2, 3, 4 can be jumped to
    const hasProfileOrData = Boolean(studentProfile || cvData.contact.fullName);
    if (hasProfileOrData) return true;

    // Otherwise, can only jump to completed steps or current
    return index <= currentIndex;
  };

  const handleStepClick = (stepId: WizardStep) => {
    setCurrentStep(stepId);
  };

  const handleConfirmReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
  };

  const isEditor = currentStep === "EDITOR";

  return (
    <>
      <nav
        aria-label="Wizard Progress"
        className={`w-full bg-slate-900/95 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md px-4 ${
          isEditor ? "py-1.5" : "py-2.5"
        } shadow-md print:hidden transition-all duration-150`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
          {/* Logo / Brand Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-black ${
                isEditor ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm"
              }`}
            >
              42
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>42Beirut-Recruit</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Dr. Wissam CV
                </span>
              </div>
              {!isEditor && (
                <div className="text-[10px] text-slate-400">
                  {cvData.contact.fullName || "42 Beirut Cadet"}
                </div>
              )}
            </div>
          </div>

          {/* Stepper Tabs */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentIndex;
              const isClickable = isStepClickable(step, index);

              return (
                <React.Fragment key={step.id}>
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden sm:block" />
                  )}

                  <button
                    type="button"
                    onClick={() => isClickable && handleStepClick(step.id)}
                    disabled={!isClickable}
                    className={`flex items-center gap-1.5 rounded-xl transition text-left ${
                      isEditor ? "px-2.5 py-1 text-xs" : "px-3 py-1.5"
                    } ${
                      isActive
                        ? "bg-cyan-500/15 border border-cyan-400/50 text-white shadow-sm shadow-cyan-500/10"
                        : isCompleted
                        ? "bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer"
                        : isClickable
                        ? "bg-slate-950/40 border border-transparent hover:border-slate-800 text-slate-400 cursor-pointer"
                        : "opacity-50 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    {/* Step Icon / Number */}
                    <div
                      className={`rounded-full flex items-center justify-center font-bold shrink-0 transition ${
                        isEditor ? "w-4 h-4 text-[10px]" : "w-5 h-5 text-[11px]"
                      } ${
                        isActive
                          ? "bg-cyan-500 text-slate-950 ring-2 ring-cyan-400/30"
                          : isCompleted
                          ? "bg-cyan-950 border border-cyan-500/40 text-cyan-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.number}
                    </div>

                    {/* Step Label */}
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-semibold leading-tight ${
                          isActive
                            ? "text-cyan-300"
                            : isCompleted
                            ? "text-slate-200"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </span>
                      {!isEditor && (
                        <span className="text-[10px] text-slate-500 hidden lg:inline leading-none">
                          {step.shortDesc}
                        </span>
                      )}
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Autosave Status & Reset Draft Control */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Autosave Indicator */}
            <div
              className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80"
              title="State is continuously auto-saved to your browser's local storage"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-slate-300">{timeAgo}</span>
            </div>

            {/* Reset Draft Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition cursor-pointer"
              title="Reset current draft back to initial 42 Intra profile"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Draft</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Confirmation Modal for Reset Draft */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset CV Draft to Defaults?</h3>
                <p className="text-xs text-slate-400">This action clears your local draft.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Resetting will clear all your typed responses, custom projects, previous university entries, and
              re-initialize your CV from your active 42 Intra profile. Are you sure you want to proceed?
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition shadow-lg shadow-red-600/20 cursor-pointer"
              >
                Yes, Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
