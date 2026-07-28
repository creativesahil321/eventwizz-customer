import { api } from "@/services/core/api-client";
import {
  NotificationFilters,
  NotificationResponse,
} from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

type NotificationEndpoints = {
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

    const params: Record<string, string | number> = {
      page: filters.page ?? 1,
      limit: filters.limit ?? 10,
    };
    if (filters.filter?.trim()) {
      params.filter = filters.filter.trim();
    }
    if (filters.search?.trim()) {
      params.search = filters.search.trim();
    }

    return api.get<NotificationResponse>(endpoints.ALL, {
      params,
      returnFullResponse: true,
    });
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
   * POST /{role}/notifications/mark-as-read-all  body: {}
   */
  markAllAsRead: async (): Promise<boolean> => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<NotificationEndpoints>(
      "NOTIFICATIONS",
      role
    );

    return api.post<boolean>(endpoints.MARK_AS_READ_ALL, {});
  },
};
