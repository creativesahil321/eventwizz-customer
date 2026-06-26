"use client";

import { useId } from "react";
import { OnboardingFieldGroupTitle } from "@/components/ui/typography";
import { useRoomManager, type RoomSection } from "./use-room-manager";
import { MultiSpaceToggle } from "./multi-space-toggle";
import { RoomTabBar } from "./room-tab-bar";

interface MultiSpaceHeaderProps {
  /**
   * The current wizard section. Used by the tab bar to render per-section completion ticks.
   * Step 4 also renders the Yes/No toggle by passing `showToggle`.
   */
  section: RoomSection;
  /** Render the "Multiple event spaces?" Yes/No toggle. Only Step 4 owns this control. */
  showToggle?: boolean;
}

/**
 * Per-step header for the multi-room system.
 *
 * Responsibilities:
 *  1. (Step 4 only) Render the "Multiple event spaces?" toggle so the vendor can opt in/out.
 *  2. When the toggle is on, render the room tab bar so the form below binds to the active room.
 *
 * If multi-space mode is off and `showToggle` is `false`, this component renders nothing —
 * which is exactly what we want on Steps 5/6/7 in single-room mode (zero visual change).
 */
export function MultiSpaceHeader({
  section,
  showToggle = false,
}: MultiSpaceHeaderProps) {
  const { enabled, setEnabled, rooms, roomsLoading, maxRooms } = useRoomManager();
  const labelId = useId();

  if (!enabled && !showToggle) return null;

  return (
    <div className="mb-6 space-y-4">
      {showToggle && (
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0" id={labelId}>
            <OnboardingFieldGroupTitle className="!mb-1 text-base">
              Multiple event spaces
            </OnboardingFieldGroupTitle>
            <p className="text-sm text-muted-foreground">
              Does your venue offer multiple distinct rooms or partitioned
              halls? Each room can have its own packages, dates, catering and
              brochure (up to {maxRooms} rooms).
            </p>
          </div>
          <MultiSpaceToggle
            value={enabled}
            onChange={setEnabled}
            labelId={labelId}
          />  
        </div>
      )}

      {enabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-slate-300">
              Switch tabs to fill in details for each room.
            </span>
          </div>
          {roomsLoading && rooms.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Per-room data
                </span>
                <span className="text-[11px] text-slate-500">Loading rooms…</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-8 w-28 rounded-full bg-white/[0.06]" />
                <div className="h-8 w-32 rounded-full bg-white/[0.06]" />
                <div className="h-8 w-24 rounded-full bg-white/[0.04]" />
              </div>
            </div>
          ) : (
            <RoomTabBar section={section} />
          )}
        </div>
      )}
    </div>
  );
}
