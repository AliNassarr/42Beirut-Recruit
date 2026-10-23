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
  Check,
  AlertCircle,
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

// Authentic peer-reviewed systems metrics library
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
  const [isCustomAngleOpen, setIsCustomAngleOpen] = useState(false);
  const [customSeed, setCustomSeed] = useState("");

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

  // Custom Angle / Personal Note synthesis
  const handleApplyCustomAngle = () => {
    if (!customSeed.trim()) {
      setIsCustomAngleOpen(false);
      return;
    }
    setIsGenerating(true);
    setIsCustomAngleOpen(false);
    setIsOptionsOpen(false);

    try {
      const verb = STRONG_VERBS[Math.floor(Math.random() * STRONG_VERBS.length)];
      const seedClean = customSeed.trim().replace(/^\w/, (c) => c.toLowerCase());
      const synthesized = `${verb} ${seedClean}, ensuring zero memory leaks and passing peer evaluation suites.`;
      onChange(synthesized);
      setCustomSeed("");
    } catch (e) {
      console.error("Failed custom angle synthesis:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Mode-Aware Button Label
  const buttonLabel = useMemo(() => {
    if (isGenerating) return "Synthesizing...";
    const text = bullet.trim();
    if (text.length === 0) return "Suggest Bullet";
    if (text.length < 35) return "Complete Bullet";
    return "Rewrite Bullet";
  }, [bullet, isGenerating]);

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
    <div className="group relative bg-[#0A0A0D] border border-zinc-800/90 hover:border-zinc-700 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-white/[0.08] rounded-xl p-3.5 sm:p-4 transition-all flex flex-col gap-3">
      {/* Clean Foreground Textarea — Zero Ghosting */}
      <textarea
        value={bullet}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="e.g. Engineered asynchronous HTTP/1.1 server in C++ using epoll with 0 memory leaks..."
        className="w-full bg-transparent border-0 p-0 text-zinc-100 placeholder:text-zinc-600 text-[14px] sm:text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-0 font-sans"
      />

      {/* Inline Custom Angle / Personal Note Seed Input Bar */}
      {isCustomAngleOpen && (
        <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-2 shadow-2xl flex items-center gap-2 animate-in fade-in duration-100">
          <input
            type="text"
            value={customSeed}
            onChange={(e) => setCustomSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApplyCustomAngle()}
            placeholder="Seed note (e.g. optimized linked list traversal for push_swap)..."
            className="flex-1 bg-zinc-900 border border-zinc-800 text-xs text-white rounded px-2.5 py-1.5 outline-none focus:border-white placeholder:text-zinc-500"
            autoFocus
          />
          <button
            type="button"
            onClick={handleApplyCustomAngle}
            className="px-3 py-1.5 bg-white text-black font-bold uppercase text-[10px] rounded hover:bg-zinc-200 transition cursor-pointer"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setIsCustomAngleOpen(false)}
            className="text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Footer: Clean Subtle Rewrite Button (Left) & Delete Trash Icon (Right) */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 mt-auto">
        <button
          type="button"
          onClick={handleSuggestBullet}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-md transition cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span>Rewrite</span>
        </button>

        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="p-1 text-zinc-500 hover:text-white transition cursor-pointer"
              title="Move bullet up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="p-1 text-zinc-500 hover:text-white transition cursor-pointer"
              title="Move bullet down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
            title="Delete bullet"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
