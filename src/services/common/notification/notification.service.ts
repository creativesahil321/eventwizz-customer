import { api } from "@/services/core/api-client";
import {
  NotificationFilters,
  NotificationResponse,
  NotificationStats,
} from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

type NotificationEndpoints = {
  STATS: string;
  MARK_AS_READ: string;
  MARK_AS_UNREAD: string;
  MARK_AS_READ_ALL: string;
  ALL: string;
};

export const notificationService = {
  /**
   * Fetch notifications with optional filters
   */
  getNotifications: async (
    filters: NotificationFilters = {}
  ): Promise<NotificationResponse> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<NotificationEndpoints>(
      "NOTIFICATIONS",
      role
    );

    return api.get<NotificationResponse>(endpoints.ALL, {
      params: filters,
      returnFullResponse: true,
    });
  },

  /**
   * Fetch notification statistics
   */
  getNotificationStats: async (): Promise<NotificationStats> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<NotificationEndpoints>(
      "NOTIFICATIONS",
      role
    );

    return api.get<NotificationStats>(endpoints.STATS);
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (id: number): Promise<boolean> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<NotificationEndpoints>(
      "NOTIFICATIONS",
      role
    );

    const url = endpoints.MARK_AS_READ.replace("{id}", id.toString());
    return api.get<boolean>(url);
  },

  /**
   * Mark notification as unread
   */
  markAsUnread: async (id: number): Promise<boolean> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<NotificationEndpoints>(
      "NOTIFICATIONS",
      role
    );

    const url = endpoints.MARK_AS_UNREAD.replace("{id}", id.toString());
    return api.get<boolean>(url);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<boolean> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<NotificationEndpoints>(
      "NOTIFICATIONS",
      role
    );

    return api.get<boolean>(endpoints.MARK_AS_READ_ALL);
  },
};
