"use client";

import { cn } from "@/lib/utils";
import { useRoomManager } from "./use-room-manager";

/**
 * Stable per-room accent color so the dot next to each room name is consistent across the
 * form tabs and the preview pill bar. We pick from a small curated palette by index so the
 * first room is always green, the second blue, etc. — matches the reference UI vibe.
 */
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

interface PreviewRoomFloatingSelectorProps {
  /**
   * Optional className for the outer container so the host can adjust positioning.
   * Defaults to a sticky-position pill at the top of the preview column.
   */
  className?: string;
  /**
   * Controls whether the bar is shown. The host (form preview) computes this from a scroll
   * trigger (e.g. "user has scrolled past the timeline") so the bar fades in smoothly
   * instead of being visible from the top of the page.
   * Defaults to `true` for backwards compatibility.
   */
  visible?: boolean;
}

/**
 * Floating room selector that lives inside the live preview column.
 *
 * Behaviour:
 *  - Renders nothing when multi-space mode is off (preview shows the single-room layout).
 *  - When on, displays a sticky pill bar:
 *     • a "CURRENTLY VIEWING · {room name}" label on the left (matches the reference site)
 *     • clickable room dots on the right that switch the active room
 *  - Clicking a room dot updates `multiSpace.currentRoomIndex`, which both Step 4–7 forms
 *    AND the preview already react to — so the entire experience switches in sync.
 *
 * This is purely a *view* of the same `useRoomManager` state used by the form-side tab bar,
 * so the two stay perfectly synchronised by construction (no extra wiring needed).
 */
export function PreviewRoomFloatingSelector({
  className,
  visible = true,
}: PreviewRoomFloatingSelectorProps) {
  const { enabled, rooms, currentRoomIndex, setCurrentRoomIndex } =
    useRoomManager();

  if (!enabled || rooms.length === 0) return null;

  const activeRoom = rooms[currentRoomIndex];

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "absolute inset-x-0 top-[62px] z-40 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6",
        "pointer-events-none transition-all duration-300 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-1.5 backdrop-blur-md shadow-lg",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
          ◉ Currently viewing
        </span>
        <span className="text-slate-400">·</span>
        <span className="max-w-[160px] truncate text-sm font-semibold text-white">
          {activeRoom?.name ?? `Room ${currentRoomIndex + 1}`}
        </span>
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1.5 backdrop-blur-md shadow-lg",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {rooms.map((room, index) => {
          const accent = ROOM_ACCENTS[index % ROOM_ACCENTS.length];
          const isActive = index === currentRoomIndex;
          return (
            <button
              key={`${room.id ?? "new"}-${index}`}
              type="button"
              onClick={() => setCurrentRoomIndex(index)}
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
