"use client";

import React, { useEffect, useState } from "react";
import { useCVStore, useHasHydrated } from "@/lib/store/cv-store";
import { BreadcrumbStepper } from "@/components/wizard/BreadcrumbStepper";
import { Step1Login } from "@/components/wizard/Step1Login";
import { Step2ProjectSetup } from "@/components/wizard/Step2ProjectSetup";
import { Step3Questionnaire } from "@/components/wizard/Step3Questionnaire";
import { Step4SplitEditor } from "@/components/wizard/Step4SplitEditor";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

export default function Home() {
  const hasHydrated = useHasHydrated();

  const {
    currentStep,
    setCurrentStep,
    setStudentProfile,
    setEducationState,
    setSelectedProjects,
    setSpecializationTrack,
    studentProfile,
    cvData,
    lastSavedTimestamp,
    resetToDefaults,
  } = useCVStore();

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);

  // Check for restored draft on client hydration
  useEffect(() => {
    if (hasHydrated && !hasCheckedDraft) {
      setHasCheckedDraft(true);
      // Show recovery banner if client hydrated a saved draft that has user progress
      const isSaved =
        lastSavedTimestamp &&
        (currentStep !== "LOGIN" || Boolean(studentProfile || cvData.contact.fullName));
      if (isSaved) {
        setShowRecoveryBanner(true);
      }
    }
  }, [hasHydrated, hasCheckedDraft, lastSavedTimestamp, currentStep, studentProfile, cvData.contact.fullName]);

  useEffect(() => {
    // Check URL parameters for OAuth status, session ID, or errors
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("auth");
    const errorParam = params.get("error");
    const sidParam = params.get("sid");

    if (errorParam) {
      setAuthError(decodeURIComponent(errorParam));
    }

    if (authStatus === "success" || sidParam) {
      setAuthLoading(true);
      const sessionUrl = sidParam
        ? `/api/auth/session?sid=${encodeURIComponent(sidParam)}`
        : "/api/auth/session";

      fetch(sessionUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            const user = data.user;
            setStudentProfile(user);

            // Auto-detect education state per Dr. Wissam rules:
            // Check if ft_transcendence is validated OR level >= 9.8
            const hasTranscendence = (user.validatedProjects || []).some(
              (p: any) =>
                p.slug === "ft_transcendence" ||
                p.name?.toLowerCase().includes("transcendence")
            );
            const isAdvanced = hasTranscendence || (user.level || 0) >= 9.8;

            if (user.grade === "Alumni" || (user.level || 0) >= 16) {
              setEducationState("STATE_C_ALUMNUS");
            } else if (isAdvanced) {
              setEducationState("STATE_B_SPECIALIZATION");
              setSpecializationTrack("Advanced Software Architecture");
            } else {
              setEducationState("STATE_A_CORE");
            }

            // Pre-select top 4 validated projects from student profile
            if (user.validatedProjects && user.validatedProjects.length > 0) {
              const defaultSelected = user.validatedProjects.slice(0, 4).map((p: any) => ({
                name: p.name,
                slug: p.slug,
                date: p.date || "2024",
                is42Project: true,
              }));
              setSelectedProjects(defaultSelected);
            }

            setCurrentStep("SETUP");

            // Clean up URL query parameters without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setAuthError("Failed to retrieve your 42 Intra profile. Please sign in again or use Quick Start.");
          }
        })
        .catch((err) => {
          console.error("Session fetch error:", err);
          setAuthError("Network error while connecting to 42 session service.");
        })
        .finally(() => {
          setAuthLoading(false);
        });
    }
  }, [setCurrentStep, setEducationState, setSelectedProjects, setSpecializationTrack, setStudentProfile]);

  // Prevent SSR hydration mismatch
  if (!hasHydrated) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-black text-sm animate-pulse">
            42
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading 42Beirut-Recruit...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top-Level Interactive Breadcrumbs across all steps */}
      <BreadcrumbStepper />

      {/* Draft Recovery Notification Banner */}
      {showRecoveryBanner && (
        <div className="bg-gradient-to-r from-cyan-950/90 via-slate-900 to-slate-900 border-b border-cyan-500/40 px-4 py-2.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-cyan-200 shadow-lg shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Restored saved CV progress for <strong>{cvData.contact.fullName || studentProfile?.displayname || "42 Student"}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowRecoveryBanner(false)}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
            >
              Continue Editing
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => {
                resetToDefaults();
                setShowRecoveryBanner(false);
              }}
              className="text-slate-400 hover:text-red-400 cursor-pointer transition"
            >
              Reset to 42 Intra Defaults
            </button>
            <button
              type="button"
              onClick={() => setShowRecoveryBanner(false)}
              className="text-slate-500 hover:text-white font-bold ml-2 text-sm cursor-pointer"
              title="Dismiss banner"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* OAuth Error Notification Banner */}
      {authError && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 px-4 py-2.5 text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>42 Intra Authentication: {authError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAuthError(null)}
            className="text-red-400 hover:text-white font-bold ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Loading Screen during OAuth profile sync */}
      {authLoading ? (
        <div className="flex-1 min-h-[80vh] flex flex-col items-center justify-center p-8 text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Loader2 className="w-8 h-8 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Syncing Your 42 Beirut Profile...</h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Retrieving your validated Common Core projects, calculating your cursus level, and preparing your tailored Dr. Wissam questionnaire.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {currentStep === "LOGIN" && <Step1Login />}
          {currentStep === "SETUP" && <Step2ProjectSetup />}
          {currentStep === "QUESTIONNAIRE" && <Step3Questionnaire />}
          {currentStep === "EDITOR" && <Step4SplitEditor />}
        </div>
      )}
    </main>
  );
}
