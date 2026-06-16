"use client";

import type { ReactNode } from "react";
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
  className?: string;
  barClassName?: string;
  trailing?: ReactNode;
  /** Dashed “Add room” link shown inside the bar when provided. */
  addRoomHref?: string;
  addRoomLabel?: string;
}

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
  className,
  barClassName,
  trailing,
  addRoomHref,
  addRoomLabel = "Add room",
}: FloatingRoomBarProps) {
  if (!visible || rooms.length < minRooms) return null;

  const resolvedActiveIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(rooms.length - 1, 0),
  );

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
          "inline-flex w-auto max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-gray-200/90 bg-white px-3 py-2 shadow-[0_8px_32px_rgba(15,23,42,0.1)] sm:gap-2.5 sm:px-4 sm:py-2.5",
          barClassName,
        )}
      >
        <span className="shrink-0 pl-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400 sm:text-[11px]">
          Room
        </span>

        <div className="flex items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3.5 sm:py-2 sm:text-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--checkout-brand-accent,#3b82f6)] focus-visible:ring-offset-2",
                  isActive
                    ? "bg-[color:var(--checkout-brand-primary,oklch(0.208_0.042_265.755))] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    accent.dot,
                    isActive && "ring-2 ring-white/30",
                  )}
                  aria-hidden="true"
                />
                <span className="max-w-[7.5rem] truncate sm:max-w-[9rem]">
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
