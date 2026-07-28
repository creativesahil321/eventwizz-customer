"use client";

import { useState, useCallback } from "react";
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
    isFetching: isFetchingNotifications,
    isPending: isPendingNotifications,
    refetch: refetchNotifications,
  } = useNotifications(filters);

  const { data: stats } = useNotificationStats();

  // Mutations
  const { mutate: markAsRead, isPending: isMarkingAsRead } = useMarkAsRead();
  const { mutate: markAsUnread, isPending: isMarkingAsUnread } =
    useMarkAsUnread();
  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } =
    useMarkAllAsRead();

  // Derived state — API returns { data: { data: [], meta } } with returnFullResponse
  const pagePayload = notificationsResponse?.data;
  const notifications = Array.isArray(pagePayload)
    ? pagePayload
    : Array.isArray(pagePayload?.data)
      ? pagePayload.data
      : [];

  const meta = Array.isArray(pagePayload) ? undefined : pagePayload?.meta;
  // Initial load only — never treat search/filter refetches as a full-page load
  const isInitialLoading =
    (isPendingNotifications || isLoadingNotifications) &&
    !notificationsResponse;
  const isListFetching = isFetchingNotifications && !isInitialLoading;
  const isPending = isMarkingAsRead || isMarkingAsUnread || isMarkingAllAsRead;

  const handleFilterChange = useCallback(
    (newFilters: Partial<NotificationFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

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
    filters,
    notifications,
    meta,
    stats,
    selectedNotification,
    isDetailsOpen,
    isLoading: isInitialLoading,
    isListFetching,
    isPending,
    isMarkingAllAsRead,
    userRole,
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
