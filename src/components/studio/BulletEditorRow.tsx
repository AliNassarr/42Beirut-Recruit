"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Sparkles,
  ChevronDown,
  Trash2,
  RotateCcw,
  Scissors,
  Target,
  AlertCircle,
  Check,
} from "lucide-react";
import { getProjectKnowledge } from "@/lib/knowledge-base";

// Strong engineering verbs for rotating bullet points
export const STRONG_VERBS = [
  "Engineered",
  "Architected",
  "Implemented",
  "Automated",
  "Refactored",
  "Configured",
  "Structured",
  "Containerized",
  "Optimized",
  "Streamlined",
  "Validated",
  "Developed",
  "Built",
  "Programmed",
  "Benchmarked",
  "Designed",
];

// Forbidden personal pronouns in ATS resumes
const PRONOUNS_REGEX = /\b(I|me|my|mine|myself|we|us|our|ours|ourselves)\b/gi;

// Known buzzwords that diminish CV quality
const BUZZWORDS_REGEX = /\b(synergized?|guru|ninja|rockstar|hardworking|go-getter|team player|detail-oriented|passionate)\b/gi;

// Number/Metric detection regex
const METRIC_REGEX = /\b(\d+(?:[\.,]\d+)?(?:\%|x|ms|s|kb|mb|gb|k)?)\b/i;

// Peer metric library for 42 projects
const PEER_METRICS_BY_SLUG: Record<string, string[]> = {
  minishell: [
    "handling 120+ POSIX command permutations with 0 memory leaks via Valgrind",
    "reducing AST parse latency to under 3ms across complex pipelines",
    "passing 100% of peer test suites across redirection and signal handling edge cases",
  ],
  webserv: [
    "benchmarked at 15,000 req/sec via k6 without non-blocking socket starvation",
    "reducing peak memory consumption to under 12MB during concurrent client loads",
    "achieving 100% HTTP/1.1 RFC compliance across GET, POST, and chunked transfer tests",
  ],
  ft_transcendence: [
    "delivering real-time Pong multiplayer with sub-25ms WebSocket latency",
    "handling concurrent JWT authentications across 5 microservice containers",
    "passing automated CI/CD end-to-end test suite with 94% code coverage",
  ],
  inception: [
    "orchestrating 4 Docker services with deterministic restart policies and isolated networks",
    "reducing container cold boot time to under 4.2 seconds via Alpine Linux images",
  ],
  cub3d: [
    "maintaining stable 60 FPS raycasting rendering at 1080p using DDA algorithm in C",
    "optimizing texture mapping routines to achieve zero dropped frames during collision events",
  ],
  push_swap: [
    "sorting 500 random integers in fewer than 4,800 operations using optimized chunking",
    "achieving full 125/100 Intra validation marks in the top 5% speed percentile",
  ],
  philosophers: [
    "preventing deadlock and starvation across 200 concurrent threads with sub-millisecond mutex locking",
    "logging state transitions with microsecond timestamp precision using gettimeofday",
  ],
  default: [
    "benchmarked across 100+ peer evaluation test suites with 0 Valgrind memory leaks",
    "optimizing C runtime execution by 30% through algorithmic refactoring",
    "handling 50+ concurrent test scenarios with deterministic state validation",
  ],
};

export interface BulletEditorRowProps {
  bullet: string;
  index: number;
  contextSlug?: string;
  contextRole?: string;
  onChange: (newVal: string) => void;
  onDelete: () => void;
}

export function BulletEditorRow({
  bullet,
  index,
  contextSlug,
  contextRole,
  onChange,
  onDelete,
}: BulletEditorRowProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMetricsBanner, setShowMetricsBanner] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Syntax highlighting analysis
  const analysis = useMemo(() => {
    const text = bullet.trim();
    if (!text) {
      return {
        hasVerb: false,
        firstWord: "",
        hasPronouns: false,
        hasBuzzwords: false,
        hasMetrics: false,
        missingMetric: true,
      };
    }

    const words = text.split(/\s+/);
    const rawFirstWord = words[0]?.replace(/[^a-zA-Z]/g, "") || "";
    const hasVerb = STRONG_VERBS.some(
      (v) => v.toLowerCase() === rawFirstWord.toLowerCase()
    );

    const hasPronouns = PRONOUNS_REGEX.test(text);
    PRONOUNS_REGEX.lastIndex = 0;

    const hasBuzzwords = BUZZWORDS_REGEX.test(text);
    BUZZWORDS_REGEX.lastIndex = 0;

    const hasMetrics = METRIC_REGEX.test(text);

    return {
      hasVerb,
      firstWord: rawFirstWord,
      hasPronouns,
      hasBuzzwords,
      hasMetrics,
      missingMetric: !hasMetrics,
    };
  }, [bullet]);

  // Rotate Opening Verb
  const handleRotateVerb = () => {
    const words = bullet.trim().split(" ");
    if (words.length === 0 || !words[0]) return;
    const firstWord = words[0].replace(/[^a-zA-Z]/g, "");

    const currIndex = STRONG_VERBS.findIndex(
      (v) => v.toLowerCase() === firstWord.toLowerCase()
    );

    const nextVerb =
      currIndex >= 0
        ? STRONG_VERBS[(currIndex + 1) % STRONG_VERBS.length]
        : STRONG_VERBS[0];

    words[0] = nextVerb;
    onChange(words.join(" "));
  };

  // Trim Bullet (Dr. Wissam single-line budget tightening)
  const handleTrimBullet = () => {
    let cleaned = bullet
      .replace(/[—–]/g, ",")
      .replace(/\bin order to\b/gi, "to")
      .replace(/\bresponsible for implementing\b/gi, "implemented")
      .replace(/\bresponsible for building\b/gi, "built")
      .replace(/\bresponsible for developing\b/gi, "developed")
      .replace(/\bresponsible for designing\b/gi, "designed")
      .replace(/\bresponsible for\b/gi, "")
      .replace(/\bsuccessfully\s+/gi, "")
      .replace(/\bwhich allowed the team to\b/gi, "enabling the team to")
      .replace(/\bwhich allowed for\b/gi, "enabling")
      .replace(/\bwhich resulted in\b/gi, "resulting in")
      .replace(/\bfor the purpose of\b/gi, "to")
      .replace(/\bwith the aim of\b/gi, "to")
      .replace(/\bdue to the fact that\b/gi, "because")
      .replace(/\bas well as\b/gi, "and")
      .replace(/\butilizing\b/gi, "using")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (cleaned.length > 155 && cleaned.includes(";")) {
      cleaned = cleaned.split(";")[0].trim() + ".";
    } else if (cleaned.length > 165 && cleaned.includes(", and ")) {
      cleaned = cleaned.split(", and ")[0].trim() + ".";
    }

    if (!cleaned.endsWith(".")) {
      cleaned += ".";
    }
    onChange(cleaned);
  };

  // Inject Peer Metric
  const handleInjectPeerMetric = () => {
    setIsOptionsOpen(false);
    const slug = contextSlug?.toLowerCase() || "default";
    const availableMetrics =
      PEER_METRICS_BY_SLUG[slug] || PEER_METRICS_BY_SLUG["default"];
    const metric =
      availableMetrics[Math.floor(Math.random() * availableMetrics.length)];

    let current = bullet.trim();
    if (current.endsWith(".")) {
      current = current.slice(0, -1);
    }

    const updated = `${current}, ${metric}.`;
    onChange(updated);
  };

  // Suggest / Synthesize Bullet
  const handleSuggestBullet = async () => {
    setIsGenerating(true);
    setIsOptionsOpen(false);

    try {
      // Query local knowledge base first for instant high-quality synthesis
      const kb = contextSlug ? getProjectKnowledge(contextSlug) : null;
      let generatedBullet = "";

      if (kb && kb.defaultBullets && kb.defaultBullets.length > 0) {
        // Pick bullet that differs from current text
        const candidate = kb.defaultBullets[index % kb.defaultBullets.length];
        generatedBullet = candidate;
      } else {
        const fallbackVerb =
          STRONG_VERBS[Math.floor(Math.random() * STRONG_VERBS.length)];
        const slugLabel = contextSlug || contextRole || "software module";
        generatedBullet = `${fallbackVerb} scalable ${slugLabel} in C/C++, achieving 0 memory leaks and passing 100% of peer evaluation suites.`;
      }

      onChange(generatedBullet);
    } catch (e) {
      console.error("Failed to suggest bullet:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render highlighted underlay HTML
  const renderUnderlay = () => {
    if (!bullet) {
      return (
        <span className="text-slate-600 italic">
          Start typing bullet point (e.g., &quot;Engineered POSIX shell in C...&quot;)
        </span>
      );
    }

    const tokens = bullet.split(/(\s+)/);
    let isFirstWord = true;

    return tokens.map((token, i) => {
      if (/^\s+$/.test(token)) {
        return <span key={i}>{token}</span>;
      }

      const cleanWord = token.replace(/[^a-zA-Z0-9]/g, "");

      // 1. Prohibited Personal Pronoun
      if (PRONOUNS_REGEX.test(cleanWord)) {
        PRONOUNS_REGEX.lastIndex = 0;
        return (
          <span
            key={i}
            className="text-red-400 bg-red-500/20 underline decoration-wavy decoration-red-500 rounded px-0.5"
            title="ATS Violation: Personal pronouns forbidden in engineering CVs"
          >
            {token}
          </span>
        );
      }

      // 2. Prohibited Buzzword
      if (BUZZWORDS_REGEX.test(cleanWord)) {
        BUZZWORDS_REGEX.lastIndex = 0;
        return (
          <span
            key={i}
            className="text-amber-400 bg-amber-500/20 underline decoration-dashed decoration-amber-400 rounded px-0.5"
            title="Weak Buzzword: Replace with concrete technical action"
          >
            {token}
          </span>
        );
      }

      // 3. Opening Action Verb
      if (isFirstWord) {
        isFirstWord = false;
        const isStrong = STRONG_VERBS.some(
          (v) => v.toLowerCase() === cleanWord.toLowerCase()
        );
        if (isStrong) {
          return (
            <span
              key={i}
              className="text-purple-300 font-bold bg-purple-500/10 px-1 rounded"
              title="Strong Action Verb"
            >
              {token}
            </span>
          );
        } else {
          return (
            <span
              key={i}
              className="text-amber-300 border-b border-dashed border-amber-400 font-medium"
              title="Tip: Open with a strong past-tense engineering verb"
            >
              {token}
            </span>
          );
        }
      }

      // 4. Metrics & Numbers
      if (METRIC_REGEX.test(cleanWord)) {
        return (
          <span
            key={i}
            className="text-cyan-300 font-semibold bg-cyan-500/10 px-0.5 rounded"
            title="Quantified Technical Metric"
          >
            {token}
          </span>
        );
      }

      return <span key={i}>{token}</span>;
    });
  };

  return (
    <div className="group relative flex flex-col gap-2 p-3 bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl transition duration-150">
      {/* Top Bar / Badges */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">#{index + 1}</span>
          {analysis.hasVerb && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              <Check className="w-3 h-3" /> Verb: {analysis.firstWord}
            </span>
          )}
          {analysis.hasMetrics ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              <Target className="w-3 h-3" /> Metric quantified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <AlertCircle className="w-3 h-3" /> Needs metric
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
          <button
            type="button"
            onClick={handleRotateVerb}
            className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
            title="Rotate Opening Action Verb"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleTrimBullet}
            className="p-1 hover:text-cyan-400 hover:bg-slate-800 rounded transition"
            title="Trim Bullet Line Budget"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 hover:text-red-400 hover:bg-slate-800 rounded transition"
            title="Delete bullet point"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dual-Layer Text Input System */}
      <div className="relative min-h-[72px] w-full rounded-lg bg-slate-950 border border-slate-800 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30 transition">
        {/* Layer 1: Underlay Syntax Badges (Behind) */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 p-3 text-sm font-sans leading-relaxed text-transparent whitespace-pre-wrap break-words overflow-hidden"
        >
          {renderUnderlay()}
        </div>

        {/* Layer 2: Interactive Foreground Textarea (Above) */}
        <textarea
          ref={textareaRef}
          value={bullet}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="e.g. Engineered asynchronous HTTP/1.1 server in C++ using epoll with 0 memory leaks..."
          className="relative z-10 w-full min-h-[72px] p-3 bg-transparent text-sm font-sans leading-relaxed text-slate-100 caret-cyan-400 placeholder:text-slate-600 focus:outline-none resize-y"
        />
      </div>

      {/* Bottom Bar: Animated AI Gradient Split-Button */}
      <div className="flex items-center justify-between pt-1">
        <div className="relative inline-flex items-center rounded-full shadow-sm">
          {/* Primary Split Button */}
          <button
            type="button"
            onClick={handleSuggestBullet}
            disabled={isGenerating}
            className="relative flex items-center justify-center font-bold uppercase text-xs px-3.5 py-1.5 rounded-l-full text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-50 cursor-pointer overflow-hidden shadow-sm"
            style={{
              backgroundImage:
                "linear-gradient(80deg, #00BABC 0%, #00BABC 20%, #6366F1 50%, #EC4899 80%, #00BABC 100%)",
              backgroundSize: "200% auto",
            }}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse text-cyan-200" />
            <span>{isGenerating ? "Synthesizing..." : "Suggest Bullet"}</span>
          </button>

          {/* Right Chevron Dropdown Split Button */}
          <button
            type="button"
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className="w-8 h-full py-1.5 rounded-r-2xl border-l border-white/20 bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center transition cursor-pointer"
            title="More generate options"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Mode Dropdown Popover */}
          {isOptionsOpen && (
            <div className="absolute left-0 bottom-full mb-2 z-50 w-64 bg-[#0B0F19] border border-slate-700 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={handleInjectPeerMetric}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-400 text-left transition cursor-pointer"
              >
                <Target className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold">Generate with Peer Metric</div>
                  <div className="text-[10px] text-slate-400">
                    Inject 42 test suite, memory or throughput benchmarks
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsOpen(false);
                  handleRotateVerb();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-left transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-semibold">Swap Action Verb</div>
                  <div className="text-[10px] text-slate-400">
                    Replace first word with strong engineering verb
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOptionsOpen(false);
                  handleTrimBullet();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 text-left transition cursor-pointer"
              >
                <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold">Trim Line Budget</div>
                  <div className="text-[10px] text-slate-400">
                    Eliminate fluff words to fit single-line constraint
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Character / Word telemetry */}
        <div className="text-[11px] text-slate-500 font-mono">
          {bullet.length} chars · {bullet.trim().split(/\s+/).filter(Boolean).length} words
        </div>
      </div>
    </div>
  );
}
