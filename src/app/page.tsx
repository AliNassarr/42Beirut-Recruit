"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [bridgeLoadingText, setBridgeLoadingText] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const [hasCheckedDraft, setHasCheckedDraft] = useState(false);
  const bridgeAttemptedRef = useRef(false);

  // Helper to hydrate Zustand state and advance to Step 2
  const hydrateWithIntraUser = useCallback(
    (user: any) => {
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
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    },
    [setCurrentStep, setEducationState, setSelectedProjects, setSpecializationTrack, setStudentProfile]
  );

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
    // Check URL parameters for OAuth status, session ID, errors, or OAuth bridge
    let authStatus: string | null = null;
    let errorParam: string | null = null;
    let sidParam: string | null = null;
    let bridgeParam: string | null = null;
    let codeParam: string | null = null;
    let tsParam: string | null = null;
    let sigParam: string | null = null;

    try {
      const search = typeof window !== "undefined" ? window.location.search : "";
      if (search) {
        const params = new URLSearchParams(search);
        authStatus = params.get("auth");
        errorParam = params.get("error");
        sidParam = params.get("sid");
        bridgeParam = params.get("oauth_bridge");
        codeParam = params.get("code");
        tsParam = params.get("ts");
        sigParam = params.get("sig");
      }
    } catch (e) {
      console.warn("Failed to parse URL search parameters:", e);
    }

    if (errorParam) {
      let safeError = errorParam;
      try {
        safeError = decodeURIComponent(errorParam);
      } catch {
        safeError = errorParam;
      }
      setAuthError(safeError);
    }

    // Tier 2: Self-Healing Residential Browser Bridge (Zero-Preflight CORS Requests)
    if (bridgeParam === "1" && codeParam) {
      if (bridgeAttemptedRef.current) {
        return;
      }
      bridgeAttemptedRef.current = true;

      setAuthLoading(true);
      let currentStepName = "bridge-init";
      setBridgeLoadingText("Validating bridge handshake ticket...");

      async function executeResidentialBridge() {
        try {
          // 1. Fetch OAuth parameters validated by backend stateless HMAC ticket
          currentStepName = "bridge-init";
          const initRes = await fetch("/api/auth/42/bridge-init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: codeParam,
              ts: tsParam,
              sig: sigParam,
            }),
          });

          if (!initRes.ok) {
            const errJson = await initRes.json().catch(() => ({}));
            throw new Error(errJson.error || `Bridge ticket verification failed (HTTP ${initRes.status})`);
          }

          const bridgeData = await initRes.json();
          let accessToken: string | null = null;
          let profilePayload: any = null;

          // 2. Obtain token and profile using residential relays
          currentStepName = "browser-token-exchange";
          setBridgeLoadingText("Exchanging credentials via residential relay...");

          // Stage 1: Try Local Residential Relay (http://localhost:3000/api/auth/42/local-relay)
          try {
            const localRelayRes = await fetch("http://localhost:3000/api/auth/42/local-relay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bridgeData),
            });

            if (localRelayRes.ok) {
              const localData = await localRelayRes.json();
              if (localData.accessToken && localData.profile) {
                accessToken = localData.accessToken;
                profilePayload = localData.profile;
              }
            }
          } catch (localErr) {
            console.warn("Local residential relay unavailable, attempting next stage:", localErr);
          }

          // Stage 2: If local relay wasn't available, try CORS-enabled proxy and direct browser fetch
          if (!accessToken || !profilePayload) {
            const tokenBody = new URLSearchParams({
              grant_type: "authorization_code",
              client_id: bridgeData.clientId,
              client_secret: bridgeData.clientSecret,
              code: bridgeData.code,
              redirect_uri: bridgeData.redirectUri,
            });

            // Try corsproxy.io first
            try {
              const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent("https://api.intra.42.fr/oauth/token");
              const proxyRes = await fetch(proxyUrl, {
                method: "POST",
                body: tokenBody,
              });

              if (proxyRes.ok) {
                const proxyJson = await proxyRes.json();
                accessToken = proxyJson.access_token;
              }
            } catch (proxyErr) {
              console.warn("Proxy relay exchange failed:", proxyErr);
            }

            // Direct browser fetch attempt
            if (!accessToken) {
              try {
                const directTokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
                  method: "POST",
                  body: tokenBody,
                });

                if (directTokenRes.ok) {
                  const tokenJson = await directTokenRes.json();
                  accessToken = tokenJson.access_token;
                }
              } catch (directErr) {
                console.warn("Direct fetch hit CORS:", directErr);
              }
            }

            if (!accessToken) {
              throw new Error("Unable to retrieve OAuth token via any residential or proxy relay");
            }

            // Fetch profile
            currentStepName = "browser-profile-fetch";
            setBridgeLoadingText("Retrieving 42 student profile...");

            // Try simple GET with access_token param
            try {
              const meUrl = `https://api.intra.42.fr/v2/me?access_token=${encodeURIComponent(accessToken)}`;
              const meRes = await fetch(meUrl);
              if (meRes.ok) {
                profilePayload = await meRes.json();
              }
            } catch {
              // fallback to proxy for profile
              try {
                const proxyMeUrl =
                  "https://corsproxy.io/?" +
                  encodeURIComponent(`https://api.intra.42.fr/v2/me?access_token=${encodeURIComponent(accessToken)}`);
                const proxyMeRes = await fetch(proxyMeUrl);
                if (proxyMeRes.ok) {
                  profilePayload = await proxyMeRes.json();
                }
              } catch (proxyMeErr) {
                console.warn("Proxy profile fetch failed:", proxyMeErr);
              }
            }
          }

          if (!profilePayload || !profilePayload.login) {
            throw new Error("Failed to retrieve 42 profile directly from browser or relay");
          }

          // 4. Finalize session on server with zero server-to-Intra calls
          currentStepName = "bridge-complete";
          setBridgeLoadingText("Finalizing profile sync & secure session...");

          const completeRes = await fetch("/api/auth/42/bridge-complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile: profilePayload,
              accessToken,
              code: codeParam,
              ts: tsParam,
              sig: sigParam,
            }),
          });

          if (!completeRes.ok) {
            const completeErr = await completeRes.json().catch(() => ({}));
            throw new Error(completeErr.error || `Failed to finalize session (HTTP ${completeRes.status})`);
          }

          const completeData = await completeRes.json();
          if (completeData.success && completeData.user) {
            hydrateWithIntraUser(completeData.user);
          } else {
            throw new Error("Bridge completed but returned no profile");
          }
        } catch (err: any) {
          console.error(`Residential bridge failed at step [${currentStepName}]:`, err);
          setAuthError(`[${currentStepName}] ${err?.message || "Residential bridge handshake failed."}`);
          if (typeof window !== "undefined") {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } finally {
          setAuthLoading(false);
          setBridgeLoadingText("");
        }
      }

      executeResidentialBridge();
      return;
    }

    // Normal OAuth callback flow with existing session ID
    if (authStatus === "success" || sidParam) {
      setAuthLoading(true);
      const sessionUrl = sidParam
        ? `/api/auth/session?sid=${encodeURIComponent(sidParam)}`
        : "/api/auth/session";

      fetch(sessionUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            hydrateWithIntraUser(data.user);
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
  }, [hydrateWithIntraUser]);

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
          <h2 className="text-2xl font-bold text-white mb-2">
            {bridgeLoadingText || "Syncing Your 42 Beirut Profile..."}
          </h2>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            {bridgeLoadingText
              ? "Bypassing cloud firewall via residential handshake bridge. This ensures zero data loss and direct Intra authentication."
              : "Retrieving your validated Common Core projects, calculating your cursus level, and preparing your tailored Dr. Wissam questionnaire."}
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
