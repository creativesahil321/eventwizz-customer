"use client";

import { useNotificationSystem } from "./_lib/hooks";
import {
  NotificationDetailsComponent,
  NotificationsDataTable,
} from "./_components";

export default function NotificationsPage() {
  const {
    filters,
    notifications,
    meta,
    stats,
    selectedNotification,
    isDetailsOpen,
    isLoading,
    handleFilterChange,
    handlePageChange,
    handleViewDetails,
    handleCloseDetails,
    handleMarkAsRead,
    handleMarkAsUnread,
    handleMarkAllAsRead,
  } = useNotificationSystem();

  // Convert the API meta format to the expected format for the component
  const formattedMeta = meta
    ? {
        total: meta.total,
        page: meta.current_page,
        limit: meta.per_page,
        lastPage: meta.last_page,
      }
    : undefined;

  return (
    <section className="page max-w-full overflow-x-hidden">
      <NotificationsDataTable
        notifications={notifications}
        meta={formattedMeta}
        stats={stats}
        filters={filters}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        onViewDetails={handleViewDetails}
        onMarkAsRead={handleMarkAsRead}
        onMarkAsUnread={handleMarkAsUnread}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      <NotificationDetailsComponent
        notification={selectedNotification}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        onMarkAsRead={handleMarkAsRead}
        onMarkAsUnread={handleMarkAsUnread}
      />
    </section>
  );
}
