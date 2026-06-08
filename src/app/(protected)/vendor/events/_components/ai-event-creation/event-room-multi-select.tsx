"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { roomService } from "@/services/vendor/onboarding/room.service";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type VendorRoomOption = {
  id: number;
  name: string;
};

type EventRoomMultiSelectProps = {
  rooms: VendorRoomOption[];
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  loading?: boolean;
  minSelection?: number;
  maxSelection?: number;
  placeholder?: string;
  className?: string;
  /** `light` matches vendor event editor sidebar; default is AI dark theme. */
  variant?: "dark" | "light";
  /** When true, vendor can create a new venue room if fewer than max are selected. */
  allowCreate?: boolean;
  /** Called after a room is created on the server (refresh local room list). */
  onRoomCreated?: (room: VendorRoomOption) => void;
};

export function EventRoomMultiSelect({
  rooms,
  value,
  onChange,
  disabled = false,
  loading = false,
  minSelection = 2,
  maxSelection = 3,
  placeholder = "Choose rooms for this event",
  className,
  variant = "dark",
  allowCreate = true,
  onRoomCreated,
}: EventRoomMultiSelectProps) {
  const isLight = variant === "light";
  const [open, setOpen] = React.useState(false);
  const [newRoomName, setNewRoomName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const atMax = value.length >= maxSelection;
  const venueRoomCapReached = rooms.length >= maxSelection;
  const canCreateMore =
    allowCreate && !atMax && !venueRoomCapReached && !disabled && !loading;
  const canSubmitNewRoom = newRoomName.trim().length > 0 && !creating;
  const pickerDisabled =
    disabled || loading || (!allowCreate && rooms.length === 0);
  const selectedRooms = React.useMemo(
    () => rooms.filter((room) => value.includes(room.id)),
    [rooms, value],
  );
  const unselectedRooms = React.useMemo(
    () => rooms.filter((room) => !value.includes(room.id)),
    [rooms, value],
  );
  /**
   * Create only when under the venue room cap AND (catalog empty OR every
   * existing venue room is already selected for this event).
   */
  const showCreateForm =
    canCreateMore &&
    !venueRoomCapReached &&
    (rooms.length === 0 || unselectedRooms.length === 0);

  const triggerLabel = React.useMemo(() => {
    if (loading) return "Loading venue rooms…";
    if (value.length === 0) return placeholder;
    if (value.length === 1) return selectedRooms[0]?.name ?? "1 room selected";
    return selectedRooms.map((r) => r.name).join(", ");
  }, [loading, placeholder, selectedRooms, value.length]);

  const createSectionLabel = React.useMemo(() => {
    if (value.length === 0) {
      return `Create a venue room for this event (${minSelection}–${maxSelection} total)`;
    }
    return `Create another venue room (${value.length}/${maxSelection} selected)`;
  }, [maxSelection, minSelection, value.length]);

  const handleCreateRoom = async () => {
    const name = newRoomName.trim();
    if (!name || creating || atMax) return;

    if (rooms.length >= maxSelection) {
      toast.error(
        `You can have at most ${maxSelection} venue rooms. Select from your existing rooms for this event.`,
      );
      return;
    }

    setCreating(true);
    try {
      const res = await roomService.create({ name });
      const id = Number(res?.data?.id);
      const resolvedName = String(res?.data?.name ?? name).trim() || name;

      if (!Number.isFinite(id) || id <= 0) {
        console.error("Could not create venue room:", res);
        return;
      }

      const created: VendorRoomOption = { id, name: resolvedName };
      onRoomCreated?.(created);

      if (!value.includes(id)) {
        onChange([...value, id]);
      }

      setNewRoomName("");
    } catch (error) {
      console.error("Failed to create venue room:", error);
    } finally {
      setCreating(false);
    }
  };

  const toggleRoom = (id: number) => {
    if (value.includes(id)) {
      if (value.length <= minSelection) return;
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (atMax) return;
    onChange([...value, id]);
  };

  const createForm = showCreateForm ? (
    <div
      className={cn(
        "rounded-xl border p-2.5 space-y-2",
        isLight
          ? "border-[#D6ECEF] bg-[#F8FCFD]"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium",
          isLight ? "text-[#0B6A75]" : "text-slate-300",
        )}
      >
        {createSectionLabel}
      </p>
      <div className="flex gap-2">
        <Input
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreateRoom();
            }
          }}
          placeholder="New room name"
          maxLength={40}
          disabled={creating}
          className={cn(
            "h-9 flex-1 text-sm",
            isLight
              ? "border-[#D6ECEF] bg-white"
              : "border-white/15 bg-white/[0.06] text-white",
          )}
        />
        <Button
          type="button"
          size="sm"
          variant={isLight ? "event-primary" : "default"}
          disabled={!canSubmitNewRoom}
          className="h-9 shrink-0 gap-1 px-3"
          onClick={() => void handleCreateRoom()}
        >
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={pickerDisabled}
            className={cn(
              "h-11 w-full justify-between rounded-xl px-3.5 font-normal shadow-none",
              "focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary,#3b82f6)]/50",
              isLight
                ? "border-[#D6ECEF] bg-white text-[#0F172A] hover:border-[var(--color-primary)] hover:bg-white"
                : "border-white/12 bg-white/[0.06] text-slate-100 hover:border-white/20 hover:bg-white/[0.09] hover:text-white",
              value.length === 0 &&
                (isLight ? "text-muted-foreground" : "text-slate-500"),
            )}
          >
            <span className="truncate text-left text-sm">{triggerLabel}</span>
            <ChevronDown
              className={cn(
                "ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform",
                open && "rotate-180",
              )}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            "w-[var(--radix-popover-trigger-width)] p-0 shadow-lg",
            isLight
              ? "border border-[#D6ECEF] bg-white text-[#0F172A]"
              : "border border-white/12 bg-slate-900/95 text-slate-100 backdrop-blur-md",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div
            className={cn(
              "border-b px-3.5 py-2.5",
              isLight ? "border-[#D6ECEF]" : "border-white/10",
            )}
          >
            <p
              className={cn(
                "text-xs font-medium",
                isLight ? "text-[#0F172A]" : "text-slate-300",
              )}
            >
              Venue rooms
            </p>
            <p
              className={cn(
                "mt-0.5 text-[11px]",
                isLight ? "text-muted-foreground" : "text-slate-500",
              )}
            >
              Pick {minSelection}–{maxSelection} for this event
              {atMax
                ? " · maximum reached"
                : venueRoomCapReached && unselectedRooms.length > 0
                  ? ` · select ${unselectedRooms.map((r) => r.name).join(", ")}`
                  : value.length < minSelection
                    ? ` · select at least ${minSelection - value.length} more`
                    : unselectedRooms.length > 0
                      ? ` · select ${unselectedRooms.map((r) => r.name).join(", ")}`
                      : ` · create a new venue room below`}
            </p>
          </div>

          <ul className="max-h-[min(240px,45vh)] overflow-y-auto p-1.5">
            {rooms.length === 0 ? (
              <li
                className={cn(
                  "px-3 py-6 text-center text-sm",
                  isLight ? "text-muted-foreground" : "text-slate-500",
                )}
              >
                No venue rooms yet — use the form below to add one.
              </li>
            ) : (
              rooms.map((room) => {
                const checked = value.includes(room.id);
                const disableNew = !checked && atMax;
                const disableDeselect =
                  checked && value.length <= minSelection;
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      disabled={disableNew || disableDeselect}
                      onClick={() => toggleRoom(room.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        checked &&
                          (isLight
                            ? "bg-[#EAF7F8] text-[#0F172A]"
                            : "bg-[color:var(--color-primary,#3b82f6)]/18 text-white"),
                        !checked &&
                          (isLight
                            ? "text-[#0F172A] hover:bg-[#F4FAFB]"
                            : "text-slate-200 hover:bg-white/[0.06]"),
                        (disableNew || disableDeselect) &&
                          "cursor-not-allowed opacity-40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          checked
                            ? "border-[color:var(--color-primary,#3b82f6)] bg-[color:var(--color-primary,#3b82f6)] text-white"
                            : isLight
                              ? "border-[#D6ECEF] bg-white"
                              : "border-white/25 bg-transparent",
                        )}
                        aria-hidden
                      >
                        {checked ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {room.name}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>

      {createForm}

      {selectedRooms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedRooms.map((room) => (
            <span
              key={room.id}
              className={cn(
                "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                isLight
                  ? "border-[#D6ECEF] bg-[#EAF7F8] text-[#0B6A75]"
                  : "border-white/12 bg-white/[0.06] text-slate-200",
              )}
            >
              <span className="truncate">{room.name}</span>
            </span>
          ))}
        </div>
      ) : (
        <p
          className={cn(
            "text-[11px]",
            isLight ? "text-muted-foreground" : "text-slate-500",
          )}
        >
          {canCreateMore && !venueRoomCapReached
            ? rooms.length === 0
              ? `Create at least ${minSelection} venue rooms using the form above.`
              : unselectedRooms.length > 0
                ? `Select ${unselectedRooms.map((r) => r.name).join(" or ")} from the list to reach up to ${maxSelection} rooms for this event.`
                : `All venue rooms are selected — create another below if you need ${maxSelection} for this event.`
            : venueRoomCapReached
              ? value.length < maxSelection
                ? `You have ${maxSelection} venue rooms — select ${unselectedRooms.map((r) => r.name).join(" or ") || "from the list"} for this event (up to ${maxSelection}).`
                : `${maxSelection} rooms selected for this event.`
              : atMax
                ? `${maxSelection} rooms selected for this event.`
                : `Select at least ${minSelection} rooms for this event.`}
        </p>
      )}
    </div>
  );
}
