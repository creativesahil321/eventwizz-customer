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
import {
  ProtectedPageHeader,
  pageCardClassName,
} from "@/app/(protected)/_components/page-header-card";

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
  const hasFilters = filters.status && filters.status !== "all";
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  if (isLoading && safeNotifications.length === 0) {
    return <NotificationsTableSkeleton />;
  }

  return (
    <section className="relative w-full min-w-0 space-y-4 text-black sm:space-y-6">
      <ProtectedPageHeader
        title="Notifications"
        description="Stay updated with alerts and account activity"
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-medium text-muted-foreground sm:text-foreground">
                Filter by
              </span>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  onFilterChange({ status: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="h-10 w-full sm:w-[180px]">
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
                className="h-10 w-full sm:w-auto"
                onClick={() => onFilterChange({ status: undefined })}
              >
                Reset <X className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {safeNotifications.length === 0 && !isLoading ? (
        <div className={pageCardClassName("text-center text-muted-foreground")}>
          No notifications found. Try adjusting your filters.
        </div>
      ) : (
        <div className={pageCardClassName("overflow-hidden")}>
          <ScrollArea className="h-[calc(100dvh-24rem)] sm:h-[calc(100dvh-20rem)]">
            <div className="px-1 py-1 sm:px-2">
              <NotificationListComponent
                notifications={safeNotifications}
                meta={meta}
                onViewDetails={onViewDetails}
                onMarkAsRead={onMarkAsRead}
                onMarkAsUnread={onMarkAsUnread}
                onPageChange={onPageChange}
                isLoading={isLoading}
              />
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </section>
  );
}

export default React.memo(NotificationsDataTable);
