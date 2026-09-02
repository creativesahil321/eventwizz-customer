"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCheck } from "lucide-react";
import { NotificationFilters } from "@/services/common/notification/type";
import { NOTIFICATION_STATUSES } from "../_lib/constants";

interface NotificationFiltersProps {
  filters: NotificationFilters;
  onChange: (filters: Partial<NotificationFilters>) => void;
  onMarkAllAsRead: () => void;
  unreadCount?: number;
  isMarkingAllAsRead?: boolean;
}

export function NotificationFiltersComponent({
  filters,
  onChange,
  onMarkAllAsRead,
  unreadCount = 0,
  isMarkingAllAsRead = false,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm whitespace-nowrap">Filter By</span>
          <Select
            value={filters.filter || "all"}
            onValueChange={(value) =>
              onChange({ filter: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {unreadCount > 0 && (
        <Button
          onClick={onMarkAllAsRead}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 whitespace-nowrap"
          disabled={isMarkingAllAsRead}
        >
          <CheckCheck className="h-4 w-4" />
          <span>Mark all as read</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {unreadCount}
            </span>
          )}
        </Button>
      )}
    </div>
  );
}
