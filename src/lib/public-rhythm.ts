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
  "relative flex shrink-0 items-center text-[13px] font-medium leading-none tracking-wide transition-colors sm:text-sm";

export const PUBLIC_EVENT_NAV_TAB_ACTIVE_CLASS =
  "font-semibold text-[var(--color-text)]";

export const PUBLIC_EVENT_NAV_TAB_INACTIVE_CLASS =
  "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]";
