"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Building2, CalendarIcon, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { EventsListRoomOption } from "@/services/vendor/events/type";

function formatDateLabel(raw: string): string {
  const d = new Date(raw + "T12:00:00");
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type EventOverviewFiltersProps = {
  selectedDate: string;
  onDateChange: (value: string) => void;
  availableDates: string[];
  roomFilter: string;
  onRoomFilterChange: (value: string) => void;
  availableRooms: EventsListRoomOption[];
  hasRoomEvents?: boolean;
  disabled?: boolean;
  onReset: () => void;
  hasActiveFilters: boolean;
};

export default function EventOverviewFilters({
  selectedDate,
  onDateChange,
  availableDates,
  roomFilter,
  onRoomFilterChange,
  availableRooms,
  hasRoomEvents = false,
  disabled = false,
  onReset,
  hasActiveFilters,
}: EventOverviewFiltersProps) {
  const [open, setOpen] = useState(false);

  const restrictToEnabledDates = availableDates.length > 0;
  const enabledDateSet = useMemo(
    () => (availableDates.length ? new Set(availableDates) : null),
    [availableDates],
  );

  const selected =
    selectedDate && selectedDate !== "all"
      ? parseISO(`${selectedDate}T12:00:00`)
      : undefined;

  const defaultMonth = useMemo(() => {
    if (selected && !Number.isNaN(selected.getTime())) return selected;
    if (availableDates[0]) return parseISO(`${availableDates[0]}T12:00:00`);
    return new Date();
  }, [selected, availableDates]);

  const isDateDisabled = (date: Date) => {
    if (!restrictToEnabledDates) return false;
    return !enabledDateSet?.has(format(date, "yyyy-MM-dd"));
  };

  const datesReady = !restrictToEnabledDates || availableDates.length > 0;

  const showRoomFilter =
    !!selectedDate &&
    selectedDate !== "all" &&
    hasRoomEvents === true &&
    availableRooms.length > 0;

  const handleClearDate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDateChange("all");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
      <div className="relative w-full md:w-[240px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full min-w-0 justify-start text-left font-normal pr-8",
                (!selectedDate || selectedDate === "all") &&
                  "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">
                {selectedDate && selectedDate !== "all"
                  ? formatDateLabel(selectedDate)
                  : "All dates"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-visible p-0 max-w-[min(calc(100vw-2rem),20rem)]"
            align="end"
          >
            {!datesReady ? (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground min-w-[280px]">
                Loading available dates…
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selected}
                defaultMonth={defaultMonth}
                onSelect={(date) => {
                  if (!date) return;
                  onDateChange(format(date, "yyyy-MM-dd"));
                  setOpen(false);
                }}
                disabled={isDateDisabled}
                initialFocus
              />
            )}
          </PopoverContent>
        </Popover>
        {selectedDate && selectedDate !== "all" && (
          <button
            type="button"
            onClick={handleClearDate}
            disabled={disabled}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-md",
              "flex items-center justify-center shrink-0",
              "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              "transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
            aria-label="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showRoomFilter && (
        <Select
          value={roomFilter}
          onValueChange={onRoomFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All halls" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All halls</SelectItem>
            {availableRooms.map((room) => (
              <SelectItem key={room.room_id} value={String(room.room_id)}>
                {room.room_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="w-full sm:w-auto shrink-0"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset filters
        </Button>
      )}
    </div>
  );
}
