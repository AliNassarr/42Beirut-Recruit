"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Printer,
  Download,
  Copy,
  Check,
  ArrowLeft,
  Building2,
  Briefcase,
  FileText,
  Sliders,
} from "lucide-react";
import { CVData } from "@/types/resume";

interface AICoverLetterStudioProps {
  cvData: CVData;
  onBackToCV?: () => void;
  targetJobDescription?: string;
  onJobDescriptionChange?: (jd: string) => void;
  initialJobDescription?: string;
}

export function AICoverLetterStudio({
  cvData,
  onBackToCV,
  targetJobDescription,
  onJobDescriptionChange,
  initialJobDescription = "",
}: AICoverLetterStudioProps) {
  const [company, setCompany] = useState("Target Engineering Co.");
  const [role, setRole] = useState(cvData.targetRole || "Software Engineer");
  const [internalJD, setInternalJD] = useState(initialJobDescription);
  const jobDescription = targetJobDescription !== undefined ? targetJobDescription : internalJD;
  const setJobDescription = (val: string) => {
    setInternalJD(val);
    onJobDescriptionChange?.(val);
  };
  const [focusArea, setFocusArea] = useState<"systems" | "architecture" | "fullstack">("systems");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Default synthesized cover letter paragraphs
  const [paragraphs, setParagraphs] = useState<string[]>([
    `I am writing to express my strong enthusiasm for the ${role} position at ${company}. Having completed rigorous systems programming projects at 42 Beirut—where software must adhere strictly to POSIX standards, zero memory leaks under Valgrind, and 100% peer-evaluated test suites—I am eager to contribute my low-level problem-solving and software design capabilities to your team.`,
    `Throughout my 42 cursus, I have engineered complex Unix infrastructure software from scratch in C and C++. In projects such as minishell and webserv, I implemented custom AST command interpreters, POSIX signal handling, and non-blocking I/O multiplexing with epoll. This hands-on experience taught me to optimize algorithmic time complexity, profile system resources, and write clean, maintainable code without relying on high-level runtime abstractions.`,
    `What particularly attracts me to ${company} is your commitment to high-performance, resilient engineering. My background in collaborative peer learning and autonomous debugging has prepared me to ramp up rapidly on your codebase, identify subtle concurrency bottlenecks, and deliver production-grade modules.`,
    `I welcome the opportunity to discuss how my systems programming foundation, 42 Beirut evaluation discipline, and passion for reliable software align with ${company}'s goals. Thank you for your time and consideration.`,
  ]);

  // AI Synthesis Trigger
  const handleSynthesize = () => {
    setIsSynthesizing(true);
    setTimeout(() => {
      const p1 = `I am writing to formally apply for the ${role || "Software Engineer"} position at ${company || "your organization"}. As a developer trained in the rigorous peer-to-peer curriculum at 42 Beirut, I have cultivated deep proficiency in low-level systems programming, deterministic memory safety, and resilient architecture.`;

      let p2 = "";
      if (focusArea === "systems") {
        p2 = `At 42 Beirut, software engineering is practiced under stringent Norminette constraints with zero standard library dependencies. I have architected asynchronous HTTP/1.1 servers using epoll, built POSIX-compliant command line shells with custom AST parsers, and benchmarked multi-threaded applications to ensure zero deadlock under high concurrent loads.`;
      } else if (focusArea === "architecture") {
        p2 = `My software engineering experience centers on scalable microservices and modular system design. In capstone projects like ft_transcendence and Inception, I orchestrated multi-container Docker environments, implemented sub-25ms real-time WebSocket communications, and automated CI/CD validation pipelines with comprehensive code coverage.`;
      } else {
        p2 = `Combining foundational C/C++ systems programming with modern full-stack engineering, I have delivered end-to-end applications utilizing TypeScript, React, and PostgreSQL. This dual expertise enables me to optimize frontend responsiveness while maintaining rigorous backend data integrity and low-latency network pipelines.`;
      }

      const p3 = `Having analyzed the requirements for ${role} at ${company}, I am confident that my technical discipline, autonomous debugging mindset, and track record of peer validation will enable me to make an immediate, impactful contribution to your engineering initiatives.`;

      const p4 = `Thank you for your consideration. I look forward to the possibility of discussing my technical qualifications and how I can help drive ${company}'s software missions forward.`;

      setParagraphs([p1, p2, p3, p4]);
      setIsSynthesizing(false);
    }, 800);
  };

  // Copy letter text to clipboard
  const handleCopy = () => {
    const fullText = [
      cvData.contact.fullName.toUpperCase(),
      `${cvData.contact.email} | ${cvData.contact.phoneNumber} | ${cvData.contact.location || "Beirut, Lebanon"}`,
      "",
      new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      "",
      `Hiring Team`,
      company,
      "",
      `Dear Hiring Manager,`,
      "",
      ...paragraphs,
      "",
      `Sincerely,`,
      cvData.contact.fullName,
    ].join("\n");

    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-8 pt-6 pb-12 flex flex-col gap-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <button
          type="button"
          onClick={onBackToCV}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to CV Studio</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:border-white text-zinc-200 hover:text-white rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? "Copied" : "Copy Text"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* 2-Column Cover Letter Workspace */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Generator Form (480px) */}
        <aside className="w-full lg:w-[460px] flex-none bg-[#141417] border border-zinc-800 rounded-xl p-6 flex flex-col gap-5 shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span>AI Cover Letter Generator</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Synthesizes an institutional 1-page engineering cover letter formatted to match your Dr. Wissam CV.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Company
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Murex, Anghami, Canonical"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1C1C21] border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Role / Title
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Software Engineer - C/C++ Systems"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1C1C21] border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Engineering Focus Track
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#1C1C21] p-1 rounded-lg border border-zinc-800 text-[11px] font-bold uppercase">
                <button
                  type="button"
                  onClick={() => setFocusArea("systems")}
                  className={`py-1.5 rounded transition ${
                    focusArea === "systems" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Systems (C)
                </button>
                <button
                  type="button"
                  onClick={() => setFocusArea("architecture")}
                  className={`py-1.5 rounded transition ${
                    focusArea === "architecture" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Distributed
                </button>
                <button
                  type="button"
                  onClick={() => setFocusArea("fullstack")}
                  className={`py-1.5 rounded transition ${
                    focusArea === "fullstack" ? "bg-white text-black font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Full Stack
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Job Description / Keywords (Optional)
              </label>
              <textarea
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste key responsibilities or tech stack to tailor the letter..."
                className="w-full p-3 bg-[#1C1C21] border border-zinc-800 rounded-md text-xs text-white focus:outline-none focus:border-white resize-none font-mono placeholder:text-zinc-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="w-full py-3 bg-white hover:bg-zinc-200 text-black font-bold uppercase tracking-wider text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSynthesizing ? "Synthesizing Letter..." : "Synthesize Engineering Letter"}</span>
            </button>
          </div>
        </aside>

        {/* Right Column: Interactive Paper Canvas Preview (A4 Letter) */}
        <main className="flex-1 w-full flex justify-center overflow-x-auto py-2">
          <div
            id="cover-letter-preview"
            className="w-[794px] min-h-[1123px] bg-white text-black p-12 sm:p-16 shadow-2xl rounded-sm flex flex-col font-sans select-text"
            style={{ fontFamily: "Calibri, Arial, sans-serif" }}
          >
            {/* Header: Dr. Wissam Clean Format */}
            <div className="text-center border-b border-black pb-4 mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-black mb-1">
                {cvData.contact.fullName.toUpperCase()}
              </h1>
              <div className="text-xs text-zinc-700 flex flex-wrap justify-center items-center gap-x-2 gap-y-0.5">
                {cvData.contact.location && <span>{cvData.contact.location}</span>}
                {cvData.contact.phoneNumber && (
                  <>
                    <span>•</span>
                    <span>{cvData.contact.phoneNumber}</span>
                  </>
                )}
                {cvData.contact.email && (
                  <>
                    <span>•</span>
                    <span>{cvData.contact.email}</span>
                  </>
                )}
                {cvData.contact.linkedinUrl && (
                  <>
                    <span>•</span>
                    <span>{cvData.contact.linkedinUrl.replace(/^https?:\/\//, "")}</span>
                  </>
                )}
                {cvData.contact.githubUrl && (
                  <>
                    <span>•</span>
                    <span>{cvData.contact.githubUrl.replace(/^https?:\/\//, "")}</span>
                  </>
                )}
              </div>
            </div>

            {/* Letter Date & Recipient */}
            <div className="text-xs text-zinc-800 mb-6 flex flex-col gap-1">
              <div>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
              <div className="font-bold mt-2">Hiring Team</div>
              <div>{company}</div>
            </div>

            {/* Salutation */}
            <div className="text-xs font-bold text-zinc-900 mb-4">
              Dear Hiring Manager,
            </div>

            {/* Paragraphs */}
            <div className="flex flex-col gap-4 text-xs leading-relaxed text-zinc-900 text-justify">
              {paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            {/* Sign-off */}
            <div className="mt-8 text-xs text-zinc-900 flex flex-col gap-1">
              <div>Sincerely,</div>
              <div className="font-bold text-sm mt-4">{cvData.contact.fullName}</div>
              <div className="text-[11px] text-zinc-600">42 Beirut Cadet • {role}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
