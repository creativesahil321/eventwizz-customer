"use client";

import { useMemo, useState } from "react";
import { NotificationItemComponent } from "./notification-item";
import { Notification } from "@/services/common/notification/type";
import { EmptyPlaceholder } from "@/components/empty-placeholder";
import { Inbox } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { NotificationsListSkeleton } from "./skeleton-loader";
import { groupNotificationsByDate } from "../_lib/notification-ui";

interface NotificationListProps {
  notifications: Notification[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
  onViewDetails: (notification: Notification) => void;
  onMarkAsRead: (id: number, options?: { onSettled?: () => void }) => void;
  onMarkAsUnread: (id: number, options?: { onSettled?: () => void }) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isMutating?: boolean;
}

export function NotificationListComponent({
  notifications,
  meta,
  onViewDetails,
  onMarkAsRead,
  onMarkAsUnread,
  onPageChange,
  isLoading,
}: NotificationListProps) {
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications],
  );

  if (isLoading) {
    return <NotificationsListSkeleton />;
  }

  if (
    !notifications ||
    !Array.isArray(notifications) ||
    notifications.length === 0
  ) {
    return (
      <EmptyPlaceholder
        icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
        title="No notifications"
        description="You don't have any notifications at the moment."
      />
    );
  }

  return (
    <div className="space-y-6">
      {groupedNotifications.map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="flex items-center gap-3 px-0.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </h3>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {group.items.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {group.items.map((notification) => (
              <NotificationItemComponent
                key={notification.id}
                notification={notification}
                onViewDetails={onViewDetails}
                onMarkAsRead={(id) => {
                  setUpdatingId(id);
                  onMarkAsRead(id, { onSettled: () => setUpdatingId(null) });
                }}
                onMarkAsUnread={(id) => {
                  setUpdatingId(id);
                  onMarkAsUnread(id, { onSettled: () => setUpdatingId(null) });
                }}
                isUpdating={updatingId === notification.id}
              />
            ))}
          </div>
        </section>
      ))}

      {meta && meta.lastPage > 1 && (
        <Pagination className="mt-2">
          <PaginationContent>
            {meta.page > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(meta.page - 1)}
                  aria-label="Go to previous page"
                />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(1)}
                isActive={meta.page === 1}
              >
                1
              </PaginationLink>
            </PaginationItem>

            {meta.page > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {meta.page > 2 && (
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(meta.page - 1)}>
                  {meta.page - 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {meta.page !== 1 && meta.page !== meta.lastPage && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => onPageChange(meta.page)}
                  isActive
                >
                  {meta.page}
                </PaginationLink>
              </PaginationItem>
            )}

            {meta.page < meta.lastPage - 1 && (
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(meta.page + 1)}>
                  {meta.page + 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {meta.page < meta.lastPage - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {meta.lastPage !== 1 && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => onPageChange(meta.lastPage)}
                  isActive={meta.page === meta.lastPage}
                >
                  {meta.lastPage}
                </PaginationLink>
              </PaginationItem>
            )}

            {meta.page < meta.lastPage && (
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(meta.page + 1)}
                  aria-label="Go to next page"
                />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
