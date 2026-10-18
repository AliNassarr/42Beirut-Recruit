"use client";

import React from "react";
import { useCVStore } from "@/lib/store/cv-store";
import { MOCK_42_STUDENT } from "@/lib/intra/mock-data";
import {
  ShieldCheck,
  Sparkles,
  Terminal,
  Code2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Layers,
} from "lucide-react";

export function Step1Login() {
  const { setCurrentStep, setStudentProfile } = useCVStore();

  const handleDevLogin = () => {
    setStudentProfile(MOCK_42_STUDENT);
    setCurrentStep("SETUP");
  };

  const handleLiveOAuth = () => {
    window.location.href = "/api/auth/42/login";
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left Column: Platform Intent, Value Proposition, Action Triggers */}
        <div className="lg:col-span-6 flex flex-col items-start text-left">
          {/* Micro-badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 border border-brand-teal/30 text-brand-teal text-xs font-mono font-bold tracking-wider mb-5 uppercase shadow-sm">
            <Terminal className="w-3.5 h-3.5 text-brand-teal" />
            <span>42 BEIRUT CAREER PLATFORM</span>
          </div>

          {/* Value Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.18] mb-4">
            Turn Your 42 Projects Into a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal via-cyan-300 to-sky-400">
              Job-Ready Engineering CV
            </span>
          </h1>

          {/* Qualification Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8 max-w-xl">
            The official ATS resume engine engineered specifically for 42 students. Strictly
            adheres to CEO Dr. Wissam Sammouri&apos;s executive format—zero robotic buzzwords,
            grounded engineering verbs, and guaranteed single-page vertical line budgeting.
          </p>

          {/* Action Triggers */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3.5 mb-8">
            {/* Quick Start Dev Profile */}
            <button
              onClick={handleDevLogin}
              className="py-3.5 px-6 bg-brand-teal hover:brightness-110 text-brand-dark font-extrabold rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-lg shadow-brand-teal/20 cursor-pointer text-sm"
            >
              <Terminal className="w-4 h-4 text-brand-dark" />
              <span>Quick Start with 42 Cadet Profile</span>
              <ArrowRight className="w-4 h-4 text-brand-dark" />
            </button>

            {/* Live Intra OAuth Button */}
            <button
              onClick={handleLiveOAuth}
              className="py-3.5 px-5 bg-brand-card hover:bg-slate-800 text-slate-200 font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 border border-brand-border text-sm cursor-pointer hover:border-slate-700"
            >
              <span>42 Intra OAuth</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Technical Parity Anchors */}
          <div className="w-full pt-6 border-t border-brand-border/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-teal shrink-0" />
              <span>Strict 1-Page Calibrated</span>
            </div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-teal shrink-0" />
              <span>Direct 42 Intra Marks</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-teal shrink-0" />
              <span>Anti-Slop Action Verbs</span>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic Tilted A4 Resume Preview with Overlapping Floating Badges */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end relative">
          <div className="relative w-full max-w-md group">
            {/* Ambient Backlight Glow */}
            <div className="absolute -inset-1 bg-gradient-to-tr from-brand-teal/20 via-brand-teal/10 to-indigo-500/20 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition duration-700" />

            {/* Floating Badge Top-Left */}
            <div className="absolute -top-4 -left-3 sm:-left-5 z-20 bg-brand-card/95 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>[✓ 100% 1-Page Height Fit (965px / 1027px)]</span>
            </div>

            {/* Floating Badge Bottom-Right */}
            <div className="absolute -bottom-4 -right-3 sm:-right-5 z-20 bg-brand-card/95 border border-brand-teal/60 text-cyan-200 text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in duration-300">
              <Sparkles className="w-3.5 h-3.5 text-brand-teal shrink-0" />
              <span>[Dr. Wissam Rule: 0 Work Exp Reallocated to Selected Projects]</span>
            </div>

            {/* Realistic Tilted A4 Preview Card */}
            <div className="relative bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-7 text-[10px] leading-snug font-sans border border-slate-200 select-none overflow-hidden transform rotate-1 sm:rotate-2 group-hover:rotate-0 transition-transform duration-500">
              {/* Watermark / subtle layout grid */}
              <div className="border-b-2 border-slate-900 pb-2 mb-3">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-950 font-sans">
                  Mohammad Hamdan
                </h2>
                <div className="text-[11px] text-cyan-700 font-semibold mb-1">
                  42 Student – Level 9.42
                </div>
                <div className="text-[9px] text-slate-600 font-medium">
                  Beirut, Lebanon &bull; +961 70 123 456 &bull; name@student.42beirut.com &bull; linkedin.com/in/mhamdan &bull; github.com/mhamdan
                </div>
              </div>

              {/* Education Section */}
              <div className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5 flex justify-between">
                  <span>Education</span>
                  <span className="text-[9px] font-normal text-slate-500">2024 – Present</span>
                </div>
                <div className="flex justify-between items-baseline font-semibold text-[10px] text-slate-900">
                  <span>42 Beirut</span>
                  <span className="text-[9px] text-slate-600 font-normal">Beirut, Lebanon</span>
                </div>
                <div className="text-[9px] text-slate-700 italic">
                  Software Engineering Common Core (Cadet) &bull; Level 9.42
                </div>
              </div>

              {/* Selected Projects Section */}
              <div className="mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                  Selected Projects
                </div>

                {/* Project 1 */}
                <div className="mb-2">
                  <div className="flex justify-between items-baseline text-[9.5px]">
                    <span className="font-bold text-slate-900">
                      Webserv <span className="font-normal text-slate-600">| C++, HTTP/1.1, Sockets, epoll</span>
                    </span>
                    <span className="text-[8.5px] text-slate-500">2024</span>
                  </div>
                  <ul className="list-disc list-outside pl-3.5 space-y-0.5 text-[8.5px] text-slate-700 leading-normal">
                    <li>
                      Engineered an RFC-compliant HTTP/1.1 web server in C++ supporting GET, POST, and DELETE methods with non-blocking I/O multiplexing.
                    </li>
                    <li>
                      Built dynamic CGI execution for dynamic scripts via fork/execve pipes and chunked file transfer handling.
                    </li>
                  </ul>
                </div>

                {/* Project 2 */}
                <div className="mb-2">
                  <div className="flex justify-between items-baseline text-[9.5px]">
                    <span className="font-bold text-slate-900">
                      Minishell <span className="font-normal text-slate-600">| C, POSIX, Unix Architecture, Signals</span>
                    </span>
                    <span className="text-[8.5px] text-slate-500">2024</span>
                  </div>
                  <ul className="list-disc list-outside pl-3.5 space-y-0.5 text-[8.5px] text-slate-700 leading-normal">
                    <li>
                      Architected a POSIX Unix command interpreter in C handling tokenization, AST parsing, pipes, and signal dispatching.
                    </li>
                  </ul>
                </div>

                {/* Project 3 */}
                <div>
                  <div className="flex justify-between items-baseline text-[9.5px]">
                    <span className="font-bold text-slate-900">
                      Inception <span className="font-normal text-slate-600">| Docker, NGINX, TLSv1.3, MariaDB</span>
                    </span>
                    <span className="text-[8.5px] text-slate-500">2024</span>
                  </div>
                  <ul className="list-disc list-outside pl-3.5 space-y-0.5 text-[8.5px] text-slate-700 leading-normal">
                    <li>
                      Orchestrated multi-container microservices using Alpine Dockerfiles, volume persistence, and TLS reverse proxying.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Technical Skills Section */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-0.5 mb-1.5">
                  Technical Skills
                </div>
                <div className="text-[8.5px] text-slate-700 space-y-0.5 leading-tight">
                  <p>
                    <strong className="text-slate-900 font-semibold">Languages:</strong> C, C++98, C++11, TypeScript, Python, SQL, Bash
                  </p>
                  <p>
                    <strong className="text-slate-900 font-semibold">Developer Tools:</strong> Git, Docker, Make, GDB, Valgrind, Postman, Linux
                  </p>
                  <p>
                    <strong className="text-slate-900 font-semibold">Technologies:</strong> Network Sockets, HTTP/1.1, WebSockets, Next.js, PostgreSQL
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
