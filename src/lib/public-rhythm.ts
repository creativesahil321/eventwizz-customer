import { cn } from "@/lib/utils";

/** Vertical padding for public marketing / event content sections. */
export const PUBLIC_SECTION_PY_CLASS = "py-12 md:py-16";

/** Standard content width + horizontal gutters. */
export const PUBLIC_SECTION_CONTAINER_CLASS = "mx-auto max-w-7xl px-4 md:px-6";

/** Event card title — two-line clamp, consistent weight. */
export const PUBLIC_CARD_TITLE_CLASS =
  "line-clamp-2 font-bold leading-snug tracking-tight";

/** Price emphasis on event cards and date footers. */
export const PUBLIC_PRICE_TEXT_CLASS =
  "text-lg font-semibold tabular-nums text-[var(--color-text)]";

/** Secondary metadata (date, time, location chips). */
export const PUBLIC_METADATA_TEXT_CLASS =
  "text-sm text-[var(--color-text-dimmed)]";

/** Event hero H1 — compact on phones, full title from md+. */
export const PUBLIC_EVENT_HERO_TITLE_CLASS = cn(
  "max-md:line-clamp-2 max-md:!leading-[1.15] md:line-clamp-none",
);

/** Event section nav — active tab emphasis. */
export const PUBLIC_EVENT_NAV_TAB_BASE_CLASS =
  "relative flex shrink-0 items-center text-[13px] font-medium leading-none tracking-wide transition-colors duration-200 ease-out sm:text-sm";

export const PUBLIC_EVENT_NAV_TAB_ACTIVE_CLASS =
  "font-semibold text-[var(--color-text)]";

export const PUBLIC_EVENT_NAV_TAB_INACTIVE_CLASS =
  "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]";

/** Shared motion durations — keep public interactions consistent. */
export const PUBLIC_MOTION_DURATION_MICRO = "duration-150";
export const PUBLIC_MOTION_DURATION_SHORT = "duration-200";
export const PUBLIC_MOTION_DURATION_MEDIUM = "duration-300";
export const PUBLIC_MOTION_EASE = "ease-out";

/** Card lift + shadow — hover-capable pointers only; tap feedback on touch. */
export const PUBLIC_CARD_HOVER_LIFT_CLASS = cn(
  "transition-all",
  PUBLIC_MOTION_DURATION_SHORT,
  PUBLIC_MOTION_EASE,
  "motion-reduce:transition-none",
  "[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-1",
  "active:scale-[0.99]",
);

/** Card image zoom — hover-capable pointers only. */
export const PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS = cn(
  "transition-transform",
  PUBLIC_MOTION_DURATION_MEDIUM,
  PUBLIC_MOTION_EASE,
  "motion-reduce:transition-none motion-reduce:scale-100",
  "[@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.03]",
);

/** Pending overlay fade for card / CTA loading states. */
export const PUBLIC_LOADING_OVERLAY_CLASS = cn(
  "transition-opacity",
  PUBLIC_MOTION_DURATION_SHORT,
  PUBLIC_MOTION_EASE,
  "motion-reduce:transition-none",
);

/** Filter / search results enter fade. */
export const PUBLIC_FILTER_RESULTS_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
} as const;
