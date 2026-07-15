/**
 * Admin Support Tickets Service
 *
 * GET  /api/v1/admin/support-tickets/dashboard
 * GET  /api/v1/admin/support-tickets
 * GET  /api/v1/admin/support-tickets/{ticketKey}/messages
 * POST /api/v1/admin/support-tickets/{ticketKey}/messages/read
 * POST /api/v1/admin/support-tickets/pin/{ticketKey}
 * POST /api/v1/admin/support-tickets/assign/{ticketKey}
 * POST /api/v1/admin/support-tickets/close/{ticketKey}
 * POST /api/v1/admin/support-tickets/{ticketKey}/messages/store
 */

import { format, startOfDay } from "date-fns";
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { DashboardDateFilter } from "@/app/(protected)/admin/support/_lib/types";
import type {
  AdminSupportDashboardParams,
  AdminSupportDashboardResponse,
  AdminSupportDashboardTime,
  AdminSupportMessagesParams,
  AdminSupportMessagesResponse,
  AdminSupportQuickFilter,
  AdminSupportSort,
  AdminSupportTicketsParams,
  AdminSupportTicketsResponse,
  AdminSupportTimeFilter,
  AssignAdminSupportTicketPayload,
  AssignAdminSupportTicketResponse,
  CloseAdminSupportTicketPayload,
  CloseAdminSupportTicketResponse,
  MarkAdminSupportMessagesReadResponse,
  PinAdminSupportTicketPayload,
  PinAdminSupportTicketResponse,
  StoreAdminSupportMessagePayload,
  StoreAdminSupportMessageResponse,
} from "./type";

const PRESET_TO_API_TIME: Record<
  DashboardDateFilter["preset"],
  AdminSupportDashboardTime
> = {
  today: "today",
  "7d": "last_7_days",
  "30d": "last_30_days",
};

/**
 * Maps UI dashboard filter → API query params.
 * Presets: ?time=today|last_7_days|last_30_days
 * Custom:  ?from=yyyy-MM-dd&to=yyyy-MM-dd
 */
export function toAdminSupportDashboardParams(
  filter: DashboardDateFilter
): AdminSupportDashboardParams {
  if (filter.customRange?.from && filter.customRange?.to) {
    return {
      from: format(startOfDay(filter.customRange.from), "yyyy-MM-dd"),
      to: format(startOfDay(filter.customRange.to), "yyyy-MM-dd"),
    };
  }

  return {
    time: PRESET_TO_API_TIME[filter.preset] ?? "today",
  };
}

/** Maps inbox date presets to API `time` query values. */
export function mapAdminInboxDateToApiTime(
  date: "all" | "today" | "week" | "month"
): AdminSupportTimeFilter | undefined {
  if (date === "today") return "today";
  if (date === "week") return "last_7_days";
  if (date === "month") return "this_month";
  return undefined;
}

/** Maps UI sort → API sort (`oldest` → `oldest_first`). */
export function toAdminSupportApiSort(
  sort: "newest" | "oldest"
): AdminSupportSort {
  return sort === "oldest" ? "oldest_first" : "newest";
}

/**
 * Maps UI status filter → API `status` query value.
 * - Waiting for You → waiting_from_you
 * - Waiting for Vendor → waiting_vendor
 */
export function toAdminSupportApiStatus(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (
    normalized === "waiting_platform_support" ||
    normalized === "waiting_platform" ||
    normalized === "waiting_from_you"
  ) {
    return "waiting_from_you";
  }
  if (
    normalized === "waiting_general_support" ||
    normalized === "waiting_vendor"
  ) {
    return "waiting_vendor";
  }
  return normalized;
}

/** Maps source quick filter → API `filter` query value. */
export function toAdminSupportApiSourceFilter(
  source: "customer" | "vendor" | "all"
): AdminSupportQuickFilter | undefined {
  if (source === "vendor") return "vendor_tickets";
  if (source === "customer") return "customer_tickets";
  return undefined;
}

function buildListParams(
  params: AdminSupportTicketsParams
): Record<string, string | number> {
  const out: Record<string, string | number> = {};

  if (params.sort) out.sort = params.sort;

  const search = params.search?.trim();
  if (search) out.search = search;

  if (params.status) out.status = params.status;
  if (params.priority) out.priority = params.priority;

  if (params.filter) out.filter = params.filter;

  if (params.assign_to) out.assign_to = params.assign_to;

  if (params.venue_id) out.venue_id = params.venue_id;

  if (params.time && params.time !== "all") out.time = params.time;

  if (params.page != null) out.page = Math.max(1, params.page);
  if (params.per_page != null) {
    out.per_page = Math.min(100, Math.max(1, params.per_page));
  }

  return out;
}

export const adminSupportService = {
  getDashboard: async (
    params: AdminSupportDashboardParams = {}
  ): Promise<AdminSupportDashboardResponse> => {
    const query: Record<string, string> = {};
    if (params.time) query.time = params.time;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;

    return api.get<AdminSupportDashboardResponse>(
      API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.DASHBOARD,
      {
        params: Object.keys(query).length ? query : undefined,
        returnFullResponse: true,
      }
    );
  },

  getTickets: async (
    params: AdminSupportTicketsParams = {}
  ): Promise<AdminSupportTicketsResponse> => {
    const query = buildListParams(params);

    return api.get<AdminSupportTicketsResponse>(
      API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.LIST,
      {
        params: Object.keys(query).length ? query : undefined,
        returnFullResponse: true,
      }
    );
  },

  getMessages: async (
    ticketKey: string,
    params: AdminSupportMessagesParams = {}
  ): Promise<AdminSupportMessagesResponse> => {
    const endpoint = API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.MESSAGES.replace(
      "{ticketKey}",
      encodeURIComponent(ticketKey)
    );

    const query: Record<string, number> = {};
    if (params.page != null) query.page = Math.max(1, params.page);
    if (params.per_page != null) {
      query.per_page = Math.min(100, Math.max(1, params.per_page));
    }

    return api.get<AdminSupportMessagesResponse>(endpoint, {
      params: Object.keys(query).length ? query : { page: 1, per_page: 30 },
      returnFullResponse: true,
    });
  },

  markMessagesRead: async (
    ticketKey: string
  ): Promise<MarkAdminSupportMessagesReadResponse> => {
    const endpoint =
      API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.MARK_MESSAGES_READ.replace(
        "{ticketKey}",
        encodeURIComponent(ticketKey)
      );

    return api.post<MarkAdminSupportMessagesReadResponse>(
      endpoint,
      undefined,
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
        suppressErrorToast: true,
      }
    );
  },

  pinTicket: async (
    payload: PinAdminSupportTicketPayload
  ): Promise<PinAdminSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.PIN.replace(
      "{ticketKey}",
      encodeURIComponent(payload.ticketKey)
    );

    return api.post<PinAdminSupportTicketResponse>(
      endpoint,
      { is_pinned: payload.is_pinned },
      {
        returnFullResponse: true,
      }
    );
  },

  assignTicket: async (
    payload: AssignAdminSupportTicketPayload
  ): Promise<AssignAdminSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.ASSIGN.replace(
      "{ticketKey}",
      encodeURIComponent(payload.ticketKey)
    );

    return api.post<AssignAdminSupportTicketResponse>(
      endpoint,
      { staff_id: payload.staff_id },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
      }
    );
  },

  closeTicket: async (
    payload: CloseAdminSupportTicketPayload
  ): Promise<CloseAdminSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.CLOSE.replace(
      "{ticketKey}",
      encodeURIComponent(payload.ticketKey)
    );

    return api.post<CloseAdminSupportTicketResponse>(
      endpoint,
      { closed_reason: payload.closed_reason },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
      }
    );
  },

  storeMessage: async (
    payload: StoreAdminSupportMessagePayload
  ): Promise<StoreAdminSupportMessageResponse> => {
    const endpoint =
      API_ENDPOINTS.ADMIN.SUPPORT_TICKETS.STORE_MESSAGE.replace(
        "{ticketKey}",
        encodeURIComponent(payload.ticketKey)
      );

    const attachments = payload.attachments ?? [];
    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append("message", payload.message.trim());
      formData.append("is_internal", payload.is_internal ? "1" : "0");
      attachments.forEach((file) => {
        formData.append("attachments[]", file);
      });

      return api.post<StoreAdminSupportMessageResponse>(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        returnFullResponse: true,
        suppressSuccessToast: true,
      });
    }

    return api.post<StoreAdminSupportMessageResponse>(
      endpoint,
      {
        message: payload.message.trim(),
        is_internal: Boolean(payload.is_internal),
      },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
      }
    );
  },
};
