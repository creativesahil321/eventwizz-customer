"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      navLayout="around"
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "rdp",
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "relative space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-7",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-0 top-0 z-30 h-7 w-7 bg-background p-0 opacity-80 shadow-sm hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-0 top-0 z-30 h-7 w-7 bg-background p-0 opacity-80 shadow-sm hover:opacity-100",
        ),
        month_grid: "w-full border-collapse mt-4",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([data-selected].day-range-end)]:rounded-r-md [&:has([data-selected].day-outside)]:bg-accent/50 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md focus-within:relative focus-within:z-10",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "day-range-end",
        selected:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)] hover:text-[var(--color-primary-foreground)] focus:bg-[var(--color-primary)] focus:text-[var(--color-primary-foreground)]",
        today:
          "bg-accent text-accent-foreground [&[aria-selected=true]]:bg-[var(--color-primary)] [&[aria-selected=true]]:text-[var(--color-primary-foreground)] [&[aria-selected=true]]:hover:bg-[var(--color-primary-hover)] [&[aria-selected=true]]:focus:bg-[var(--color-primary)]",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
