"use client";

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

interface NotificationListProps {
  notifications: Notification[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
  onViewDetails: (notification: Notification) => void;
  onMarkAsRead: (id: number) => void;
  onMarkAsUnread: (id: number) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
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
  // If loading, show a skeleton
  if (isLoading) {
    return <NotificationsListSkeleton />;
  }

  // If no notifications or invalid data, show empty state
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
    <div className="space-y-4">
      <div className="border rounded-md overflow-hidden">
        {notifications.map((notification) => (
          <NotificationItemComponent
            key={notification.id}
            notification={notification}
            onViewDetails={onViewDetails}
            onMarkAsRead={onMarkAsRead}
            onMarkAsUnread={onMarkAsUnread}
          />
        ))}
      </div>

      {/* Pagination */}
      {meta && meta.lastPage > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            {meta.page > 1 && (
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(meta.page - 1)}
                  aria-label="Go to previous page"
                />
              </PaginationItem>
            )}

            {/* First page */}
            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(1)}
                isActive={meta.page === 1}
              >
                1
              </PaginationLink>
            </PaginationItem>

            {/* Ellipsis if needed */}
            {meta.page > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Pages before current */}
            {meta.page > 2 && (
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(meta.page - 1)}>
                  {meta.page - 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Current page (if not first or last) */}
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

            {/* Pages after current */}
            {meta.page < meta.lastPage - 1 && (
              <PaginationItem>
                <PaginationLink onClick={() => onPageChange(meta.page + 1)}>
                  {meta.page + 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Ellipsis if needed */}
            {meta.page < meta.lastPage - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Last page (if not first) */}
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
