"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users } from "lucide-react";
import { BookingDate } from "./types";

interface DateSelectorProps {
  dates: BookingDate[];
  selectedDate: string;
  onDateChange: (dateId: string) => void;
}

export function DateSelector({
  dates,
  selectedDate,
  onDateChange,
}: DateSelectorProps) {
  const selectedDateData = dates.find((d) => d.id === selectedDate);
  const hasMultipleDates = dates.length > 1;

  // If only one date, just display it without dropdown
  if (!hasMultipleDates && selectedDateData) {
    return (
      <div className="space-y-2 pb-4 border-b">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calendar className="h-4 w-4" />
          Event Date
        </label>
        <div className="w-full h-12 px-3 border border-gray-200 rounded-lg bg-gray-50/50 flex items-center gap-3 transition-colors">
          <div className="p-1.5 rounded-md bg-blue-100 flex-shrink-0">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 truncate">
              {selectedDateData.date}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              <span>{selectedDateData.people} people</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple dates - show dropdown
  return (
    <div className="space-y-2 pb-4 border-b">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar className="h-4 w-4" />
        Select Event Date
      </label>
      <Select value={selectedDate} onValueChange={onDateChange}>
        <SelectTrigger className="group w-full h-12 px-3 border-2 border-transparent bg-gradient-to-r from-blue-50 to-purple-50/60 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:ring-2 focus:ring-offset-1 focus:ring-blue-300 cursor-pointer">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Calendar className="h-4 w-4 text-blue-600 group-hover:text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-gray-900 group-hover:text-[var(--color-primary)] transition-colors">
                  {selectedDateData?.date || "Select a date"}
                </div>
                {selectedDateData && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-[var(--color-primary)]">
                    <Users className="h-3 w-3 group-hover:text-[var(--color-primary)]" />
                    {selectedDateData.people} people
                  </div>
                )}
              </div>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent>
          {dates.map((date) => (
            <SelectItem key={date.id} value={date.id}>
              <div className="flex items-center justify-between w-full gap-4">
                <span className="font-medium">{date.date}</span>
                <Badge
                  variant="secondary"
                  className="rounded-full w-6 h-6 flex items-center justify-center p-0 text-xs"
                >
                  {date.people}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
