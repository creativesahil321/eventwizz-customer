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
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";

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
  /** Visual density. Default `sm` matches live phone chrome. */
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
    bar: "gap-2 px-3 py-2",
    label: "text-[10px] tracking-[0.18em]",
    group: "gap-1",
    button: "gap-1.5 px-2.5 py-1.5 text-xs leading-snug",
    dot: "h-2 w-2",
  },
  lg: {
    bar: "gap-2.5 px-3.5 py-2.5",
    label: "text-[11px] tracking-[0.18em]",
    group: "gap-1.5",
    button: "gap-1.5 px-3 py-2 text-sm leading-snug",
    dot: "h-2 w-2",
  },
} as const;

/**
 * Unified Lovable-style floating room bar:
 * compact white pill, “CHOOSE ROOM” label, colored dots, active room filled.
 * Always horizontal (matches live mobile) — never stacks into tall full-width chips.
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
  const narrowPreview = usePreviewNarrowLayout();
  const sizeStyles = SIZE_STYLES[narrowPreview ? "sm" : size];

  const resolvedActiveIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(rooms.length - 1, 0),
  );

  const scrollRef = useRef<HTMLDivElement>(null);
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
        "z-[45] flex w-full justify-center",
        narrowPreview ? "px-2.5 py-1.5" : "px-2.5 py-1.5 sm:px-4 sm:py-2",
        layout === "sticky" && "sticky",
        layout === "inline" && "relative",
        "animate-in fade-in slide-in-from-top-2 duration-300 ease-out",
        className,
      )}
      style={layout === "sticky" && stickyTop ? { top: stickyTop } : undefined}
    >
      <div
        className={cn(
          "inline-flex max-w-full items-center rounded-full border border-gray-200/90 bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
          sizeStyles.bar,
          barClassName,
        )}
      >
        <span
          className={cn(
            "shrink-0 pl-0.5 font-semibold uppercase text-gray-400",
            sizeStyles.label,
          )}
        >
          {label}
        </span>

        <div
          ref={scrollRef}
          className={cn(
            "flex min-w-0 items-center overflow-x-auto scroll-smooth",
            narrowPreview
              ? "max-w-[min(100%,20rem)]"
              : "max-w-[min(100%,20rem)] sm:max-w-[min(100%,28rem)]",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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

            return (
              <button
                key={room.key}
                type="button"
                onClick={() => onSelect(index)}
                title={room.label}
                aria-pressed={isActive}
                data-active={isActive}
                className={cn(
                  "flex shrink-0 items-center rounded-full font-medium transition-all",
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
                    narrowPreview ? "max-w-[6.5rem]" : "max-w-[6.5rem] sm:max-w-[8rem]",
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
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            <Plus className="h-3 w-3" />
            <span className="hidden min-[400px]:inline">{addRoomLabel}</span>
          </Link>
        ) : null}

        {trailing}
      </div>
    </div>
  );
}
