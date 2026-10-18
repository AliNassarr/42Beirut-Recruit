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
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface CanvasPreviewViewportProps {
  cvData: CVData;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onSectionClick?: (section: TemplateSectionId) => void;
  onHeightBudgetChange?: (budget: HeightBudget) => void;
  onPrintPDF?: () => void;
  onExportDocx?: () => void;
  onAutoFit?: () => void;
}

export function CanvasPreviewViewport({
  cvData,
  isFullScreen = false,
  onToggleFullScreen,
  onSectionClick,
  onHeightBudgetChange,
  onPrintPDF,
  onExportDocx,
  onAutoFit,
}: CanvasPreviewViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(0.9);
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit");
  const [budget, setBudget] = useState<HeightBudget>({
    height: 820,
    printableBudget: 1027,
    percentage: 80,
    isOverflow: false,
  });

  // Calculate auto-fit scale based on available container width
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const paperWidth = 794; // A4 standard width at 96 DPI
    const padding = isFullScreen ? 80 : 48;
    const availableWidth = containerWidth - padding;
    const fitScale = Math.min(1.15, Math.max(0.5, availableWidth / paperWidth));
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
    setScale((prev) => Math.min(1.4, Math.max(0.4, Number((prev + delta).toFixed(2)))));
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
      className={`relative flex flex-col bg-[#18181B] text-zinc-100 ${
        isFullScreen
          ? "fixed inset-0 z-50 overflow-hidden"
          : "w-full h-full min-h-[780px] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden"
      }`}
    >
      {/* Top Single Horizontal Control Deck — Zero Vertical Wrapping */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#09090B] border-b border-zinc-800 z-30 shrink-0 gap-4 flex-nowrap">
        {/* Left: Height Budget Telemetry */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
              budget.isOverflow
                ? "bg-red-950/60 text-red-400 border-red-800"
                : "bg-zinc-900 text-white border-zinc-700"
            }`}
          >
            {budget.isOverflow ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            )}
            <span>
              {budget.height}px / 1027px · {budget.percentage}% 1-Page Line Budget
            </span>
          </div>

          <span className="hidden xl:inline text-xs text-zinc-400">
            {budget.isOverflow
              ? "Over-budget: Trimming required to fit single page"
              : "100% Dr. Wissam 1-Page Compliant"}
          </span>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs text-zinc-300">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetFit}
              className={`px-2 py-1 text-xs font-mono font-bold hover:text-white rounded transition cursor-pointer ${
                zoomMode === "fit" ? "text-white" : "text-zinc-400"
              }`}
              title="Reset to Fit"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="p-1.5 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Preset Zoom Pills */}
          <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-zinc-400">
            <button
              type="button"
              onClick={() => handleSetZoom(0.75)}
              className="px-2 py-1 bg-zinc-900 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition cursor-pointer"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() => handleSetZoom(0.9)}
              className="px-2 py-1 bg-zinc-900 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition cursor-pointer"
            >
              90%
            </button>
            <button
              type="button"
              onClick={() => handleSetZoom(1.0)}
              className="px-2 py-1 bg-zinc-900 hover:text-white hover:bg-zinc-800 rounded border border-zinc-800 transition cursor-pointer"
            >
              100%
            </button>
          </div>

          {/* Auto-Fit 1-Page Trigger */}
          {onAutoFit && (
            <button
              type="button"
              onClick={onAutoFit}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Auto-Fit 1-Page</span>
            </button>
          )}

          {/* Print PDF Trigger */}
          {onPrintPDF && (
            <button
              type="button"
              onClick={onPrintPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-md text-xs font-bold uppercase tracking-wider transition cursor-pointer"
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
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded-md transition cursor-pointer"
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
      <div className="flex-1 overflow-auto p-6 md:p-10 flex justify-center items-start">
        {/* Dynamic Scale Container */}
        <div
          id="resume-preview"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            width: "794px",
            minHeight: "1123px",
          }}
          className="relative transition-transform duration-75 select-text shadow-2xl"
        >
          {/* Paper Canvas (A4 Standard: 794px @ 96 DPI) */}
          <div
            id="resume"
            className="relative bg-white text-black rounded-sm overflow-hidden"
            style={{ width: "794px", minHeight: "1123px" }}
          >
            <WissamCleanTemplate
              data={cvData}
              scale={1}
              onHeightBudgetChange={handleBudgetChange}
              onSectionClick={onSectionClick}
              forceOverflowIndicator={true}
            />

            {/* Rezi Page Break Marker */}
            <div
              className="design-studio-break-page absolute left-0 right-0 pointer-events-none z-30"
              style={{ top: "1027px" }}
            >
              <div className="relative border-b-2 border-dashed border-red-500/80 w-full flex items-center justify-center">
                <span className="bg-red-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md -translate-y-1/2">
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
