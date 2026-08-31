"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
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
export const BUILDING_GENERATE_HOLD_PCT = 52;

/**
 * Visual writing beats while `/api/ai/generate-onboarding` is in flight.
 * These are not persist steps — they keep the screen moving during the long wait.
 */
const WRITING_ACTIVITIES = [
  "Setting the tone for your brand",
  "Writing your venue story",
  "Drafting landing page copy",
  "Shaping event details",
  "Building event highlights and timeline",
  "Preparing menus and tickets",
  "Writing brochure copy and FAQs",
] as const;

const FINISHING_LABELS = [
  "Writing brochure copy and FAQs",
  "Putting the finishing touches on your draft",
  "Checking that everything reads well",
] as const;

const WRITING_STEP_MS = 4200;

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
  /** While the AI call is still running the bar holds — keep the UI in motion. */
  isWriting?: boolean;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function writingHint(elapsed: number): string {
  if (elapsed < 8) return "Starting the draft — usually about a minute.";
  if (elapsed < 22) return "Writing copy now. Keep this page open.";
  if (elapsed < 45) return "Still writing — the draft is taking shape.";
  return "Taking a little longer than usual. Almost there.";
}

function WritingDots() {
  return (
    <span className="ml-1 inline-flex items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full"
          style={themeAccent.activeDot}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
          transition={{
            duration: 0.85,
            repeat: Infinity,
            delay: i * 0.16,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

export function BuildingProgress({
  venueName,
  hasMultipleLocations = false,
  activeIndex,
  progress,
  isWriting = false,
}: BuildingProgressProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const [elapsed, setElapsed] = useState(0);
  const [writingBeat, setWritingBeat] = useState(0);
  const [finishBeat, setFinishBeat] = useState(0);

  useEffect(() => {
    if (!isWriting) {
      setElapsed(0);
      setWritingBeat(0);
      setFinishBeat(0);
      return;
    }
    const tick = window.setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    const beat = window.setInterval(() => {
      setWritingBeat((i) => Math.min(i + 1, WRITING_ACTIVITIES.length - 1));
    }, WRITING_STEP_MS);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(beat);
    };
  }, [isWriting]);

  const onLastWritingBeat = writingBeat >= WRITING_ACTIVITIES.length - 1;

  useEffect(() => {
    if (!isWriting || !onLastWritingBeat) return;
    const id = window.setInterval(() => {
      setFinishBeat((i) => (i + 1) % FINISHING_LABELS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [isWriting, onLastWritingBeat]);

  const list = isWriting ? WRITING_ACTIVITIES : BUILDING_STEPS;
  const listActive = isWriting ? writingBeat : activeIndex;
  const progressLabel = isWriting
    ? onLastWritingBeat
      ? FINISHING_LABELS[finishBeat]
      : WRITING_ACTIVITIES[writingBeat]
    : "Saving to your account";

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
          {isWriting ? "Building your draft" : "Saving your draft"}
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          {hasMultipleLocations
            ? "Creating professional content for your brand "
            : "Creating professional content for "}
          <span className="font-medium" style={themeAccent.text}>
            {venueName || "your venue"}
          </span>
        </p>
        <p
          className="mt-1 min-h-4 text-xs text-slate-500"
          aria-live="polite"
        >
          {isWriting ? writingHint(elapsed) : "Keep this page open until we finish"}
        </p>

        <div className="mx-auto mb-6 mt-7 w-full max-w-sm">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {progressLabel}
            </span>
            <span className="text-[11px] font-medium tabular-nums" style={themeAccent.text}>
              {isWriting ? formatElapsed(elapsed) : `${pct}%`}
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full"
              style={themeAccent.progress}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            {isWriting ? (
              <motion.div
                className="pointer-events-none absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/35 to-transparent"
                animate={{ x: ["-120%", "320%"] }}
                transition={{ duration: 1.35, repeat: Infinity, ease: "linear" }}
              />
            ) : null}
          </div>
        </div>

        <div className="mx-auto max-w-sm space-y-1.5 text-left">
          {list.map((label, index) => {
            const isDone = index < listActive;
            const isActive = index === listActive;
            const displayLabel =
              isWriting && isActive && onLastWritingBeat
                ? FINISHING_LABELS[finishBeat]
                : label;
            return (
              <div
                key={isWriting ? `write-${index}` : label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-1 py-1",
                  isActive && "bg-white/[0.04]",
                )}
              >
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
                  {isDone ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                      <Check className="h-3 w-3 text-green-400" />
                    </span>
                  ) : isActive ? (
                    <motion.div
                      animate={{ scale: [0.85, 1.15, 0.85] }}
                      transition={{ duration: 1.1, repeat: Infinity }}
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
                  {displayLabel}
                  {isActive ? <WritingDots /> : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
