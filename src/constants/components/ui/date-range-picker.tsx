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
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(date);
  const isSm = useMediaQuery("(min-width: 640px)");

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

  // Disable future dates if enabled
  const disabledDates = React.useMemo(() => {
    if (!disableFutureDates) return undefined;
    
    const today = endOfDay(new Date());
    return (date: Date) => isAfter(date, today);
  }, [disableFutureDates]);

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
          className="w-auto p-0 max-w-[min(calc(100vw-2rem),22rem)] sm:max-w-none"
          align="start"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedInCalendar?.from ?? date?.from}
            selected={selectedInCalendar}
            onSelect={handleSelect}
            numberOfMonths={isSm ? 2 : 1}
            disabled={disabledDates}
          />
          {showApplyButton && (
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
