"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { MenuBookingDate } from "../_lib/types";
import { Badge } from "@/components/ui/badge";

interface DateSwitcherProps {
  readonly dates: MenuBookingDate[];
  readonly selectedDateKey: string;
  readonly onDateChange: (dateKey: string) => void;
}

export default function DateSwitcher({
  dates,
  selectedDateKey,
  onDateChange,
}: Readonly<DateSwitcherProps>) {
  if (dates.length <= 1) {
    return null;
  }

  const selectedDate = dates.find((d) => d.date_key === selectedDateKey);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Event Date
        </span>
      </div>

      <Select value={selectedDateKey} onValueChange={onDateChange}>
        <SelectTrigger className="h-9 bg-white flex-1 min-w-0">
          <SelectValue placeholder="Select a date">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">
                {selectedDate?.date || "Select a date"}
              </span>
              {selectedDate && (
                <Badge
                  variant={
                    selectedDate.status === "confirmed"
                      ? "default"
                      : "secondary"
                  }
                  className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
                >
                  {selectedDate.status === "confirmed" ? (
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  ) : (
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                  )}
                  {selectedDate.status}
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {dates.map((date, index) => (
            <SelectItem key={date.date_key} value={date.date_key}>
              <div className="flex items-center gap-2 py-0.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {index + 1}
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-sm">{date.date}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {date.tables.length} Table
                      {date.tables.length > 1 ? "s" : ""}
                    </span>
                    <Badge
                      variant={
                        date.status === "confirmed" ? "default" : "secondary"
                      }
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {date.status === "confirmed" ? (
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {date.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
