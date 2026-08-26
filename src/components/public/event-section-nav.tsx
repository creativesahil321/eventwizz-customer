"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

export const EVENT_SECTION_NAV_HEIGHT = "3.5rem";
export const EVENT_SECTION_NAV_HEIGHT_PX = 56;

export const EVENT_SECTION_IDS = {
  about: "event-about",
  rooms: "event-rooms",
  schedule: "event-schedule",
  dates: "booking",
  gallery: "event-gallery",
  menu: "event-menu",
  faqs: "event-faqs",
} as const;

export type EventSectionNavItem = {
  id: string;
  label: string;
};

export function buildEventSectionNavItems(flags: {
  about?: boolean;
  rooms?: boolean;
  schedule?: boolean;
  dates?: boolean;
  gallery?: boolean;
  menu?: boolean;
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
  if (flags.dates !== false) {
    items.push({ id: EVENT_SECTION_IDS.dates, label: "Dates" });
  }
  if (flags.gallery) {
    items.push({ id: EVENT_SECTION_IDS.gallery, label: "Gallery" });
  }
  if (flags.menu) {
    items.push({ id: EVENT_SECTION_IDS.menu, label: "Menu" });
  }
  if (flags.faqs) {
    items.push({ id: EVENT_SECTION_IDS.faqs, label: "FAQs" });
  }
  return items;
}

/** Nearest ancestor that actually scrolls on the Y axis (device frames, embed shells). */
export function getNearestScrollContainer(
  start: HTMLElement | null | undefined,
): HTMLElement | null {
  if (typeof window === "undefined") return null;
  let node: HTMLElement | null = start ?? null;
  while (node && node !== document.documentElement) {
    const { overflowY } = window.getComputedStyle(node);
    const canScrollY =
      overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
    if (canScrollY && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function resolveScrollContainer(
  preferred: HTMLElement | null | undefined,
  fallbackFrom: HTMLElement | null | undefined,
): HTMLElement | null {
  if (
    preferred &&
    preferred.scrollHeight > preferred.clientHeight + 1
  ) {
    return preferred;
  }
  return getNearestScrollContainer(fallbackFrom ?? preferred);
}

type EventSectionNavProps = {
  items: EventSectionNavItem[];
  stickyTop: string;
  headerOffsetPx: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Extra action after jumping to the section (e.g. open the onboarding form). */
  onItemClick?: (id: string) => void;
};

function scrollToSection(
  id: string,
  offsetPx: number,
  preferredContainer: HTMLElement | null,
) {
  const el = document.getElementById(id);
  if (!el) return;

  const container = resolveScrollContainer(preferredContainer, el);

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
}: EventSectionNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const itemKey = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const root = resolveScrollContainer(
      scrollContainerRef?.current,
      navRef.current,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const nextId = visible[0]?.target.id;
        if (nextId) setActiveId(nextId);
      },
      {
        root,
        rootMargin: `-${headerOffsetPx + EVENT_SECTION_NAV_HEIGHT_PX}px 0px -50% 0px`,
        threshold: [0.08, 0.2, 0.4],
      },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items, itemKey, headerOffsetPx, scrollContainerRef]);

  if (items.length === 0) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Event sections"
      className="sticky z-40 isolate border-y border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-background)]/95 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.45)] backdrop-blur-md"
      style={{ top: stickyTop, minHeight: EVENT_SECTION_NAV_HEIGHT }}
    >
      {/*
        Do not put justify-center on the overflow scroller — it clips the first
        tabs (About) on a 390px mobile frame. Inner w-max min-w-full centers
        when the row fits and starts at About when it overflows.
      */}
      <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mx-auto flex w-max min-w-full min-h-[3.5rem] flex-nowrap items-center justify-center gap-5 px-4 py-2.5 sm:gap-7 sm:px-6">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  scrollToSection(
                    item.id,
                    headerOffsetPx + EVENT_SECTION_NAV_HEIGHT_PX,
                    scrollContainerRef?.current ??
                      getNearestScrollContainer(navRef.current),
                  );
                  onItemClick?.(item.id);
                }}
                className={cn(
                  "shrink-0 border-b-2 pb-1 text-[13px] font-medium tracking-wide transition-colors sm:text-sm",
                  isActive
                    ? "border-[color:var(--color-primary)] text-[var(--color-text)]"
                    : "border-transparent text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]",
                )}
                aria-current={isActive ? "true" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
