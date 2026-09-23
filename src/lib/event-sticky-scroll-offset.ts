import {
  EVENT_SECTION_NAV_HEIGHT,
  EVENT_SECTION_NAV_HEIGHT_PX,
} from "@/components/public/event-section-nav";

/** Live measured CommonHeader height. Fallback matches the desktop bar. */
export const EVENT_HEADER_OFFSET_CSS_VAR = "--event-header-offset";
export const EVENT_HEADER_OFFSET_FALLBACK = "4.5rem";
export const EVENT_HEADER_OFFSET = `var(${EVENT_HEADER_OFFSET_CSS_VAR}, ${EVENT_HEADER_OFFSET_FALLBACK})`;

/** Write the visible header height onto the preview frame (or the document). */
export function publishEventHeaderOffsetPx(
  fromEl: HTMLElement | null,
  heightPx: number,
): void {
  if (heightPx <= 0) return;
  const frame = fromEl?.closest<HTMLElement>("[data-preview-device]");
  const root =
    frame ??
    (typeof document !== "undefined" ? document.documentElement : null);
  if (!root) return;
  root.style.setProperty(
    EVENT_HEADER_OFFSET_CSS_VAR,
    `${Math.round(heightPx)}px`,
  );
}

/** Breathing room below sticky chrome so section headings stay visible. */
export const EVENT_SECTION_SCROLL_GAP_PX = 24;

/** Sticky room pill bar rendered on multi-room event pages. */
export const EVENT_STICKY_ROOM_BAR_SELECTOR = "[data-event-sticky-room-bar]";

/**
 * Measure live sticky chrome (header stack + section nav + room bar) for tab/anchor scroll.
 * Falls back to header + nav when sticky elements are not yet painted.
 */
export function measureLiveStickyScrollOffsetPx(options: {
  navEl?: HTMLElement | null;
  fallbackHeaderOffsetPx: number;
  extraGapPx?: number;
}): number {
  const gap = options.extraGapPx ?? EVENT_SECTION_SCROLL_GAP_PX;
  let maxBottom = 0;

  if (options.navEl) {
    const navRect = options.navEl.getBoundingClientRect();
    if (navRect.height > 0 && navRect.bottom > 0) {
      maxBottom = Math.max(maxBottom, navRect.bottom);
    }
  }

  if (typeof document !== "undefined") {
    const roomBar = document.querySelector<HTMLElement>(
      EVENT_STICKY_ROOM_BAR_SELECTOR,
    );
    if (roomBar) {
      const roomRect = roomBar.getBoundingClientRect();
      if (roomRect.height > 0 && roomRect.bottom > 0) {
        maxBottom = Math.max(maxBottom, roomRect.bottom);
      }
    }
  }

  if (maxBottom > 0) {
    return maxBottom + gap;
  }

  return (
    options.fallbackHeaderOffsetPx + EVENT_SECTION_NAV_HEIGHT_PX + gap
  );
}

/** CSS `scroll-mt` fallback when `--event-sticky-offset` is unset (header + nav + gap). */
export const EVENT_STICKY_SCROLL_MT_FALLBACK = "8.5rem";

/** Live `--event-sticky-offset` value aligned with public event pages. */
export function buildEventStickyOffsetCssVar(options: {
  headerOffset: string;
  showSectionNav: boolean;
}): string {
  if (options.showSectionNav) {
    return `calc(${options.headerOffset} + ${EVENT_SECTION_NAV_HEIGHT} + ${EVENT_SECTION_SCROLL_GAP_PX}px)`;
  }
  return `calc(${options.headerOffset} + ${EVENT_SECTION_SCROLL_GAP_PX}px)`;
}

/** JS scroll offset for Book Now / room-change anchors (header + nav + gap). */
export function resolveBookNowScrollOffsetPx(options: {
  headerOffsetPx: number;
  includeSectionNav?: boolean;
}): number {
  const navPx =
    options.includeSectionNav === false ? 0 : EVENT_SECTION_NAV_HEIGHT_PX;
  return options.headerOffsetPx + navPx + EVENT_SECTION_SCROLL_GAP_PX;
}
