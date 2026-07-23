"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getRoomFloatingAccent } from "@/lib/room-accent-palette";

export interface FloatingRoomBarItem {
  key: string;
  label: string;
}

export interface FloatingRoomBarProps {
  rooms: FloatingRoomBarItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  visible?: boolean;
  /** Hide when room count is below this (default 2). Use 1 for checkout. */
  minRooms?: number;
  layout?: "sticky" | "inline" | "static";
  stickyTop?: string;
  /** Leading label inside the pill (default "Room"). */
  label?: string;
  /** Visual density. "lg" = larger, more premium click targets (~48px tall). */
  size?: "sm" | "lg";
  className?: string;
  barClassName?: string;
  trailing?: ReactNode;
  /** Dashed “Add room” link shown inside the bar when provided. */
  addRoomHref?: string;
  addRoomLabel?: string;
}

const SIZE_STYLES = {
  sm: {
    bar: "gap-2 px-3 py-2 sm:gap-2.5 sm:px-4 sm:py-2.5",
    label: "text-[10px] sm:text-[11px]",
    group: "gap-0.5",
    button: "gap-1.5 px-2.5 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-sm",
    dot: "h-2 w-2",
  },
  lg: {
    bar: "gap-3 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3",
    label: "text-[11px] sm:text-xs",
    group: "gap-1 sm:gap-1.5",
    button:
      "min-h-[44px] gap-2 px-4 py-2.5 text-sm sm:min-h-[48px] sm:px-5 sm:py-3 sm:text-[15px]",
    dot: "h-2.5 w-2.5",
  },
} as const;

/**
 * Unified Lovable-style floating room bar:
 * white pill, “ROOM” label, colored dots, active room as dark filled pill.
 */
export function FloatingRoomBar({
  rooms,
  activeIndex,
  onSelect,
  visible = true,
  minRooms = 2,
  layout = "sticky",
  stickyTop,
  label = "Room",
  size = "sm",
  className,
  barClassName,
  trailing,
  addRoomHref,
  addRoomLabel = "Add room",
}: FloatingRoomBarProps) {
  const sizeStyles = SIZE_STYLES[size];

  const resolvedActiveIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(rooms.length - 1, 0),
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  // Edge fades signal that the room list is horizontally scrollable, so a
  // partially-visible room no longer looks "cut off" on narrow screens.
  const [edgeFade, setEdgeFade] = useState({ left: false, right: false });

  const syncEdgeFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setEdgeFade({
      left: scrollLeft > 1,
      right: scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncEdgeFade();
    el.addEventListener("scroll", syncEdgeFade, { passive: true });
    window.addEventListener("resize", syncEdgeFade);
    return () => {
      el.removeEventListener("scroll", syncEdgeFade);
      window.removeEventListener("resize", syncEdgeFade);
    };
  }, [syncEdgeFade, rooms.length]);

  // Keep the selected room in view when it changes (without scrolling the page).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>('[data-active="true"]');
    if (activeBtn) {
      const containerRect = el.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const delta =
        btnRect.left -
        containerRect.left -
        (el.clientWidth - activeBtn.clientWidth) / 2;
      el.scrollTo({ left: Math.max(0, el.scrollLeft + delta) });
    }
    syncEdgeFade();
  }, [resolvedActiveIndex, syncEdgeFade]);

  const scrollFadeMask = `linear-gradient(to right, ${
    edgeFade.left ? "transparent 0, black 16px" : "black 0"
  }, ${
    edgeFade.right ? "black calc(100% - 16px), transparent 100%" : "black 100%"
  })`;

  if (!visible || rooms.length < minRooms) return null;

  return (
    <div
      className={cn(
        "z-[45] flex w-full justify-center px-3 py-2 sm:px-4",
        layout === "sticky" && "sticky",
        layout === "inline" && "relative",
        "animate-in fade-in slide-in-from-top-2 duration-300 ease-out",
        className,
      )}
      style={layout === "sticky" && stickyTop ? { top: stickyTop } : undefined}
    >
      <div
        className={cn(
          // Mobile: stack label above pills so 2 rooms fit without clipping.
          // sm+: keep the compact inline pill layout.
          "flex w-full max-w-[calc(100vw-1.5rem)] flex-col items-stretch rounded-2xl border border-gray-200/90 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.1)] sm:inline-flex sm:w-auto sm:flex-row sm:items-center sm:rounded-full",
          sizeStyles.bar,
          barClassName,
        )}
      >
        <span
          className={cn(
            "shrink-0 pl-0.5 font-semibold uppercase tracking-[0.22em] text-gray-400",
            sizeStyles.label,
          )}
        >
          {label}
        </span>

        <div
          ref={scrollRef}
          className={cn(
            "flex min-w-0 items-center overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            // With 2 rooms, share width evenly on mobile instead of truncating.
            rooms.length <= 2 && "w-full sm:w-auto",
            sizeStyles.group,
          )}
          style={{
            maskImage: scrollFadeMask,
            WebkitMaskImage: scrollFadeMask,
          }}
        >
          {rooms.map((room, index) => {
            const accent = getRoomFloatingAccent(index);
            const isActive = index === resolvedActiveIndex;
            const fitTwoOnMobile = rooms.length <= 2;

            return (
              <button
                key={room.key}
                type="button"
                onClick={() => onSelect(index)}
                title={room.label}
                aria-pressed={isActive}
                data-active={isActive}
                className={cn(
                  "flex items-center rounded-full font-semibold transition-all",
                  fitTwoOnMobile
                    ? "min-w-0 flex-1 justify-center sm:flex-none sm:shrink-0 sm:justify-start"
                    : "shrink-0",
                  sizeStyles.button,
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--checkout-brand-accent,#3b82f6)] focus-visible:ring-offset-2",
                  isActive
                    ? "bg-[color:var(--checkout-brand-primary,oklch(0.208_0.042_265.755))] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full",
                    sizeStyles.dot,
                    accent.dot,
                    isActive && "ring-2 ring-white/30",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "truncate",
                    fitTwoOnMobile
                      ? "max-w-full sm:max-w-[9rem]"
                      : "max-w-[7.5rem] sm:max-w-[9rem]",
                  )}
                >
                  {room.label}
                </span>
              </button>
            );
          })}
        </div>

        {addRoomHref ? (
          <Link
            href={addRoomHref}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 sm:px-3 sm:text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden min-[400px]:inline">{addRoomLabel}</span>
          </Link>
        ) : null}

        {trailing}
      </div>
    </div>
  );
}
