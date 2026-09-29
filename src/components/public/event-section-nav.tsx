"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import {
  PUBLIC_EVENT_NAV_TAB_ACTIVE_CLASS,
  PUBLIC_EVENT_NAV_TAB_BASE_CLASS,
  PUBLIC_EVENT_NAV_TAB_INACTIVE_CLASS,
} from "@/lib/public-rhythm";
import { measureLiveStickyScrollOffsetPx } from "@/lib/event-sticky-scroll-offset";

export const EVENT_SECTION_NAV_HEIGHT = "3.5rem";
export const EVENT_SECTION_NAV_HEIGHT_PX = 56;

export const EVENT_SECTION_IDS = {
  about: "event-about",
  rooms: "event-rooms",
  schedule: "event-schedule",
  packages: "event-packages",
  dates: "booking",
  gallery: "event-gallery",
  menu: "event-menu",
  drinks: "event-drinks",
  faqs: "event-faqs",
} as const;

export type EventSectionNavItem = {
  id: string;
  label: string;
};

/** Customer-facing nav label from a CMS section title (e.g. drink_title). */
export function eventSectionNavLabelFromTitle(
  title: string | null | undefined,
  fallback: string,
): string {
  const label = String(title ?? "").replace(/\s+/g, " ").trim();
  return label || fallback;
}

export function buildEventSectionNavItems(flags: {
  about?: boolean;
  rooms?: boolean;
  schedule?: boolean;
  packages?: boolean;
  dates?: boolean;
  gallery?: boolean;
  menu?: boolean;
  drinks?: boolean;
  /** Backend `drink_title` — this block is add-ons, not always drinks. */
  drinksLabel?: string | null;
  faqs?: boolean;
}): EventSectionNavItem[] {
  const items: EventSectionNavItem[] = [];
  if (flags.about !== false) {
    items.push({ id: EVENT_SECTION_IDS.about, label: "About" });
  }
  if (flags.rooms) {
    items.push({ id: EVENT_SECTION_IDS.rooms, label: "Rooms" });
  }
  if (flags.schedule) {
    items.push({ id: EVENT_SECTION_IDS.schedule, label: "Schedule" });
  }
  if (flags.packages) {
    items.push({ id: EVENT_SECTION_IDS.packages, label: "Packages" });
  }
  if (flags.dates !== false) {
    items.push({ id: EVENT_SECTION_IDS.dates, label: "Dates" });
  }
  if (flags.gallery) {
    items.push({ id: EVENT_SECTION_IDS.gallery, label: "Gallery" });
  }
  if (flags.menu) {
    items.push({ id: EVENT_SECTION_IDS.menu, label: "Menu" });
  }
  if (flags.drinks) {
    items.push({
      id: EVENT_SECTION_IDS.drinks,
      label: eventSectionNavLabelFromTitle(flags.drinksLabel, "Other Packages"),
    });
  }
  if (flags.faqs) {
    items.push({ id: EVENT_SECTION_IDS.faqs, label: "FAQs" });
  }
  return items;
}

function hasExplicitScrollY(el: HTMLElement): boolean {
  const { overflowY } = window.getComputedStyle(el);
  return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}

/** Nearest ancestor that actually scrolls on the Y axis (device frames, embed shells). */
export function getNearestScrollContainer(
  start: HTMLElement | null | undefined,
): HTMLElement | null {
  if (typeof window === "undefined") return null;
  let node: HTMLElement | null = start ?? null;
  while (node && node !== document.documentElement) {
    if (hasExplicitScrollY(node) && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function resolveScrollContainer(
  preferred: HTMLElement | null | undefined,
  fallbackFrom: HTMLElement | null | undefined,
  options?: { trustEmbedded?: boolean },
): HTMLElement | null {
  if (preferred && hasExplicitScrollY(preferred)) {
    if (
      options?.trustEmbedded ||
      preferred.scrollHeight > preferred.clientHeight + 1
    ) {
      return preferred;
    }
  }
  return getNearestScrollContainer(fallbackFrom ?? preferred);
}

function isSectionMeasurable(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return el.getBoundingClientRect().height > 1;
}

/**
 * Viewport Y of the spy line: the sticky nav's bottom edge. The last section
 * whose top has crossed this line is the active one — independent of section
 * height, so short blocks (Schedule) are not drowned out by tall ones (Dates).
 */
function getSpyLinePx(
  navEl: HTMLElement | null,
  fallbackOffsetPx: number,
  container: HTMLElement | null,
): number {
  if (navEl) {
    const bottom = navEl.getBoundingClientRect().bottom;
    if (bottom > 0) return bottom;
  }
  const origin = container ? container.getBoundingClientRect().top : 0;
  return origin + fallbackOffsetPx;
}

function isScrolledToEnd(container: HTMLElement | null): boolean {
  const scrollTop = container ? container.scrollTop : window.scrollY;
  const viewH = container ? container.clientHeight : window.innerHeight;
  const scrollH = container
    ? container.scrollHeight
    : document.documentElement.scrollHeight;
  return scrollH - viewH > 0 && scrollTop >= scrollH - viewH - 8;
}

/** Last nav section whose top has reached the spy line (or the last one at page end). */
export function pickActiveEventSectionId(
  items: EventSectionNavItem[],
  spyLinePx: number,
  container: HTMLElement | null,
): string {
  if (items.length === 0) return "";

  const measurable = items.filter((item) => {
    const el = document.getElementById(item.id);
    return el != null && isSectionMeasurable(el);
  });
  if (measurable.length === 0) return items[0]?.id ?? "";

  if (isScrolledToEnd(container)) {
    return measurable[measurable.length - 1].id;
  }

  let activeId = measurable[0].id;
  for (const item of measurable) {
    const el = document.getElementById(item.id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= spyLinePx + 1) {
      activeId = item.id;
    } else {
      break;
    }
  }
  return activeId;
}

type EventSectionNavProps = {
  items: EventSectionNavItem[];
  stickyTop: string;
  headerOffsetPx: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Extra action after jumping to the section (e.g. open the onboarding form). */
  onItemClick?: (id: string) => void;
  /** Persistent booking CTA — jumps to this section id (usually dates). */
  bookNowId?: string;
};

function scrollToSection(
  id: string,
  offsetPx: number,
  preferredContainer: HTMLElement | null,
  trustEmbedded = false,
) {
  const el = document.getElementById(id);
  if (!el) return;

  const container = resolveScrollContainer(preferredContainer, el, {
    trustEmbedded,
  });

  if (container) {
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const top = elRect.top - cRect.top + container.scrollTop - offsetPx;
    container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    return;
  }

  const top = el.getBoundingClientRect().top + window.scrollY - offsetPx;
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
}

/**
 * Thin sticky jump links for the existing event page — does not restyle sections.
 */
export function EventSectionNav({
  items,
  stickyTop,
  headerOffsetPx,
  scrollContainerRef,
  onItemClick,
  bookNowId,
}: EventSectionNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const itemsRef = useRef(items);
  const clickLockRef = useRef(false);
  const clickUnlockTimerRef = useRef<number>(0);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const itemKey = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  itemsRef.current = items;

  const usesEmbeddedScroll = Boolean(scrollContainerRef);

  useEffect(() => {
    if (items.length === 0) return;

    const offsetPx = headerOffsetPx + EVENT_SECTION_NAV_HEIGHT_PX;
    const embeddedScrollOpts = usesEmbeddedScroll
      ? { trustEmbedded: true as const }
      : undefined;

    const syncActive = () => {
      if (clickLockRef.current) return;
      const container = resolveScrollContainer(
        scrollContainerRef?.current,
        navRef.current,
        embeddedScrollOpts,
      );
      const spyLine = getSpyLinePx(navRef.current, offsetPx, container);
      const nextId = pickActiveEventSectionId(
        itemsRef.current,
        spyLine,
        container,
      );
      if (nextId) {
        setActiveId((prev) => (prev === nextId ? prev : nextId));
      }
    };

    let raf = 0;
    const scheduleSync = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        syncActive();
      });
    };

    syncActive();

    document.addEventListener("scroll", scheduleSync, {
      capture: true,
      passive: true,
    });
    window.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);

    const embeddedScroller = scrollContainerRef?.current;
    embeddedScroller?.addEventListener("scroll", scheduleSync, {
      passive: true,
    });

    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(document.documentElement);
    const preferred = scrollContainerRef?.current;
    if (preferred) resizeObserver.observe(preferred);
    for (const item of itemsRef.current) {
      const el = document.getElementById(item.id);
      if (el) resizeObserver.observe(el);
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      if (clickUnlockTimerRef.current) {
        window.clearTimeout(clickUnlockTimerRef.current);
        clickUnlockTimerRef.current = 0;
      }
      document.removeEventListener("scroll", scheduleSync, { capture: true });
      window.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      embeddedScroller?.removeEventListener("scroll", scheduleSync);
      resizeObserver.disconnect();
    };
  }, [itemKey, headerOffsetPx, scrollContainerRef, usesEmbeddedScroll]);

  useEffect(() => {
    const btn = buttonRefs.current.get(activeId);
    const scroller = navRef.current?.querySelector<HTMLElement>(
      "[data-event-nav-scroller]",
    );
    if (!btn || !scroller) return;
    const btnRect = btn.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    if (btnRect.left >= scrollerRect.left && btnRect.right <= scrollerRect.right) {
      return;
    }
    scroller.scrollLeft +=
      btnRect.left -
      scrollerRect.left -
      (scrollerRect.width - btnRect.width) / 2;
  }, [activeId]);

  if (items.length === 0) return null;

  const jumpToBook = () => {
    if (!bookNowId) return;
    setActiveId(bookNowId);
    const preferred =
      scrollContainerRef?.current ??
      getNearestScrollContainer(navRef.current);
    const liveOffset = measureLiveStickyScrollOffsetPx({
      navEl: navRef.current,
      fallbackHeaderOffsetPx: headerOffsetPx,
    });
    scrollToSection(
      bookNowId,
      liveOffset,
      preferred,
      usesEmbeddedScroll,
    );
    onItemClick?.(bookNowId);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Event sections"
      className="sticky z-40 isolate border-y border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-background)]/95 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.45)] backdrop-blur-md"
      style={{ top: stickyTop, minHeight: EVENT_SECTION_NAV_HEIGHT }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-stretch">
      {/*
        Do not put justify-center on the overflow scroller — it clips the first
        tabs (About) on a 390px mobile frame. Inner w-max min-w-full centers
        when the row fits and starts at About when it overflows.
      */}
      <div
        data-event-nav-scroller
        className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max min-w-full min-h-[3.5rem] flex-nowrap items-stretch justify-start gap-5 px-4 sm:gap-7 sm:px-6">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                ref={(node) => {
                  if (node) buttonRefs.current.set(item.id, node);
                  else buttonRefs.current.delete(item.id);
                }}
                onClick={() => {
                  setActiveId(item.id);
                  clickLockRef.current = true;
                  const preferred =
                    scrollContainerRef?.current ??
                    getNearestScrollContainer(navRef.current);
                  const liveOffset = measureLiveStickyScrollOffsetPx({
                    navEl: navRef.current,
                    fallbackHeaderOffsetPx: headerOffsetPx,
                  });
                  scrollToSection(
                    item.id,
                    liveOffset,
                    preferred,
                    usesEmbeddedScroll,
                  );
                  const container = resolveScrollContainer(
                    preferred,
                    navRef.current,
                    usesEmbeddedScroll ? { trustEmbedded: true } : undefined,
                  );
                  const unlock = () => {
                    clickLockRef.current = false;
                    if (clickUnlockTimerRef.current) {
                      window.clearTimeout(clickUnlockTimerRef.current);
                      clickUnlockTimerRef.current = 0;
                    }
                  };
                  const onScrollEnd = () => {
                    container?.removeEventListener("scrollend", onScrollEnd);
                    window.removeEventListener("scrollend", onScrollEnd);
                    unlock();
                  };
                  container?.addEventListener("scrollend", onScrollEnd, {
                    once: true,
                  });
                  window.addEventListener("scrollend", onScrollEnd, {
                    once: true,
                  });
                  if (clickUnlockTimerRef.current) {
                    window.clearTimeout(clickUnlockTimerRef.current);
                  }
                  clickUnlockTimerRef.current = window.setTimeout(() => {
                    container?.removeEventListener("scrollend", onScrollEnd);
                    window.removeEventListener("scrollend", onScrollEnd);
                    unlock();
                  }, 1200);
                  onItemClick?.(item.id);
                }}
                className={cn(
                  PUBLIC_EVENT_NAV_TAB_BASE_CLASS,
                  isActive
                    ? PUBLIC_EVENT_NAV_TAB_ACTIVE_CLASS
                    : PUBLIC_EVENT_NAV_TAB_INACTIVE_CLASS,
                )}
                aria-current={isActive ? "true" : undefined}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0",
                    isActive ? "h-[3px] bg-[color:var(--color-primary)]" : "h-0.5 bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
      {bookNowId ? (
        <div className="flex shrink-0 items-center border-l border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] px-3 sm:px-4">
          <button
            type="button"
            onClick={jumpToBook}
            className="inline-flex h-8 items-center rounded-full bg-[color:var(--color-primary)] px-3 text-xs font-semibold text-[color:var(--color-primary-foreground,white)] shadow-sm transition-opacity hover:opacity-95 sm:h-9 sm:px-4 sm:text-sm @max-md/preview:!text-xs"
          >
            Book now
          </button>
        </div>
      ) : null}
      </div>
    </nav>
  );
}
