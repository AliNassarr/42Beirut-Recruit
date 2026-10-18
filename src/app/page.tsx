"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useCVStore, useHasHydrated } from "@/lib/store/cv-store";
import { ReziStudioLayout } from "@/components/studio/ReziStudioLayout";
import { MOCK_42_STUDENT, createInitialCVFromIntra } from "@/lib/intra/mock-data";
import { Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const hasHydrated = useHasHydrated();

  const {
    cvData,
    setCVData,
    studentProfile,
    setStudentProfile,
    setEducationState,
    setSelectedProjects,
    setSpecializationTrack,
  } = useCVStore();

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bridgeLoadingText, setBridgeLoadingText] = useState("");
  const bridgeAttemptedRef = useRef(false);

  // Helper to hydrate Zustand state with Intra user
  const hydrateWithIntraUser = useCallback(
    (user: any) => {
      setStudentProfile(user);

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

      if (user.validatedProjects && user.validatedProjects.length > 0) {
        const defaultSelected = user.validatedProjects.slice(0, 4).map((p: any) => ({
          name: p.name,
          slug: p.slug,
          date: p.date || "2024",
          is42Project: true,
        }));
        setSelectedProjects(defaultSelected);
      }

      const initialCV = createInitialCVFromIntra(user);
      setCVData(initialCV);

      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    },
    [setCVData, setEducationState, setSelectedProjects, setSpecializationTrack, setStudentProfile]
  );

  // 1. Initial Load Hydration: Ensure MOCK_42_STUDENT is populated if no saved draft exists
  useEffect(() => {
    if (hasHydrated) {
      if (!cvData?.contact?.fullName || cvData.projects.length === 0) {
        setStudentProfile(MOCK_42_STUDENT);
        const baseline = createInitialCVFromIntra(MOCK_42_STUDENT);
        setCVData(baseline);
      }
    }
  }, [hasHydrated, cvData, setCVData, setStudentProfile]);

  // 2. OAuth Authentication Handlers (Preserved from backend)
  useEffect(() => {
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
      setAuthError(decodeURIComponent(errorParam));
    }

    // Residential Bridge Handshake
    if (bridgeParam === "1" && codeParam) {
      if (bridgeAttemptedRef.current) return;
      bridgeAttemptedRef.current = true;

      setAuthLoading(true);
      setBridgeLoadingText("Validating 42 Intra handshake ticket...");

      async function executeResidentialBridge() {
        try {
          const initRes = await fetch("/api/auth/42/bridge-init", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: codeParam, ts: tsParam, sig: sigParam }),
          });

          if (!initRes.ok) throw new Error("Bridge ticket verification failed");
          const bridgeData = await initRes.json();

          const FORTY_TWO_API_BASE = (
            process.env.NEXT_PUBLIC_FORTY_TWO_API_BASE || "https://42beirut-worker.pages.dev"
          ).replace(/\/+$/, "");

          setBridgeLoadingText("Exchanging credentials via proxy...");

          const tokenBody = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: bridgeData.clientId,
            client_secret: bridgeData.clientSecret,
            code: bridgeData.code,
            redirect_uri: bridgeData.redirectUri,
          });

          const proxyRes = await fetch(`${FORTY_TWO_API_BASE}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenBody,
          });

          if (!proxyRes.ok) throw new Error("OAuth token exchange failed");
          const proxyJson = await proxyRes.json();
          const accessToken = proxyJson.access_token;

          setBridgeLoadingText("Retrieving 42 student profile...");
          const meRes = await fetch(`${FORTY_TWO_API_BASE}/v2/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          });

          if (!meRes.ok) throw new Error("Failed to retrieve profile");
          const profilePayload = await meRes.json();

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

          if (!completeRes.ok) throw new Error("Failed to finalize session");
          const completeData = await completeRes.json();

          if (completeData.success && completeData.user) {
            hydrateWithIntraUser(completeData.user);
          }
        } catch (err: any) {
          console.error("Bridge failed:", err);
          setAuthError(err?.message || "42 Intra sync failed.");
        } finally {
          setAuthLoading(false);
          setBridgeLoadingText("");
        }
      }

      executeResidentialBridge();
      return;
    }

    // Normal callback with session ID
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
          }
        })
        .catch(console.error)
        .finally(() => setAuthLoading(false));
    }
  }, [hydrateWithIntraUser]);

  // Loading indicator prior to hydration
  if (!hasHydrated) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white text-black font-mono font-black text-sm flex items-center justify-center shadow-sm">
            42
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Loading Rezi Studio...</span>
          </div>
        </div>
      </main>
    );
  }

  // OAuth Loading Screen
  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#09090B] text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-white animate-spin" />
          <Loader2 className="w-8 h-8 text-white absolute inset-0 m-auto animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {bridgeLoadingText || "Syncing 42 Beirut Intra Profile..."}
        </h2>
        <p className="text-sm text-zinc-400 max-w-md">
          Retrieving your validated cursus marks, calculating line budgets, and configuring your studio workspace.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090B] text-white flex flex-col">
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

      {/* Rezi Studio Workspace */}
      <ReziStudioLayout />
    </main>
  );
}
