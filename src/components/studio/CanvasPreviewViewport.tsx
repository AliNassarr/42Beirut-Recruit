"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  WissamCleanTemplate,
  HeightBudget,
  TemplateSectionId,
} from "@/components/templates/WissamCleanTemplate";
import { CVData } from "@/types/resume";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface CanvasPreviewViewportProps {
  cvData: CVData;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onSectionClick?: (section: TemplateSectionId) => void;
  onHeightBudgetChange?: (budget: HeightBudget) => void;
  onPrintPDF?: () => void;
  onExportDocx?: () => void;
}

export function CanvasPreviewViewport({
  cvData,
  isFullScreen = false,
  onToggleFullScreen,
  onSectionClick,
  onHeightBudgetChange,
  onPrintPDF,
  onExportDocx,
}: CanvasPreviewViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.85);
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit");
  const [budget, setBudget] = useState<HeightBudget>({
    height: 980,
    printableBudget: 1027,
    percentage: 95,
    isOverflow: false,
  });

  // Calculate auto-fit scale based on available container width
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const paperWidth = 794; // A4 standard width at 96 DPI
    const padding = isFullScreen ? 80 : 48;
    const availableWidth = containerWidth - padding;
    const fitScale = Math.min(1.2, Math.max(0.45, availableWidth / paperWidth));
    setScale(Number(fitScale.toFixed(3)));
  }, [isFullScreen]);

  // Handle window resize and auto-fit updates
  useEffect(() => {
    if (zoomMode === "fit") {
      calculateFitScale();
    }
    const handleResize = () => {
      if (zoomMode === "fit") calculateFitScale();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateFitScale, zoomMode]);

  const handleBudgetChange = (b: HeightBudget) => {
    setBudget(b);
    if (onHeightBudgetChange) {
      onHeightBudgetChange(b);
    }
  };

  const handleZoom = (delta: number) => {
    setZoomMode("custom");
    setScale((prev) => Math.min(1.5, Math.max(0.4, Number((prev + delta).toFixed(2)))));
  };

  const handleSetZoom = (val: number) => {
    setZoomMode("custom");
    setScale(val);
  };

  const handleResetFit = () => {
    setZoomMode("fit");
    calculateFitScale();
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-[#1E293B] text-slate-100 ${
        isFullScreen
          ? "fixed inset-0 z-50 overflow-hidden"
          : "w-full h-full min-h-[780px] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
      }`}
    >
      {/* Top Floating Viewport Control Deck */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800 z-30 shrink-0">
        {/* Left: Height Budget Telemetry Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
              budget.isOverflow
                ? "bg-red-500/20 text-red-300 border-red-500/40 animate-pulse"
                : budget.percentage > 92
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
            }`}
          >
            {budget.isOverflow ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>
              {budget.height}px / 1027px ({budget.percentage}% 1-Page Line Budget)
            </span>
          </div>

          <span className="hidden sm:inline text-xs text-slate-400">
            {budget.isOverflow
              ? "Warning: Resume overflows onto page 2! Trim bullets or switch to compact."
              : "100% compliant with Dr. Wissam Single-Page Rule"}
          </span>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetFit}
              className={`px-2 py-1 text-xs font-mono font-semibold hover:text-white rounded transition cursor-pointer ${
                zoomMode === "fit" ? "text-cyan-400" : "text-slate-300"
              }`}
              title="Reset to Fit"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="p-1.5 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick preset zoom pills */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <button
              type="button"
              onClick={() => handleSetZoom(0.75)}
              className="px-1.5 py-0.5 hover:text-cyan-400 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handleSetZoom(0.9)}
              className="px-1.5 py-0.5 hover:text-cyan-400 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              90%
            </button>
            <button
              type="button"
              onClick={() => handleSetZoom(1.0)}
              className="px-1.5 py-0.5 hover:text-cyan-400 hover:bg-slate-800 rounded transition cursor-pointer"
            >
              100%
            </button>
          </div>

          {/* Print PDF Trigger */}
          {onPrintPDF && (
            <button
              type="button"
              onClick={onPrintPDF}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PDF</span>
            </button>
          )}

          {/* DOCX Export Trigger */}
          {onExportDocx && (
            <button
              type="button"
              onClick={onExportDocx}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word</span>
            </button>
          )}

          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition cursor-pointer"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Preview"}
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
        {/* Dynamic Matrix Scale Container */}
        <div
          id="resume-preview"
          style={{
            transform: `matrix(${scale}, 0, 0, ${scale}, 0, 0)`,
            transformOrigin: "top center",
            width: "794px",
            minHeight: "1123px",
          }}
          className="relative transition-transform duration-75 select-text"
        >
          {/* Paper Canvas (A4 Standard: 794px @ 96 DPI) */}
          <div
            id="resume"
            className="relative bg-white text-black shadow-2xl rounded-sm overflow-hidden"
            style={{ width: "794px", minHeight: "1123px" }}
          >
            <WissamCleanTemplate
              data={cvData}
              scale={1}
              onHeightBudgetChange={handleBudgetChange}
              onSectionClick={onSectionClick}
              forceOverflowIndicator={true}
            />

            {/* Rezi Page Break Demarcation Marker */}
            <div
              className="design-studio-break-page absolute left-0 right-0 pointer-events-none z-30"
              style={{ top: "1027px" }}
            >
              <div className="relative border-b-2 border-dashed border-red-500/80 w-full flex items-center justify-center">
                <span className="bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md -translate-y-1/2">
                  1027px A4 Printable Page Boundary
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
