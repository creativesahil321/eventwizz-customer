"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

export const EVENT_SECTION_NAV_HEIGHT = "2.75rem";
export const EVENT_SECTION_NAV_HEIGHT_PX = 44;

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

type EventSectionNavProps = {
  items: EventSectionNavItem[];
  stickyTop: string;
  headerOffsetPx: number;
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

function scrollToSection(
  id: string,
  offsetPx: number,
  container: HTMLElement | null,
) {
  const el = document.getElementById(id);
  if (!el) return;

  const useContainer =
    !!container && container.scrollHeight > container.clientHeight + 1;

  if (useContainer && container) {
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const top =
      elRect.top - cRect.top + container.scrollTop - offsetPx;
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
}: EventSectionNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const itemKey = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const root = scrollContainerRef?.current ?? null;
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
      aria-label="Event sections"
      className="sticky z-40 border-b border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-background)]/95 backdrop-blur-md"
      style={{ top: stickyTop, height: EVENT_SECTION_NAV_HEIGHT }}
    >
      <div className="mx-auto flex h-full max-w-5xl items-center justify-start gap-1 overflow-x-auto px-3 sm:justify-center sm:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                scrollToSection(
                  item.id,
                  headerOffsetPx + EVENT_SECTION_NAV_HEIGHT_PX,
                  scrollContainerRef?.current ?? null,
                )
              }
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)] text-[color:var(--color-primary)]"
                  : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]",
              )}
              aria-current={isActive ? "true" : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
