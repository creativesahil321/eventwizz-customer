"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { notificationService } from "@/services/common/notification/notification.service";
import {
  NotificationFilters,
  NotificationResponse,
  NotificationStats,
} from "@/services/common/notification/type";
import {
  profileKeys,
  useProfileData,
} from "@/app/(protected)/_shared/profile/_lib";
import { FRESHNESS } from "@/lib/query-freshness";

// Query keys
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters: NotificationFilters) =>
    [...notificationKeys.lists(), filters] as const,
};

function mapProfileNotificationStats(
  stats:
    | {
        total_notifications?: number;
        unread_notifications?: number;
        read_notifications?: number;
      }
    | null
    | undefined,
): NotificationStats {
  return {
    total: Number(stats?.total_notifications ?? 0),
    unread: Number(stats?.unread_notifications ?? 0),
    read: Number(stats?.read_notifications ?? 0),
  };
}

// Query hooks
export const useNotifications = (filters: NotificationFilters = {}) => {
  return useQuery<NotificationResponse>({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationService.getNotifications(filters),
    // Keep previous list visible while search/filter refetches — avoids full-page skeleton flash
    placeholderData: keepPreviousData,
    ...FRESHNESS.operational,
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/** Notification counts from the global profile API (no /notifications/stats). */
export const useNotificationStats = () => {
  const { data: session } = useSession();
  const userType = session?.user?.account_type ?? "vendor";
  const profileQuery = useProfileData({}, userType);

  const stats = useMemo(
    () => mapProfileNotificationStats(profileQuery.data?.data?.notification_stats),
    [profileQuery.data?.data?.notification_stats],
  );

  return {
    ...profileQuery,
    data: stats,
  };
};

function invalidateNotificationAndProfile(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
  // Counts live on profile now
  queryClient.invalidateQueries({ queryKey: profileKeys.all });
}

// Mutation hooks
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      invalidateNotificationAndProfile(queryClient);
    },
  });
};

export const useMarkAsUnread = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationService.markAsUnread(id),
    onSuccess: () => {
      invalidateNotificationAndProfile(queryClient);
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      invalidateNotificationAndProfile(queryClient);
    },
  });
};
