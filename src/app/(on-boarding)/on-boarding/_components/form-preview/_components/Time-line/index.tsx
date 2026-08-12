import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Music2,
  PartyPopper,
  Sparkles,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { useRef, useEffect, useState, useMemo, type CSSProperties } from "react";
import { addCacheBusting } from "@/lib/image-utils";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";
import { cn } from "@/lib/utils";

type EventScheduler = {
  id?: string;
  title: string;
  time: string;
};

type EventSchedulerProps = {
  eventSchedularTitle?: string;
  eventSchedularCopy?: string;
  eventSchedular: EventScheduler[] | null | undefined;
  eventSchedularBackgroundImage?: string | null;
  /**
   * Calendar dates the event actually runs on (e.g. `["2026-12-20"]`).
   * Live time-of-day progress is only shown ON one of these dates — before the
   * event every step is "upcoming", after it every step is "completed". When
   * omitted (editor/onboarding previews with no real date) the schedule falls
   * back to a time-of-day demo.
   */
  eventDates?: Array<string | null | undefined>;
};

/** Where "now" sits relative to the event's calendar date(s). */
type EventDayPhase = "before" | "during" | "after" | "unknown";

type ScheduleStatus = "completed" | "current" | "upcoming";

const CARD_MIN_WIDTH = 210;

function formatTime(time: string): string {
  if (!time || time === "TBD") return "TBD";
  if (
    time.toLowerCase().includes("am") ||
    time.toLowerCase().includes("pm")
  ) {
    return time.replace(/\s*(am|pm)\s*/i, (_, p) => ` ${p.toUpperCase()}`);
  }

  try {
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isNaN(hours)) return time;
    const period = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    const mins = Number.isNaN(minutes)
      ? "00"
      : minutes.toString().padStart(2, "0");
    return `${hour12}:${mins} ${period}`;
  } catch {
    return time;
  }
}

function parseTimeToMinutes(time: string): number | null {
  const trimmed = time.trim();
  if (!trimmed || trimmed === "TBD") return null;

  const twelveHour = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = Number(twelveHour[2] ?? "0");
    const period = twelveHour[3].toLowerCase();
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hours = Number(twentyFour[1]);
    const minutes = Number(twentyFour[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  return null;
}

function getScheduleIcon(title: string, index: number, total: number): LucideIcon {
  const t = title.toLowerCase();
  if (
    t.includes("door") ||
    t.includes("gate") ||
    t.includes("open") ||
    t.includes("check-in") ||
    t.includes("check in") ||
    t.includes("arrival") ||
    t.includes("welcome") ||
    t.includes("reception")
  ) {
    return Building2;
  }
  if (
    t.includes("music") ||
    t.includes("band") ||
    t.includes("live") ||
    t.includes("dj") ||
    t.includes("beats") ||
    t.includes("performance") ||
    t.includes("entertainment")
  ) {
    return Music2;
  }
  if (
    t.includes("danc") ||
    t.includes("laser") ||
    t.includes("neon") ||
    t.includes("floor") ||
    t.includes("lounge")
  ) {
    return Sparkles;
  }
  if (
    t.includes("end") ||
    t.includes("close") ||
    t.includes("farewell") ||
    t.includes("finish") ||
    t.includes("final") ||
    t.includes("closing")
  ) {
    return PartyPopper;
  }
  if (
    t.includes("dinner") ||
    t.includes("food") ||
    t.includes("meal") ||
    t.includes("served")
  ) {
    return Utensils;
  }
  if (t.includes("drink") || t.includes("bar") || t.includes("cocktail")) {
    return Wine;
  }

  const defaults: LucideIcon[] = [Building2, Music2, Sparkles, PartyPopper];
  if (index === total - 1 && total > 1) return PartyPopper;
  return defaults[index % defaults.length];
}

/** Midnight (local) timestamp for a date, or null when unparseable. */
function startOfDayTs(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

/**
 * Compare "today" against the event's calendar date(s) so live progress only
 * runs on the actual event day. `unknown` (no dates supplied) lets previews
 * keep the time-of-day demo.
 */
function resolveEventDayPhase(
  eventDates: Array<string | null | undefined> | undefined,
): EventDayPhase {
  if (!eventDates || eventDates.length === 0) return "unknown";

  const dayTimestamps = eventDates
    .map((raw) => {
      const value = (raw ?? "").trim();
      if (value.length < 8) return null;
      // Anchor at midday so a plain `YYYY-MM-DD` never rolls to the previous
      // day under a negative UTC offset before we normalize to local midnight.
      const parsed = new Date(`${value}T12:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : startOfDayTs(parsed);
    })
    .filter((ts): ts is number => ts !== null);

  if (dayTimestamps.length === 0) return "unknown";

  const today = startOfDayTs(new Date());
  if (dayTimestamps.includes(today)) return "during";
  // Past the last occurrence → the schedule has fully happened. Otherwise the
  // next occurrence is still upcoming (covers multi-date events with gaps).
  return today > Math.max(...dayTimestamps) ? "after" : "before";
}

type ScheduleProgress = {
  currentIndex: number;
  useLiveProgress: boolean;
  allCompleted: boolean;
};

function resolveScheduleProgress(
  schedules: EventScheduler[],
  phase: EventDayPhase,
): ScheduleProgress {
  // Before the event day: purely informational — nothing done yet.
  if (phase === "before") {
    return { currentIndex: -1, useLiveProgress: false, allCompleted: false };
  }

  // After the event day: the whole schedule is in the past.
  if (phase === "after") {
    return {
      currentIndex: schedules.length - 1,
      useLiveProgress: true,
      allCompleted: true,
    };
  }

  // On the event day (or preview with no date): track the current slot by time.
  const minutesList = schedules.map((s) => parseTimeToMinutes(s.time));
  if (minutesList.some((m) => m === null)) {
    return { currentIndex: -1, useLiveProgress: false, allCompleted: false };
  }

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const first = minutesList[0]!;
  const last = minutesList[minutesList.length - 1]!;

  if (nowMinutes < first) {
    return { currentIndex: -1, useLiveProgress: true, allCompleted: false };
  }

  if (nowMinutes >= last) {
    return {
      currentIndex: minutesList.length - 1,
      useLiveProgress: true,
      allCompleted: false,
    };
  }

  for (let i = 0; i < minutesList.length - 1; i++) {
    const start = minutesList[i]!;
    const end = minutesList[i + 1]!;
    if (nowMinutes >= start && nowMinutes < end) {
      return { currentIndex: i, useLiveProgress: true, allCompleted: false };
    }
  }

  return {
    currentIndex: minutesList.length - 1,
    useLiveProgress: true,
    allCompleted: false,
  };
}

function getItemStatus(
  index: number,
  currentIndex: number,
  useLiveProgress: boolean,
  allCompleted: boolean,
): ScheduleStatus {
  if (allCompleted) return "completed";
  if (!useLiveProgress || currentIndex < 0) return "upcoming";
  if (index < currentIndex) return "completed";
  if (index === currentIndex) return "current";
  return "upcoming";
}

function segmentIsActive(
  segmentIndex: number,
  currentIndex: number,
  useLiveProgress: boolean,
  allCompleted: boolean,
): boolean {
  if (allCompleted) return true;
  if (!useLiveProgress || currentIndex < 0) return false;
  return segmentIndex < currentIndex;
}

/* ──────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────── */

function ProgressMarker({ status, index }: { status: ScheduleStatus; index: number }) {
  if (status === "completed") {
    return (
      <div
        className="timeline-marker timeline-marker--completed"
        style={{ animationDelay: `${index * 120}ms` }}
      >
        <Check size={14} strokeWidth={3} aria-hidden />
      </div>
    );
  }
  if (status === "current") {
    return (
      <div
        className="timeline-marker timeline-marker--current"
        aria-current="step"
        style={{ animationDelay: `${index * 120}ms` }}
      >
        <span className="timeline-marker__dot" />
        <span className="timeline-marker__ping" aria-hidden />
        <span className="timeline-marker__ring" aria-hidden />
      </div>
    );
  }
  return (
    <div
      className="timeline-marker timeline-marker--upcoming"
      style={{ animationDelay: `${index * 120}ms` }}
    />
  );
}

function TimelineConnector({ filled }: { filled: boolean }) {
  return (
    <div className="timeline-connector" aria-hidden>
      <div className="timeline-connector__track" />
      <div
        className={`timeline-connector__fill ${
          filled ? "timeline-connector__fill--active" : ""
        }`}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Styles (injected via <style> tag)
   ────────────────────────────────────────────── */

const timelineStyles = `
/* ═══════════════════════════════════════════════
   Timeline – Premium Redesign
   ═══════════════════════════════════════════════ */

.tl-section {
  --tl-primary: var(--color-primary, #10b981);
  --tl-primary-fg: var(--color-primary-foreground, #fff);
  --tl-surface: var(--color-surface, var(--color-background, #fff));
  --tl-bg: var(--color-background, #f9fafb);
  --tl-border: var(--color-border, #e5e7eb);
  --tl-text: var(--color-text, #111827);
  --tl-dimmed: var(--color-text-dimmed, #6b7280);
  --tl-card-radius: 14px;
  --tl-marker-size: 24px;
  position: relative;
  width: 100%;
  overflow-x: hidden;
  padding: 2rem 0.75rem;
  background: var(--tl-bg);
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) {
    padding: 2.5rem 1.5rem;
  }
}

/* ── Decorative ambient glow ── */
.tl-section__glow {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.tl-section__glow::before {
  content: "";
  position: absolute;
  top: -40%;
  left: 50%;
  width: 120%;
  height: 120%;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse 60% 40% at 50% 20%,
    color-mix(in srgb, var(--tl-primary) 10%, transparent),
    transparent 70%
  );
}

.tl-section__glow::after {
  content: "";
  position: absolute;
  bottom: -20%;
  left: 50%;
  width: 80%;
  height: 60%;
  transform: translateX(-50%);
  background: radial-gradient(
    ellipse 50% 35% at 50% 80%,
    color-mix(in srgb, var(--tl-primary) 5%, transparent),
    transparent 70%
  );
}

/* ── Background image overlay ── */
.tl-section__bg-image {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.tl-section__bg-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.1;
}

.tl-section__bg-image::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    to bottom,
    var(--tl-bg),
    transparent 30%,
    transparent 70%,
    var(--tl-bg)
  );
}

/* ── Header ── */
.tl-header {
  position: relative;
  z-index: 10;
  margin-bottom: 1.25rem;
  text-align: center;
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-header {
    margin-bottom: 1.5rem;
  }
}

.tl-header__label {
  display: inline-block;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--tl-primary);
  background: color-mix(in srgb, var(--tl-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--tl-primary) 15%, transparent);
  border-radius: 100px;
}

.tl-header__title {
  margin: 0 0 0.375rem;
}

.tl-header__subtitle {
  max-width: 28rem;
  margin: 0 auto;
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--tl-dimmed);
}

@media (min-width: 768px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-header__subtitle {
    font-size: 0.9375rem;
  }
}

/* ── Container card ── */
.tl-container {
  position: relative;
  z-index: 10;
  max-width: 72rem;
  margin: 0 auto;
  border-radius: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--tl-border) 50%, transparent);
  background: color-mix(in srgb, var(--tl-surface) 82%, var(--tl-bg));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0.875rem 0.625rem;
  box-shadow:
    0 4px 6px -1px color-mix(in srgb, var(--tl-text) 3%, transparent),
    0 20px 50px -12px color-mix(in srgb, var(--tl-text) 8%, transparent);
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-container {
    padding: 1.125rem 1rem;
  }
}

.tl-container--has-arrows {
  padding-left: 2.75rem;
  padding-right: 2.75rem;
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-container--has-arrows {
    padding-left: 3.25rem;
    padding-right: 3.25rem;
  }
}

/* ── Scroll arrows ── */
.tl-arrow {
  position: absolute;
  top: 50%;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--tl-border) 60%, transparent);
  background: color-mix(in srgb, var(--tl-surface) 92%, var(--tl-bg));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: var(--tl-text);
  transform: translateY(-50%);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--tl-text) 8%, transparent);
}

.tl-arrow:hover {
  transform: translateY(-50%) scale(1.08);
  border-color: color-mix(in srgb, var(--tl-primary) 40%, var(--tl-border));
  color: var(--tl-primary);
  box-shadow: 0 8px 28px color-mix(in srgb, var(--tl-primary) 15%, transparent);
}

.tl-arrow:active {
  transform: translateY(-50%) scale(0.95);
}

.tl-arrow--left {
  left: 0.5rem;
}

.tl-arrow--right {
  right: 0.5rem;
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-arrow--left { left: 0.75rem; }
  .tl-section:not(.tl-section--preview-narrow) .tl-arrow--right { right: 0.75rem; }
}

.tl-arrow--disabled {
  pointer-events: none;
  opacity: 0.3;
  color: var(--tl-dimmed);
}

/* ── Scroll viewport ── */
.tl-scroll {
  position: relative;
  min-width: 0;
  scroll-behavior: smooth;
}

.tl-scroll--scrollable {
  overflow-x: auto;
  overscroll-behavior-x: contain;
  cursor: grab;
  mask-image: linear-gradient(
    to right,
    transparent,
    black 28px,
    black calc(100% - 28px),
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent,
    black 28px,
    black calc(100% - 28px),
    transparent
  );
}

.tl-scroll--static {
  overflow-x: hidden;
}

/* Hide scrollbar */
.tl-scroll::-webkit-scrollbar { display: none; }
.tl-scroll { -ms-overflow-style: none; scrollbar-width: none; }

/* ── Items layout ── */
.tl-items {
  display: flex;
  gap: 0.375rem;
  padding: 0.125rem 0;
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-items {
    gap: 0.5rem;
  }
}

.tl-items--scrollable {
  width: max-content;
  min-width: 100%;
  padding-right: 1rem;
}

.tl-items--static {
  justify-content: center;
}

/* ── Single item column ── */
.tl-item {
  display: flex;
  flex-direction: column;
  animation: tl-fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes tl-fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Progress track row ── */
.tl-track {
  display: flex;
  align-items: center;
  height: 2rem;
  width: 100%;
  margin-bottom: 0.5rem;
}

/* ── Markers ── */
.timeline-marker {
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  animation: tl-markerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes tl-markerPop {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.timeline-marker--completed {
  width: var(--tl-marker-size);
  height: var(--tl-marker-size);
  background: var(--tl-primary);
  color: var(--tl-primary-fg);
  box-shadow:
    0 2px 8px color-mix(in srgb, var(--tl-primary) 35%, transparent),
    0 0 0 3px color-mix(in srgb, var(--tl-primary) 12%, transparent);
}

.timeline-marker--current {
  width: 30px;
  height: 30px;
  background: linear-gradient(
    135deg,
    var(--tl-primary),
    color-mix(in srgb, var(--tl-primary) 80%, #000)
  );
  border: 2.5px solid var(--tl-surface);
  box-shadow:
    0 0 0 2.5px var(--tl-primary),
    0 0 14px color-mix(in srgb, var(--tl-primary) 30%, transparent),
    0 4px 16px color-mix(in srgb, var(--tl-primary) 25%, transparent);
}

.timeline-marker__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tl-primary-fg);
}

.timeline-marker__ping {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--tl-primary);
  opacity: 0;
  animation: tl-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.timeline-marker__ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--tl-primary) 40%, transparent);
  opacity: 0;
  animation: tl-ping 2s cubic-bezier(0, 0, 0.2, 1) 0.5s infinite;
}

@keyframes tl-ping {
  0% {
    transform: scale(0.85);
    opacity: 0.6;
  }
  80%, 100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

.timeline-marker--upcoming {
  width: 20px;
  height: 20px;
  border: 2px solid color-mix(in srgb, var(--tl-border) 80%, var(--tl-dimmed));
  background: var(--tl-surface);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--tl-text) 4%, transparent);
  transition: border-color 0.3s, box-shadow 0.3s;
}

/* ── Connector ── */
.timeline-connector {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 3px;
  border-radius: 3px;
  overflow: hidden;
}

.timeline-connector__track {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: color-mix(in srgb, var(--tl-border) 55%, transparent);
}

.timeline-connector__fill {
  position: absolute;
  inset: 0;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--tl-primary),
    color-mix(in srgb, var(--tl-primary) 75%, #fff)
  );
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.timeline-connector__fill--active {
  transform: scaleX(1);
}

/* ── Card ── */
.tl-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  min-height: 110px;
  border-radius: var(--tl-card-radius);
  border: 1px solid color-mix(in srgb, var(--tl-border) 70%, transparent);
  background: var(--tl-surface);
  padding: 0.875rem;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-card {
    min-height: 118px;
    padding: 1rem;
  }
}

/* Subtle gradient overlay on every card */
.tl-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--tl-primary) 3%, transparent),
    transparent 50%
  );
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.35s;
}

.tl-card:hover::before {
  opacity: 1;
}

.tl-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tl-primary) 25%, var(--tl-border));
  box-shadow:
    0 8px 24px color-mix(in srgb, var(--tl-text) 6%, transparent),
    0 2px 8px color-mix(in srgb, var(--tl-primary) 6%, transparent);
}

/* Current card */
.tl-card--current {
  border-color: color-mix(in srgb, var(--tl-primary) 40%, var(--tl-border));
  transform: translateY(-2px);
  box-shadow:
    0 16px 48px color-mix(in srgb, var(--tl-primary) 15%, transparent),
    0 4px 16px color-mix(in srgb, var(--tl-primary) 8%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--tl-primary) 15%, transparent);
}

.tl-card--current::before {
  opacity: 1;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--tl-primary) 7%, transparent),
    transparent 60%
  );
}

.tl-card--current::after {
  content: "";
  position: absolute;
  top: 0;
  left: -75%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--tl-primary) 6%, transparent),
    transparent
  );
  animation: tl-shimmer 4s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes tl-shimmer {
  0% { left: -75%; }
  100% { left: 150%; }
}

.tl-card--current:hover {
  transform: translateY(-3px);
}

/* Completed card */
.tl-card--completed {
  opacity: 0.85;
  background: color-mix(in srgb, var(--tl-text) 2%, var(--tl-surface));
}

.tl-card--completed:hover {
  opacity: 0.95;
}

/* ── Card icon ── */
.tl-card__icon {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
  margin-bottom: 0.625rem;
  transition: all 0.3s;
}

.tl-card__icon--current {
  background: linear-gradient(
    135deg,
    var(--tl-primary),
    color-mix(in srgb, var(--tl-primary) 80%, #000)
  );
  color: var(--tl-primary-fg);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--tl-primary) 30%, transparent);
}

.tl-card__icon--completed {
  background: color-mix(in srgb, var(--tl-text) 5%, transparent);
  color: var(--tl-dimmed);
}

.tl-card__icon--upcoming {
  background: color-mix(in srgb, var(--tl-primary) 9%, transparent);
  color: var(--tl-primary);
}

.tl-card:hover .tl-card__icon--upcoming {
  background: color-mix(in srgb, var(--tl-primary) 16%, transparent);
  transform: scale(1.05);
}

/* ── Card time & badge ── */
.tl-card__time-row {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.tl-card__time {
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: var(--tl-dimmed);
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-card__time {
    font-size: 0.75rem;
  }
}

/* ── Card title ── */
.tl-card__title {
  position: relative;
  z-index: 1;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.4;
  color: color-mix(in srgb, var(--tl-text) 90%, var(--tl-dimmed));
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: center;
  margin: 0;
}

@media (min-width: 640px) {
  .tl-section:not(.tl-section--preview-narrow) .tl-card__title {
    font-size: 0.875rem;
  }
}

.tl-card__title--current {
  color: var(--tl-text);
}


`;

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */

export default function Timeline({
  eventSchedular,
  eventSchedularTitle,
  eventSchedularCopy,
  eventSchedularBackgroundImage,
  eventDates,
}: EventSchedulerProps) {
  const narrowPreview = usePreviewNarrowLayout();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const displaySchedules = useMemo(() => {
    const safeEventSchedular = Array.isArray(eventSchedular)
      ? eventSchedular
      : [];

    return safeEventSchedular
      .map((item) => ({
        ...item,
        title: item.title.trim(),
        time: item.time.trim(),
      }))
      .filter((item) => item.title || item.time);
  }, [eventSchedular]);

  const { currentIndex, useLiveProgress, allCompleted } = useMemo(() => {
    const phase = resolveEventDayPhase(eventDates);
    return resolveScheduleProgress(displaySchedules, phase);
  }, [displaySchedules, eventDates]);

  const columnStyle = useMemo(
    () =>
      ({
        minWidth: `${CARD_MIN_WIDTH}px`,
        maxWidth: `${CARD_MIN_WIDTH + 40}px`,
        flex: showArrows ? `0 0 ${CARD_MIN_WIDTH}px` : "1 1 0",
      }) as CSSProperties,
    [showArrows],
  );

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth + 2;
    setShowArrows(hasOverflow);
    setCanScrollLeft(container.scrollLeft > 4);
    setCanScrollRight(
      container.scrollLeft <
        container.scrollWidth - container.clientWidth - 4,
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    const run = () => checkScrollability();
    const id = requestAnimationFrame(() => {
      run();
      requestAnimationFrame(run);
    });

    window.addEventListener("resize", run);

    let resizeObserver: ResizeObserver | undefined;
    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(run);
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", run);
      resizeObserver?.disconnect();
    };
  }, [displaySchedules]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Native horizontal trackpad/mouse gestures — leave alone.
      if (e.deltaY === 0) return;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      // No horizontal overflow: never trap the wheel (lets the page scroll).
      if (maxScrollLeft <= 2) return;

      const scrollingRight = e.deltaY > 0;
      const canScrollFurther = scrollingRight
        ? container.scrollLeft < maxScrollLeft - 1
        : container.scrollLeft > 1;

      // At a horizontal edge: release the wheel so the page can scroll.
      if (!canScrollFurther) return;

      e.preventDefault();
      container.scrollLeft += e.deltaY;
      checkScrollability();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("scroll", checkScrollability);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", checkScrollability);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current || !showArrows) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeftState(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = "grabbing";
  };

  const endDrag = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = showArrows ? "grab" : "";
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollContainerRef.current.scrollLeft = scrollLeftState - (x - startX) * 1.5;
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction === "right" ? CARD_MIN_WIDTH + 20 : -(CARD_MIN_WIDTH + 20),
      behavior: "smooth",
    });
    setTimeout(checkScrollability, 320);
  };

  const subtitle =
    eventSchedularCopy?.trim() ||
    "Experience every moment of the evening";
  const scheduleTitle = eventSchedularTitle?.trim() || "What to Expect";
  const hasScheduleRows = displaySchedules.length > 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: timelineStyles }} />

      <section
        className={cn(
          "tl-section",
          narrowPreview && "tl-section--preview-narrow",
        )}
      >
        {/* Background */}
        {eventSchedularBackgroundImage?.trim() ? (
          <div className="tl-section__bg-image" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={addCacheBusting(eventSchedularBackgroundImage)}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="tl-section__glow" aria-hidden />
        )}

        <div style={{ position: "relative", zIndex: 10, maxWidth: "72rem", margin: "0 auto" }}>
          {/* Header */}
          <header className="tl-header space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Schedule
            </p>
            <SiteHeading
              level={2}
              title={scheduleTitle}
              variant="onSurface"
              align="center"
              className="!mx-auto !block !text-3xl !font-black tracking-tight md:!text-4xl"
            />
            <p className="tl-header__subtitle">{subtitle}</p>
          </header>

          {!hasScheduleRows ? (
            <p className="mx-auto max-w-md text-center text-sm text-[var(--color-text-dimmed)]">
              Add schedule items in the form to preview them here.
            </p>
          ) : (
          <div
            className={`tl-container ${showArrows ? "tl-container--has-arrows" : ""}`}
          >
            {/* Navigation arrows */}
            {showArrows ? (
              <>
                <button
                  type="button"
                  onClick={() => scroll("left")}
                  disabled={!canScrollLeft}
                  className={`tl-arrow tl-arrow--left ${!canScrollLeft ? "tl-arrow--disabled" : ""}`}
                  aria-label="Scroll schedule left"
                >
                  <ChevronLeft size={20} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() => scroll("right")}
                  disabled={!canScrollRight}
                  className={`tl-arrow tl-arrow--right ${!canScrollRight ? "tl-arrow--disabled" : ""}`}
                  aria-label="Scroll schedule right"
                >
                  <ChevronRight size={20} strokeWidth={2.25} />
                </button>
              </>
            ) : null}

            {/* Scrollable viewport */}
            <div
              ref={scrollContainerRef}
              className={`tl-scroll ${
                showArrows ? "tl-scroll--scrollable" : "tl-scroll--static"
              }`}
              onMouseDown={handleMouseDown}
              onMouseLeave={endDrag}
              onMouseUp={endDrag}
              onMouseMove={handleMouseMove}
            >
              <div
                className={`tl-items ${
                  showArrows ? "tl-items--scrollable" : "tl-items--static"
                }`}
                role="list"
                aria-label="Event schedule"
              >
                {displaySchedules.map((item, index) => {
                  const status = getItemStatus(
                    index,
                    currentIndex,
                    useLiveProgress,
                    allCompleted,
                  );
                  const Icon = getScheduleIcon(
                    item.title,
                    index,
                    displaySchedules.length,
                  );
                  const isCurrent = status === "current";
                  const isCompleted = status === "completed";
                  const isFirst = index === 0;
                  const isLast = index === displaySchedules.length - 1;

                  return (
                    <div
                      key={item.id ?? `${item.title}-${index}`}
                      className="tl-item"
                      style={{
                        ...columnStyle,
                        animationDelay: `${index * 100}ms`,
                      }}
                      role="listitem"
                    >
                      {/* Progress track */}
                      <div className="tl-track">
                        {!isFirst ? (
                          <TimelineConnector
                            filled={segmentIsActive(
                              index - 1,
                              currentIndex,
                              useLiveProgress,
                              allCompleted,
                            )}
                          />
                        ) : (
                          <span style={{ flex: 1 }} aria-hidden />
                        )}
                        <ProgressMarker status={status} index={index} />
                        {!isLast ? (
                          <TimelineConnector
                            filled={segmentIsActive(
                              index,
                              currentIndex,
                              useLiveProgress,
                              allCompleted,
                            )}
                          />
                        ) : (
                          <span style={{ flex: 1 }} aria-hidden />
                        )}
                      </div>

                      {/* Card */}
                      <article
                        className={`tl-card ${
                          isCurrent
                            ? "tl-card--current"
                            : isCompleted
                              ? "tl-card--completed"
                              : ""
                        }`}
                      >
                        <div
                          className={`tl-card__icon ${
                            isCurrent
                              ? "tl-card__icon--current"
                              : isCompleted
                                ? "tl-card__icon--completed"
                                : "tl-card__icon--upcoming"
                          }`}
                        >
                          <Icon size={18} strokeWidth={isCurrent ? 2.25 : 1.85} />
                        </div>

                        <div className="tl-card__time-row">
                          <time
                            dateTime={item.time}
                            className="tl-card__time"
                          >
                            {formatTime(item.time)}
                          </time>
                        </div>

                        <h3
                          className={`tl-card__title ${
                            isCurrent ? "tl-card__title--current" : ""
                          }`}
                        >
                          {item.title}
                        </h3>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          )}
        </div>
      </section>
    </>
  );
}
