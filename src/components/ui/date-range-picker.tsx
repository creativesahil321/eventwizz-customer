"use client";

import * as React from "react";
import { format, endOfDay, isAfter } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";

interface DateRangePickerProps {
  /**
   * The selected date range (committed/applied value)
   */
  date?: DateRange;
  /**
   * Callback when date range changes (or when Apply is clicked if showApplyButton)
   */
  onDateChange?: (date: DateRange | undefined) => void;
  /**
   * Placeholder text when no date is selected
   */
  placeholder?: string;
  /**
   * Whether the date picker is disabled
   */
  disabled?: boolean;
  /**
   * Additional class names
   */
  className?: string;
  /**
   * Show clear button
   */
  showClear?: boolean;
  /**
   * Show Apply button inside popover; selection is applied only on Apply click
   */
  showApplyButton?: boolean;
  /**
   * Disable future dates (default: true)
   */
  disableFutureDates?: boolean;
  /**
   * When set, only these YYYY-MM-DD values are selectable on the calendar.
   */
  enabledDates?: string[];
  /**
   * When true, only enabledDates are selectable. While enabledDates is still
   * empty (e.g. API loading), every day stays disabled to avoid a flash of
   * all dates appearing clickable.
   */
  restrictToEnabledDates?: boolean;
}

export function DateRangePicker({
  date,
  onDateChange,
  placeholder = "Pick a date range",
  disabled = false,
  className,
  showClear = true,
  showApplyButton = false,
  disableFutureDates = true,
  enabledDates,
  restrictToEnabledDates = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(date);
  const isSm = useMediaQuery("(min-width: 640px)");

  const enabledDateSet = React.useMemo(
    () => (enabledDates?.length ? new Set(enabledDates) : null),
    [enabledDates],
  );

  const datesReady =
    !restrictToEnabledDates || (enabledDates !== undefined && enabledDates.length > 0);

  const defaultMonth = React.useMemo(() => {
    if (date?.from) return date.from;
    if (enabledDates?.[0]) {
      const parsed = new Date(`${enabledDates[0]}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }, [date?.from, enabledDates]);

  React.useEffect(() => {
    if (open) setPendingRange(date);
  }, [open, date?.from, date?.to]);

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDateChange?.(undefined);
    setPendingRange(undefined);
  };

  const handleSelect = (range: DateRange | undefined) => {
    if (showApplyButton) {
      setPendingRange(range);
    } else {
      onDateChange?.(range);
    }
  };

  const handleApply = () => {
    if (pendingRange?.from && pendingRange?.to) {
      onDateChange?.({ from: pendingRange.from, to: pendingRange.to });
    } else {
      onDateChange?.(pendingRange);
    }
    setOpen(false);
  };

  const displayDate = date;
  const selectedInCalendar = showApplyButton ? pendingRange : date;

  // Disable dates outside enabledDates and/or future dates
  const disabledDates = React.useMemo(() => {
    const today = endOfDay(new Date());

    return (day: Date) => {
      if (restrictToEnabledDates) {
        if (!enabledDateSet) return true;
        return !enabledDateSet.has(format(day, "yyyy-MM-dd"));
      }
      if (enabledDateSet) {
        return !enabledDateSet.has(format(day, "yyyy-MM-dd"));
      }
      if (disableFutureDates) {
        return isAfter(day, today);
      }
      return false;
    };
  }, [enabledDateSet, disableFutureDates, restrictToEnabledDates]);

  return (
    <div className={cn("relative min-w-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full min-w-0 justify-start text-left font-normal pr-8",
              !displayDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {displayDate?.from ? (
                displayDate.to ? (
                  <>
                    {format(displayDate.from, "LLL dd, y")} -{" "}
                    {format(displayDate.to, "LLL dd, y")}
                  </>
                ) : (
                  format(displayDate.from, "LLL dd, y")
                )
              ) : (
                placeholder
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-visible p-0 max-w-[min(calc(100vw-2rem),22rem)] sm:max-w-none"
          align="start"
        >
          {!datesReady ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground min-w-[280px]">
              Loading available dates…
            </div>
          ) : (
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={defaultMonth}
              selected={selectedInCalendar}
              onSelect={handleSelect}
              numberOfMonths={isSm ? 2 : 1}
              disabled={disabledDates}
            />
          )}
          {showApplyButton && datesReady && (
            <div className="flex justify-end gap-2 p-3 border-t">
              <Button
                type="button"
                size="sm"
                variant="event-outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="event-primary"
                type="button"
                size="sm"
                onClick={handleApply}
                disabled={!pendingRange?.from || !pendingRange?.to}
              >
                Apply
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {showClear && displayDate?.from && (
        <button
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-md",
            "flex items-center justify-center shrink-0",
            "text-muted-foreground hover:text-foreground hover:bg-muted/80",
            "transition-colors",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          aria-label="Clear date range"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
