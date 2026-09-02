"use client";

import { Building2, RotateCcw } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type {
  EventsListCategoryOption,
  EventsListRoomOption,
} from "@/services/vendor/events/type";

type EventListFiltersProps = {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  /** YYYY-MM-DD values; `undefined` while filter meta is still loading */
  availableDates: string[] | undefined;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  availableCategories: EventsListCategoryOption[];
  roomFilter: string;
  onRoomFilterChange: (value: string) => void;
  availableRooms: EventsListRoomOption[];
  hasRoomEvents?: boolean;
  disabled?: boolean;
  onReset: () => void;
  hasActiveFilters: boolean;
};

export default function EventListFilters({
  dateRange,
  onDateRangeChange,
  availableDates,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
  roomFilter,
  onRoomFilterChange,
  availableRooms,
  hasRoomEvents = false,
  disabled = false,
  onReset,
  hasActiveFilters,
}: EventListFiltersProps) {
  const showRoomFilter =
    !!dateRange?.from &&
    hasRoomEvents === true &&
    availableRooms.length > 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px]">
        <DateRangePicker
          date={dateRange}
          onDateChange={onDateRangeChange}
          placeholder="Filter by date range"
          disabled={disabled}
          showClear
          disableFutureDates={false}
          enabledDates={availableDates}
          restrictToEnabledDates
        />
      </div>

      <Select
        value={categoryFilter}
        onValueChange={onCategoryFilterChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full min-w-0 sm:w-[220px]">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {availableCategories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showRoomFilter && (
        <Select
          value={roomFilter}
          onValueChange={onRoomFilterChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full min-w-0 sm:w-[200px]">
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
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset filters
        </Button>
      )}
    </div>
  );
}
