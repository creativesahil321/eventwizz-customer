"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import React from "react";
import {
  NotificationFilters,
  Notification,
} from "@/services/common/notification/type";
import { NOTIFICATION_STATUSES } from "../_lib/constants";
import { NotificationListComponent } from "./notification-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { NotificationsTableSkeleton } from "./skeleton-loader";

interface NotificationMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

interface NotificationsDataTableProps {
  notifications: Notification[];
  meta: NotificationMeta | undefined;
  filters: NotificationFilters;
  isLoading: boolean;
  onFilterChange: (filters: Partial<NotificationFilters>) => void;
  onPageChange: (page: number) => void;
  onViewDetails: (notification: Notification) => void;
  onMarkAsRead: (id: number, options?: { onSettled?: () => void }) => void;
  onMarkAsUnread: (id: number, options?: { onSettled?: () => void }) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationsDataTable({
  notifications,
  meta,
  filters,
  isLoading,
  onFilterChange,
  onPageChange,
  onViewDetails,
  onMarkAsRead,
  onMarkAsUnread,
}: NotificationsDataTableProps) {
  // Check if any filters are actually applied (not "all" or undefined)
  const hasFilters = filters.status && filters.status !== "all";

  // Ensure notifications is always an array
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  if (isLoading && safeNotifications.length === 0) {
    return <NotificationsTableSkeleton />;
  }

  return (
    <section className="w-full min-w-0 relative text-black">
      <div className="min-w-0 bg-white p-4 sm:p-6 rounded-md shadow-sm">
        <div className="flex items-center mb-4 sm:mb-6">
          <h1 className="text-2xl title-header font-bold">Notifications</h1>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium mb-1 sm:mb-0">Filter By</span>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFilterChange({ status: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="All Status" />
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

          {hasFilters && (
            <Button
              variant="event-outline"
              size="sm"
              className="h-9 w-full sm:w-auto mt-1 sm:mt-0 sm:self-end"
              onClick={() => onFilterChange({ status: undefined })}
            >
              Reset <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {safeNotifications.length === 0 && !isLoading ? (
        <div className="p-6 text-center text-gray-500 bg-white mt-2 rounded-md shadow-sm">
          No notifications found. Try adjusting your filters.
        </div>
      ) : (
        <div className="bg-white mt-2 rounded-md shadow-sm">
          <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-16rem)]">
            <NotificationListComponent
              notifications={safeNotifications}
              meta={meta}
              onViewDetails={onViewDetails}
              onMarkAsRead={onMarkAsRead}
              onMarkAsUnread={onMarkAsUnread}
              onPageChange={onPageChange}
              isLoading={isLoading}
            />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </section>
  );
}

export default React.memo(NotificationsDataTable);
