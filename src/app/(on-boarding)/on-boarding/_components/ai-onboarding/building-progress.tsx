"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { AI_ONBOARDING_APPLY_STEPS } from "../../_lib/apply-ai-onboarding-content";

const themeAccent = {
  text: { color: "var(--color-primary, #3b82f6)" } as CSSProperties,
  iconBox: {
    backgroundColor:
      "color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)",
    borderColor:
      "color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)",
  } as CSSProperties,
  progress: {
    background:
      "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
  } as CSSProperties,
  activeDot: {
    backgroundColor: "var(--color-primary, #3b82f6)",
  } as CSSProperties,
};

/** Hold the bar here until save starts so generate → apply never resets. */
export const BUILDING_GENERATE_HOLD_PCT = 48;

export const BUILDING_STEPS = [
  "Writing your content",
  ...AI_ONBOARDING_APPLY_STEPS.map((step) => step.label),
] as const;

type BuildingProgressProps = {
  venueName: string;
  hasMultipleLocations?: boolean;
  /** 0 = writing content; 1+ = persist steps. */
  activeIndex: number;
  progress: number;
};

export function BuildingProgress({
  venueName,
  hasMultipleLocations = false,
  activeIndex,
  progress,
}: BuildingProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
      <div className="mx-auto w-full max-w-md text-center">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border"
          style={themeAccent.iconBox}
        >
          <Sparkles className="h-7 w-7" style={themeAccent.text} />
        </motion.div>

        <h2 className="text-xl font-semibold tracking-tight text-white">
          Building your site
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          {hasMultipleLocations
            ? "Creating professional content for your brand "
            : "Creating professional content for "}
          <span className="font-medium" style={themeAccent.text}>
            {venueName || "your venue"}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Keep this page open until we finish
        </p>

        <div className="mx-auto mb-6 mt-7 w-full max-w-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Progress</span>
            <span className="text-[11px] font-medium" style={themeAccent.text}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full"
              style={themeAccent.progress}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-sm space-y-1.5 text-left">
          {BUILDING_STEPS.map((label, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;
            return (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg px-1 py-1"
              >
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                  {isDone ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                      <Check className="h-3 w-3 text-green-400" />
                    </span>
                  ) : isActive ? (
                    <motion.div
                      animate={{ scale: [0.85, 1.15, 0.85] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="h-2 w-2 rounded-full"
                      style={themeAccent.activeDot}
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  )}
                </div>
                <span
                  className={
                    isDone
                      ? "text-xs text-slate-400"
                      : isActive
                        ? "text-xs font-medium text-white"
                        : "text-xs text-slate-600"
                  }
                  style={isActive ? themeAccent.text : undefined}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
