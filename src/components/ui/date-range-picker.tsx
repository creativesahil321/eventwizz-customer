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

interface DateRangePickerProps {
  /**
   * The selected date range
   */
  date?: DateRange;
  /**
   * Callback when date range changes
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
  disableFutureDates = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleClear = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDateChange?.(undefined);
  };

  // Disable future dates if enabled
  const disabledDates = React.useMemo(() => {
    if (!disableFutureDates) return undefined;
    
    const today = endOfDay(new Date());
    return (date: Date) => isAfter(date, today);
  }, [disableFutureDates]);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            disabled={disabledDates}
          />
        </PopoverContent>
      </Popover>
      {showClear && date?.from && (
        <button
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            "absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full",
            "flex items-center justify-center",
            "text-muted-foreground hover:text-foreground",
            "transition-colors",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          aria-label="Clear date range"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
