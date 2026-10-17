"use client";

import React from "react";
import { useCVStore } from "@/lib/store/cv-store";
import { MOCK_42_STUDENT } from "@/lib/intra/mock-data";
import { ShieldCheck, Sparkles, Terminal, Code2 } from "lucide-react";

export function Step1Login() {
  const { setCurrentStep, setStudentProfile, setCVData } = useCVStore();

  const handleDevLogin = () => {
    setStudentProfile(MOCK_42_STUDENT);
    setCurrentStep("SETUP");
  };

  const handleLiveOAuth = () => {
    window.location.href = "/api/auth/42/login";
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm text-center">
        {/* 42 Logo Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-6 shadow-inner">
          <Terminal className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          42Beirut<span className="text-cyan-400">-Recruit</span>
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          The official 42 Beirut ATS Resume Engine strictly adhering to Dr. Wissam Sammouri&apos;s reference template.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-3 mb-8 text-left text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Strict Dr. Wissam .docx parity with 1-page auto-fit</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Automatic 42 project ingestion (minishell, cub3d, webserv...)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Zero robotic fluff &bull; Grounded engineering tone</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Dev Mock 42 Login Button */}
          <button
            onClick={handleDevLogin}
            className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>Quick Start with 42 Beirut Cadet Profile</span>
          </button>

          {/* Live 42 Intra OAuth Button */}
          <button
            onClick={handleLiveOAuth}
            className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 border border-slate-700 text-sm cursor-pointer"
          >
            <span>Sign in with 42 Intra OAuth (api.intra.42.fr)</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          Exclusively designed for students and alumni of 42 Beirut &amp; 42 Network.
        </p>
      </div>
    </div>
  );
}
