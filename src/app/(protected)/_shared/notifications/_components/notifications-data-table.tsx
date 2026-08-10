"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  NotificationFilters,
  Notification,
  UserRole,
} from "@/services/common/notification/type";
import {
  getNotificationFeedFilters,
  type NotificationFeedFilter,
} from "../_lib/constants";
import { NotificationListComponent } from "./notification-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCheck, Loader2, Search } from "lucide-react";
import { NotificationsListSkeleton } from "./skeleton-loader";
import {
  ProtectedPageHeader,
  pageCardClassName,
} from "@/app/(protected)/_components/page-header-card";
import { cn } from "@/lib/utils";

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
  /** True only on the very first load (no data yet). */
  isLoading: boolean;
  /** True while search/filter/page is refetching with previous data still shown. */
  isListFetching?: boolean;
  userRole?: UserRole | string | null;
  unreadCount?: number;
  isMarkingAllAsRead?: boolean;
  onFilterChange: (filters: Partial<NotificationFilters>) => void;
  onPageChange: (page: number) => void;
  onViewDetails: (notification: Notification) => void;
  onMarkAsRead: (id: number, options?: { onSettled?: () => void }) => void;
  onMarkAsUnread: (id: number, options?: { onSettled?: () => void }) => void;
  onMarkAllAsRead: () => void;
}

function getActiveFeedFilterId(
  filters: NotificationFilters,
  feedFilters: NotificationFeedFilter[],
): string {
  if (!filters.filter) return "all";
  const match = feedFilters.find((item) => item.filter === filters.filter);
  return match?.id ?? "all";
}

export function NotificationsDataTable({
  notifications,
  meta,
  filters,
  isLoading,
  isListFetching = false,
  userRole,
  unreadCount = 0,
  isMarkingAllAsRead = false,
  onFilterChange,
  onPageChange,
  onViewDetails,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAllAsRead,
}: NotificationsDataTableProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const feedFilters = useMemo(
    () => getNotificationFeedFilters(userRole),
    [userRole],
  );
  const activeFilterId = useMemo(
    () => getActiveFeedFilterId(filters, feedFilters),
    [filters, feedFilters],
  );

  // Debounce search → API `search` query param
  useEffect(() => {
    const trimmed = searchInput.trim();
    const current = (filters.search ?? "").trim();
    if (trimmed === current) return;

    const timer = window.setTimeout(() => {
      onFilterChange({ search: trimmed || undefined });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, filters.search, onFilterChange]);

  const handleFeedFilterClick = (filterId: string) => {
    const selected = feedFilters.find((item) => item.id === filterId);
    if (!selected) return;

    onFilterChange({
      filter: selected.filter,
    });
  };

  return (
    <section className="relative w-full min-w-0 space-y-4 text-black sm:space-y-6">
      <ProtectedPageHeader
        title="Notifications"
        description="Alerts and activity for your account."
        locationScope="all-locations"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="event-primary"
              size="sm"
              className="h-10 w-full sm:w-auto"
              onClick={onMarkAllAsRead}
              disabled={isMarkingAllAsRead}
            >
              {isMarkingAllAsRead ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCheck className="size-4" />
              )}
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className={pageCardClassName("space-y-5")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search bookings, tickets, references..."
              className="h-11 rounded-xl border-[var(--color-border)] bg-muted/30 pl-10 shadow-none focus-visible:ring-[var(--color-primary)]/30"
            />
            {isListFetching ? (
              <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {feedFilters.map((filter) => {
              const isActive = activeFilterId === filter.id;
              const showUnreadBadge =
                filter.id === "unread" && unreadCount > 0;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => handleFeedFilterClick(filter.id)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-[color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]"
                      : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {filter.label}
                  {showUnreadBadge ? (
                    <span
                      className={cn(
                        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        isActive
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground,#fff)]"
                          : "bg-background text-foreground",
                      )}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <NotificationsListSkeleton />
        ) : safeNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-10 text-center text-sm text-muted-foreground">
            No notifications found. Try adjusting your filters.
          </div>
        ) : (
          <div
            className={cn(
              "transition-opacity duration-150",
              isListFetching ? "opacity-60" : "opacity-100",
            )}
          >
            <NotificationListComponent
              notifications={safeNotifications}
              meta={meta}
              onViewDetails={onViewDetails}
              onMarkAsRead={onMarkAsRead}
              onMarkAsUnread={onMarkAsUnread}
              onPageChange={onPageChange}
              isLoading={false}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default React.memo(NotificationsDataTable);
