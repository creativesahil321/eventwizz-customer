"use client";

import { cn } from "@/lib/utils";
import { ONBOARDING_PREVIEW_HEADER_OFFSET } from "@/app/(on-boarding)/on-boarding/_components/form-preview/preview-layout-constants";
import type { VendorPreviewRoomRef } from "../_lib/resolve-vendor-preview-room-slices";

const ROOM_ACCENTS = [
  {
    dot: "bg-emerald-400",
    ring: "ring-emerald-400/40",
    chip: "bg-emerald-500/15 text-emerald-100",
  },
  {
    dot: "bg-sky-400",
    ring: "ring-sky-400/40",
    chip: "bg-sky-500/15 text-sky-100",
  },
  {
    dot: "bg-amber-400",
    ring: "ring-amber-400/40",
    chip: "bg-amber-500/15 text-amber-100",
  },
  {
    dot: "bg-rose-400",
    ring: "ring-rose-400/40",
    chip: "bg-rose-500/15 text-rose-100",
  },
  {
    dot: "bg-violet-400",
    ring: "ring-violet-400/40",
    chip: "bg-violet-500/15 text-violet-100",
  },
] as const;

type VendorPreviewRoomSelectorProps = {
  rooms: VendorPreviewRoomRef[];
  currentRoomIndex: number;
  onRoomChange: (index: number) => void;
  visible?: boolean;
  /** Sticky below site header (default). `inline` for full-page preview under chrome. */
  layout?: "sticky" | "inline";
  className?: string;
};

/** Room pill bar for vendor event preview (parity with onboarding `PreviewRoomFloatingSelector`). */
export function VendorPreviewRoomSelector({
  rooms,
  currentRoomIndex,
  onRoomChange,
  visible = true,
  layout = "sticky",
  className,
}: VendorPreviewRoomSelectorProps) {
  if (rooms.length < 2 || !visible) return null;

  const activeRoom = rooms[currentRoomIndex];

  return (
    <div
      className={cn(
        "z-[58] mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6",
        layout === "sticky" && "sticky",
        layout === "inline" &&
          "relative border-b border-white/10 bg-slate-950/90 shadow-md backdrop-blur-md",
        "animate-in fade-in slide-in-from-top-2 duration-300 ease-out",
        className,
      )}
      style={
        layout === "sticky"
          ? { top: ONBOARDING_PREVIEW_HEADER_OFFSET }
          : undefined
      }
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-1.5 backdrop-blur-md shadow-lg">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
          ◉ Currently viewing
        </span>
        <span className="text-slate-400">·</span>
        <span className="max-w-[160px] truncate text-sm font-semibold text-white">
          {activeRoom?.name ?? `Room ${currentRoomIndex + 1}`}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1.5 backdrop-blur-md shadow-lg">
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400",
                isActive
                  ? cn(accent.chip, "ring-1", accent.ring)
                  : "text-slate-300 hover:text-white hover:bg-white/[0.06]",
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
