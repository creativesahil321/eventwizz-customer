"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export type ApplicableDateRoomGroup = {
  key: string;
  locationName: string;
  eventName: string;
  eventId: number;
  roomId: number;
  roomName: string;
  dates: { id: number; date: string }[];
};

type LocationBucket = {
  locationName: string;
  events: {
    eventId: number;
    eventName: string;
    rooms: ApplicableDateRoomGroup[];
  }[];
};

interface ApplicableDatesPickerProps {
  groups: ApplicableDateRoomGroup[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export function ApplicableDatesPicker({
  groups,
  selectedIds,
  onChange,
}: ApplicableDatesPickerProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const tree = useMemo(() => {
    const locMap = new Map<string, LocationBucket>();
    for (const g of groups) {
      let loc = locMap.get(g.locationName);
      if (!loc) {
        loc = { locationName: g.locationName, events: [] };
        locMap.set(g.locationName, loc);
      }
      let ev = loc.events.find((e) => e.eventId === g.eventId);
      if (!ev) {
        ev = { eventId: g.eventId, eventName: g.eventName, rooms: [] };
        loc.events.push(ev);
      }
      ev.rooms.push(g);
    }
    return Array.from(locMap.values());
  }, [groups]);

  const allIds = useMemo(
    () => groups.flatMap((g) => g.dates.map((d) => d.id)),
    [groups]
  );

  // Only first location open; events stay closed until clicked
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const first = tree[0]?.locationName;
    return first ? new Set([`loc:${first}`]) : new Set();
  });

  const toggleOpen = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setRoomDates = (dateIds: number[], checked: boolean) => {
    if (checked) {
      const merged = new Set(selectedIds);
      dateIds.forEach((id) => merged.add(id));
      onChange(Array.from(merged));
      return;
    }
    const drop = new Set(dateIds);
    onChange(selectedIds.filter((id) => !drop.has(id)));
  };

  const toggleDate = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No dates available for the selected rooms.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {selectedIds.length}
          </span>{" "}
          of {allIds.length} dates selected
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onChange([...allIds])}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onChange([])}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="max-h-[min(460px,55vh)] space-y-2 overflow-y-auto rounded-lg border bg-slate-50/70 p-2">
        {tree.map((loc) => {
          const locKey = `loc:${loc.locationName}`;
          const locOpen = openKeys.has(locKey);
          const locDateIds = loc.events.flatMap((e) =>
            e.rooms.flatMap((r) => r.dates.map((d) => d.id))
          );
          const locSelected = locDateIds.filter((id) =>
            selectedSet.has(id)
          ).length;

          return (
            <div
              key={loc.locationName}
              className="overflow-hidden rounded-lg border border-[var(--color-primary)]/20 bg-white"
            >
              {/* LOCATION */}
              <button
                type="button"
                onClick={() => toggleOpen(locKey)}
                className="flex w-full items-center gap-2 bg-[var(--color-primary)]/12 px-3 py-2.5 text-left hover:bg-[var(--color-primary)]/18"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-[var(--color-primary)] transition-transform",
                    !locOpen && "-rotate-90"
                  )}
                />
                <MapPin className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#0F172A]">
                  {loc.locationName}
                </span>
                <span className="hidden shrink-0 text-[11px] text-slate-600 sm:inline">
                  {loc.events.length} event
                  {loc.events.length === 1 ? "" : "s"} · {locSelected}/
                  {locDateIds.length} dates
                </span>
              </button>

              {locOpen ? (
                <div className="space-y-1.5 border-t border-[var(--color-primary)]/10 p-2 pl-3">
                  {loc.events.map((ev) => {
                    const evKey = `ev:${loc.locationName}:${ev.eventId}`;
                    const evOpen = openKeys.has(evKey);
                    const evDateIds = ev.rooms.flatMap((r) =>
                      r.dates.map((d) => d.id)
                    );
                    const evSelected = evDateIds.filter((id) =>
                      selectedSet.has(id)
                    ).length;

                    return (
                      <div
                        key={ev.eventId}
                        className="overflow-hidden rounded-md border border-slate-200 bg-slate-50/80"
                      >
                        {/* EVENT */}
                        <button
                          type="button"
                          onClick={() => toggleOpen(evKey)}
                          className="flex w-full items-center gap-2 border-l-[3px] border-l-[var(--color-primary)] px-2.5 py-2 text-left hover:bg-white"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform",
                              !evOpen && "-rotate-90"
                            )}
                          />
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0F172A]">
                            {ev.eventName}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {ev.rooms.length} room
                            {ev.rooms.length === 1 ? "" : "s"} · {evSelected}/
                            {evDateIds.length}
                          </span>
                        </button>

                        {evOpen ? (
                          <div className="space-y-1.5 border-t bg-white p-2 pl-5">
                            {ev.rooms.map((room) => {
                              const roomIds = room.dates.map((d) => d.id);
                              const roomSelectedCount = roomIds.filter((id) =>
                                selectedSet.has(id)
                              ).length;
                              const allRoomSelected =
                                roomIds.length > 0 &&
                                roomSelectedCount === roomIds.length;
                              const someRoomSelected =
                                roomSelectedCount > 0 && !allRoomSelected;

                              return (
                                <div
                                  key={room.key}
                                  className="rounded-md border border-slate-150 border-slate-200 bg-white px-2.5 py-2"
                                >
                                  {/* ROOM — no badge, checkbox + name is enough */}
                                  <div className="mb-1.5 flex items-center gap-2">
                                    <Checkbox
                                      id={`room-all-${room.key}`}
                                      checked={
                                        allRoomSelected
                                          ? true
                                          : someRoomSelected
                                            ? "indeterminate"
                                            : false
                                      }
                                      onCheckedChange={(c) =>
                                        setRoomDates(roomIds, c === true)
                                      }
                                    />
                                    <label
                                      htmlFor={`room-all-${room.key}`}
                                      className="min-w-0 flex-1 cursor-pointer text-sm text-slate-800"
                                    >
                                      {room.roomName}
                                    </label>
                                    <span className="text-[11px] text-muted-foreground">
                                      {roomSelectedCount}/{roomIds.length}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 pl-6">
                                    {room.dates.map((item) => {
                                      const selected = selectedSet.has(item.id);
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() => toggleDate(item.id)}
                                          className={cn(
                                            "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                                            selected
                                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]"
                                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                          )}
                                        >
                                          {item.date}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
