"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  isRoomSectionComplete,
  useRoomManager,
  type RoomSection,
} from "./use-room-manager";
import { roomNamePlaceholder, unnamedRoomLabel } from "@/lib/room-name-examples";

const ROOM_ACCENTS = [
  "bg-emerald-400",
  "bg-sky-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
] as const;

interface RoomTabBarProps {
  /**
   * Which wizard section is currently rendered. Used to drive the per-tab "complete" check
   * (one tick per section that has been approved). Pass `undefined` to skip per-section ticks
   * and only render the room name.
   */
  section?: RoomSection;
  className?: string;
}

/**
 * Tab strip at the top of Steps 4–7 when multi-space mode is on.
 *
 * Visual model (mirrors the reference UI):
 *  - Each room is a tab; the active room is filled, others are subtle.
 *  - A tab shows a green check when the current section has been approved for that room, so
 *    users can see at a glance which rooms still need this section completed.
 *  - "+ Add Room" sits at the end of the strip and is hidden once {@link MAX_ROOMS} is reached.
 *  - Inline rename via pencil icon, delete via trash icon (with confirmation).
 *
 * State lives in {@link useRoomManager} (RHF); this component is a controlled view.
 */
export function RoomTabBar({ section, className }: RoomTabBarProps) {
  const {
    rooms,
    currentRoomIndex,
    canAddRoom,
    setCurrentRoomIndex,
    addRoom,
    removeRoom,
    renameRoom,
    isRoomComplete,
  } = useRoomManager();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
    null,
  );
  const [newRoomName, setNewRoomName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canManageRooms = section === "package";
  const canSubmitNewRoom = newRoomName.trim().length > 0;

  useEffect(() => {
    if (editingIndex !== null) {
      // Defer focus to next frame so the input is mounted before we focus.
      const id = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [editingIndex]);

  useEffect(() => {
    if (!canManageRooms) {
      setEditingIndex(null);
      setPendingDeleteIndex(null);
    }
  }, [canManageRooms]);

  const beginEdit = (index: number, name: string) => {
    setEditingIndex(index);
    setEditingValue(name);
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (trimmed) renameRoom(editingIndex, trimmed);
    setEditingIndex(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const completedCount = section
    ? rooms.filter((room) => isRoomSectionComplete(room, section)).length
    : rooms.filter((r) => Boolean(r.id)).length;
  const pendingDeleteRoomName =
    pendingDeleteIndex !== null
      ? String(rooms[pendingDeleteIndex]?.name || "").trim()
      : "";

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-900/40 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm",
          className,
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            Per-room data
          </span>
          {rooms.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
              <Check className="h-3 w-3" aria-hidden />
              {completedCount} of {rooms.length} complete
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {rooms.map((room, index) => {
            const isActive = index === currentRoomIndex;
            const isEditing = editingIndex === index;
            const sectionApproved = section
              ? isRoomSectionComplete(room, section)
              : false;
            const roomAccent = ROOM_ACCENTS[index % ROOM_ACCENTS.length];

            return (
              <div
                key={`${room.id ?? "new"}-${index}`}
                className={cn(
                  "group flex h-10 items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200",
                  isActive
                    ? "border-emerald-300/35 bg-slate-950/95 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.22)]"
                    : "border-white/12 bg-white/[0.03] text-slate-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.08]",
                )}
              >
                {section && sectionApproved ? (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                    aria-label="Section complete"
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      isActive ? roomAccent : "bg-slate-500",
                    )}
                    aria-hidden="true"
                  />
                )}

                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    maxLength={40}
                    className="w-[120px] bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    placeholder={roomNamePlaceholder(index)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentRoomIndex(index)}
                    className={cn(
                      "truncate text-left font-medium tracking-[0.01em]",
                      canManageRooms ? "max-w-[110px]" : "max-w-[140px]",
                    )}
                    title={room.name}
                  >
                    {room.name || unnamedRoomLabel()}
                  </button>
                )}

                {!isEditing && canManageRooms && (
                  <span
                    className={cn(
                      "flex items-center gap-1 transition-opacity",
                      // Touch/mobile: keep actions visible (no reliable hover).
                      "opacity-100",
                      // Desktop: keep current clean look with hover reveal.
                      "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => beginEdit(index, room.name)}
                      title="Rename room"
                      aria-label="Rename room"
                      className="min-h-7 min-w-7 rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {rooms.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteIndex(index)}
                        title="Remove room"
                        aria-label="Remove room"
                        className="min-h-7 min-w-7 rounded-full p-1.5 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                )}

                {isEditing && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent the input's blur from firing first and committing.
                      e.preventDefault();
                      cancelEdit();
                    }}
                    className="rounded p-1 text-slate-400 hover:text-white"
                    aria-label="Cancel rename"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {canManageRooms && canAddRoom && (
            <div className="flex h-10 items-center gap-2 rounded-full border border-white/20 bg-slate-950/80 px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!canSubmitNewRoom) return;
                    addRoom(newRoomName.trim());
                    setNewRoomName("");
                  }
                }}
                placeholder={roomNamePlaceholder(rooms.length)}
                maxLength={40}
                className="h-7 w-[150px] border-0 bg-transparent px-1 text-xs text-white outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={!canSubmitNewRoom}
                onClick={() => {
                  if (!canSubmitNewRoom) return;
                  addRoom(newRoomName.trim());
                  setNewRoomName("");
                }}
                className={cn(
                  "rounded-full px-2 py-1 text-sm font-semibold transition-colors",
                  canSubmitNewRoom
                    ? "text-[var(--color-primary,#22d3ee)] hover:bg-white/10 hover:text-[var(--color-primary,#67e8f9)]"
                    : "cursor-not-allowed text-slate-400",
                )}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingDeleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this room?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteRoomName ? `"${pendingDeleteRoomName}"` : "This room"}{" "}
              and all its data (package, dates, catering, other packages,
              brochure) will be removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600"
              onClick={() => {
                if (pendingDeleteIndex !== null) removeRoom(pendingDeleteIndex);
                setPendingDeleteIndex(null);
              }}
            >
              Remove room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
