"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ChevronDown,
  Trash2,
  RotateCcw,
  Scissors,
  Target,
  ChevronUp,
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
const PRONOUNS_REGEX = /\b(I|me|my|mine|myself|we|us|our|ours|ourselves)\b/i;

// Number/Metric detection regex
const METRIC_REGEX = /\b(\d+(?:[\.,]\d+)?(?:\%|x|ms|s|kb|mb|gb|k)?)\b/i;

// Authentic 42 peer metrics library
const PEER_METRICS_BY_SLUG: Record<string, string[]> = {
  minishell: [
    "handling 120+ POSIX command permutations with 0 memory leaks via Valgrind",
    "reducing AST parse latency to under 3ms across complex pipeline operations",
    "passing 100% of peer test suites across redirection and signal handling edge cases",
  ],
  webserv: [
    "benchmarked at 15,000 req/sec via k6 without non-blocking socket starvation",
    "reducing peak memory footprint to under 12MB during concurrent client loads",
    "achieving 100% HTTP/1.1 RFC compliance across GET, POST, and chunked transfer tests",
  ],
  ft_transcendence: [
    "delivering real-time multiplayer with sub-25ms WebSocket latency",
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
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function BulletEditorRow({
  bullet,
  index,
  contextSlug,
  contextRole,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: BulletEditorRowProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Syntax and structure analysis
  const analysis = useMemo(() => {
    const text = bullet.trim();
    if (!text) {
      return {
        hasVerb: false,
        firstWord: "",
        hasPronouns: false,
        hasMetrics: false,
        wordCount: 0,
        charCount: 0,
      };
    }

    const words = text.split(/\s+/).filter(Boolean);
    const rawFirstWord = words[0]?.replace(/[^a-zA-Z]/g, "") || "";
    const hasVerb = STRONG_VERBS.some(
      (v) => v.toLowerCase() === rawFirstWord.toLowerCase()
    );

    const hasPronouns = PRONOUNS_REGEX.test(text);
    const hasMetrics = METRIC_REGEX.test(text);

    return {
      hasVerb,
      firstWord: rawFirstWord,
      hasPronouns,
      hasMetrics,
      wordCount: words.length,
      charCount: text.length,
    };
  }, [bullet]);

  // Rotate Opening Verb
  const handleRotateVerb = () => {
    setIsOptionsOpen(false);
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

  // Trim Bullet (Dr. Wissam 1-line budget tightening)
  const handleTrimBullet = () => {
    setIsOptionsOpen(false);
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
      const kb = contextSlug ? getProjectKnowledge(contextSlug) : null;
      let generatedBullet = "";

      if (kb && kb.defaultBullets && kb.defaultBullets.length > 0) {
        generatedBullet = kb.defaultBullets[index % kb.defaultBullets.length];
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

  return (
    <div className="relative min-h-[110px] bg-zinc-950 border border-zinc-800 focus-within:border-white rounded-md px-4 pt-3.5 pb-12 transition-colors">
      {/* Clean Foreground Textarea — Zero Ghosting */}
      <textarea
        value={bullet}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="e.g. Engineered asynchronous HTTP/1.1 server in C++ using epoll with 0 memory leaks..."
        className="w-full bg-transparent text-white font-sans text-sm leading-relaxed p-0 border-none outline-none resize-none placeholder:text-zinc-600 focus:ring-0"
      />

      {/* Bottom Left: Rezi Monochrome AI Split Button */}
      <div className="absolute bottom-2.5 left-3 flex items-center shadow-sm">
        <button
          type="button"
          onClick={handleSuggestBullet}
          disabled={isGenerating}
          className="rounded-l-full bg-white hover:bg-zinc-200 text-black font-bold uppercase text-[11px] tracking-wider px-3.5 py-1.5 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isGenerating ? "Synthesizing..." : "Suggest Bullet"}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsOptionsOpen(!isOptionsOpen)}
          className="rounded-r-full border-l border-zinc-300 bg-white hover:bg-zinc-200 text-black px-2 py-1.5 flex items-center justify-center transition cursor-pointer"
          title="More generate options"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Menu Popover */}
        {isOptionsOpen && (
          <div className="absolute left-0 bottom-full mb-2 z-50 w-64 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-1 text-xs text-zinc-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={handleInjectPeerMetric}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800 hover:text-white text-left transition cursor-pointer"
            >
              <Target className="w-4 h-4 text-zinc-300 shrink-0" />
              <div>
                <div className="font-semibold text-white">Generate with Peer / C Metric</div>
                <div className="text-[10px] text-zinc-500">
                  Inject 42 test suite, memory, or throughput benchmarks
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleRotateVerb}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800 hover:text-white text-left transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-zinc-300 shrink-0" />
              <div>
                <div className="font-semibold text-white">Swap Opening Action Verb</div>
                <div className="text-[10px] text-zinc-500">
                  Rotate first word to a strong engineering verb
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleTrimBullet}
              className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-zinc-800 hover:text-white text-left transition cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-zinc-300 shrink-0" />
              <div>
                <div className="font-semibold text-white">Trim Bullet Length (-15%)</div>
                <div className="text-[10px] text-zinc-500">
                  Eliminate fluff to fit 1-page line budget
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Right: Micro-Telemetry & Controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
        {/* Status flags */}
        {analysis.hasPronouns && (
          <span className="text-red-400 font-sans font-semibold">
            Remove &quot;I/we&quot;
          </span>
        )}

        {/* Word and character metrics */}
        <span>
          {analysis.charCount} chars • {analysis.wordCount} words
        </span>

        {/* Utility buttons */}
        <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1 hover:text-white transition cursor-pointer"
              title="Move bullet up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1 hover:text-white transition cursor-pointer"
              title="Move bullet down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 hover:text-red-400 transition cursor-pointer"
            title="Delete bullet"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
