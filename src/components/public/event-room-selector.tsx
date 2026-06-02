"use client";

import { cn } from "@/lib/utils";
import type { PublicEventRoomRef } from "@/lib/resolve-public-event-room-slices";

const ROOM_ACCENTS = [
  {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/30",
    chip: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
  },
  {
    dot: "bg-sky-500",
    ring: "ring-sky-500/30",
    chip: "bg-sky-500/10 text-sky-800 dark:text-sky-100",
  },
  {
    dot: "bg-amber-500",
    ring: "ring-amber-500/30",
    chip: "bg-amber-500/10 text-amber-800 dark:text-amber-100",
  },
  {
    dot: "bg-rose-500",
    ring: "ring-rose-500/30",
    chip: "bg-rose-500/10 text-rose-800 dark:text-rose-100",
  },
  {
    dot: "bg-violet-500",
    ring: "ring-violet-500/30",
    chip: "bg-violet-500/10 text-violet-800 dark:text-violet-100",
  },
] as const;

/** Sticky site header height — room bar sits just below CommonHeader. */
export const PUBLIC_EVENT_HEADER_OFFSET = "4.5rem";

type EventRoomSelectorProps = {
  rooms: PublicEventRoomRef[];
  currentRoomIndex: number;
  onRoomChange: (index: number) => void;
  visible?: boolean;
  className?: string;
};

/** Room pill bar for the live event detail page (multi-room events). */
export function EventRoomSelector({
  rooms,
  currentRoomIndex,
  onRoomChange,
  visible = true,
  className,
}: EventRoomSelectorProps) {
  if (rooms.length < 2 || !visible) return null;

  const activeRoom = rooms[currentRoomIndex];

  return (
    <div
      className={cn(
        "sticky z-[45] mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6",
        "animate-in fade-in slide-in-from-top-2 duration-300 ease-out",
        className,
      )}
      style={{ top: PUBLIC_EVENT_HEADER_OFFSET }}
    >
      <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-text)]/10 bg-[color:var(--color-surface)]/95 px-4 py-1.5 shadow-md backdrop-blur-md">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
          ◉ Currently viewing
        </span>
        <span className="text-[color:var(--color-text-dimmed)]">·</span>
        <span className="max-w-[160px] truncate text-sm font-semibold text-[color:var(--color-text)]">
          {activeRoom?.name ?? `Room ${currentRoomIndex + 1}`}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-[color:var(--color-text)]/10 bg-[color:var(--color-surface)]/95 px-2 py-1.5 shadow-md backdrop-blur-md">
        {rooms.map((room, index) => {
          const accent = ROOM_ACCENTS[index % ROOM_ACCENTS.length];
          const isActive = index === currentRoomIndex;
          return (
            <button
              key={`${room.room_id}-${index}`}
              type="button"
              onClick={() => onRoomChange(index)}
              title={room.name}
              aria-pressed={isActive}
              className={cn(
                "group flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]",
                isActive
                  ? cn(accent.chip, "ring-1", accent.ring)
                  : "text-[color:var(--color-text-dimmed)] hover:bg-[color:var(--color-text)]/[0.06] hover:text-[color:var(--color-text)]",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-transform",
                  accent.dot,
                  isActive && "scale-110",
                )}
                aria-hidden="true"
              />
              <span className="max-w-[100px] truncate">
                {room.name || `Room ${index + 1}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
