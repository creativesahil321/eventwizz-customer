"use client";

import { useState } from "react";
import {
  Notification,
  NotificationFilters,
} from "@/services/common/notification/type";
import {
  useNotifications,
  useNotificationStats,
  useMarkAsRead,
  useMarkAsUnread,
  useMarkAllAsRead,
} from "./queries";
import { useActiveRole } from "@/hooks/useUserRole";

export const useNotificationSystem = () => {
  const userRole = useActiveRole();

  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 10,
  });

  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Queries
  const {
    data: notificationsResponse,
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications,
  } = useNotifications(filters);

  const { data: stats } = useNotificationStats();

  // Mutations
  const { mutate: markAsRead, isPending: isMarkingAsRead } = useMarkAsRead();
  const { mutate: markAsUnread, isPending: isMarkingAsUnread } =
    useMarkAsUnread();
  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } =
    useMarkAllAsRead();

  // Derived state
  const notifications = Array.isArray(notificationsResponse?.data)
    ? notificationsResponse.data
    : [];

  const meta = notificationsResponse?.data?.meta;
  const isLoading = isLoadingNotifications;
  const isPending = isMarkingAsRead || isMarkingAsUnread || isMarkingAllAsRead;

  // Actions
  const handleFilterChange = (newFilters: Partial<NotificationFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedNotification(null);
  };

  const handleMarkAsRead = (
    id: number,
    options?: { onSettled?: () => void },
  ) => {
    markAsRead(id, {
      onSettled: () => {
        options?.onSettled?.();
      },
    });
  };

  const handleMarkAsUnread = (
    id: number,
    options?: { onSettled?: () => void },
  ) => {
    markAsUnread(id, {
      onSettled: () => {
        options?.onSettled?.();
      },
    });
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return {
    // State
    filters,
    notifications,
    meta,
    stats,
    selectedNotification,
    isDetailsOpen,
    isLoading,
    isPending,
    isMarkingAllAsRead,
    userRole,

    // Actions
    handleFilterChange,
    handlePageChange,
    handleViewDetails,
    handleCloseDetails,
    handleMarkAsRead,
    handleMarkAsUnread,
    handleMarkAllAsRead,
    refetchNotifications,
  };
};
