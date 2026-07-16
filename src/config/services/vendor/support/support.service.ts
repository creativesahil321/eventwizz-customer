/**
 * Vendor Support Tickets Service
 *
 * GET  /api/v1/vendor/support-tickets/dashboard
 * GET  /api/v1/vendor/support-tickets
 * POST /api/v1/vendor/support-tickets/store
 * GET  /api/v1/vendor/support-tickets/{ticketKey}/messages  (flat envelope)
 * POST /api/v1/vendor/support-tickets/{ticketKey}/messages/read
 */

import { format, startOfDay } from "date-fns";
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { DashboardDateFilter } from "@/app/(protected)/vendor/support/_lib/types";
import type {
  AssignVendorSupportTicketPayload,
  AssignVendorSupportTicketResponse,
  CloseVendorSupportTicketPayload,
  CloseVendorSupportTicketResponse,
  CreateVendorSupportTicketPayload,
  CreateVendorSupportTicketResponse,
  EscalateVendorSupportTicketResponse,
  MarkVendorSupportMessagesReadResponse,
  PinVendorSupportTicketPayload,
  PinVendorSupportTicketResponse,
  StoreVendorSupportMessagePayload,
  StoreVendorSupportMessageResponse,
  VendorSupportDashboardParams,
  VendorSupportDashboardResponse,
  VendorSupportDashboardTime,
  VendorSupportMessagesParams,
  VendorSupportMessagesResponse,
  VendorSupportTicketsParams,
  VendorSupportTicketsResponse,
  VendorSupportTimeFilter,
} from "./type";

const PRESET_TO_API_TIME: Record<
  DashboardDateFilter["preset"],
  VendorSupportDashboardTime
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
export function toVendorSupportDashboardParams(
  filter: DashboardDateFilter
): VendorSupportDashboardParams {
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

/**
 * Maps inbox date presets to API `time` query values.
 */
export function mapVendorInboxDateToApiTime(
  date: "all" | "today" | "week" | "month"
): VendorSupportTimeFilter {
  if (date === "today") return "today";
  if (date === "week") return "last_7_days";
  if (date === "month") return "last_30_days";
  return "all";
}

function buildListParams(
  params: VendorSupportTicketsParams
): Record<string, string | number> {
  const out: Record<string, string | number> = {};

  if (params.sort) out.sort = params.sort;

  const search = params.search?.trim();
  if (search) out.search = search;

  if (params.status) out.status = params.status;
  if (params.priority) out.priority = params.priority;
  if (params.direction) out.direction = params.direction;

  if (params.assignee) out.assignee = params.assignee;
  if (params.assign_to) out.assign_to = params.assign_to;

  if (params.time) out.time = params.time;

  if (params.filter?.length) {
    out.filter = params.filter.join(",");
  }

  if (params.page != null) out.page = Math.max(1, params.page);
  if (params.per_page != null) {
    out.per_page = Math.min(100, Math.max(1, params.per_page));
  }

  return out;
}

export function buildCreateVendorSupportTicketFormData(
  payload: CreateVendorSupportTicketPayload
): FormData {
  const formData = new FormData();

  formData.append("subject", payload.subject.trim());
  formData.append("contact_number", payload.contact_number.trim());
  formData.append("priority", payload.priority);
  formData.append("description", payload.description.trim());

  const files = payload.attachments ?? [];
  files.forEach((file, index) => {
    formData.append(`attachments[${index}]`, file);
  });

  return formData;
}

export const vendorSupportService = {
  getDashboard: async (
    params: VendorSupportDashboardParams = {}
  ): Promise<VendorSupportDashboardResponse> => {
    const query: Record<string, string> = {};
    if (params.time) query.time = params.time;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;

    return api.get<VendorSupportDashboardResponse>(
      API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.DASHBOARD,
      {
        params: Object.keys(query).length ? query : undefined,
        returnFullResponse: true,
      }
    );
  },

  getTickets: async (
    params: VendorSupportTicketsParams = {}
  ): Promise<VendorSupportTicketsResponse> => {
    const query = buildListParams(params);

    return api.get<VendorSupportTicketsResponse>(
      API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.LIST,
      {
        params: Object.keys(query).length ? query : undefined,
        returnFullResponse: true,
      }
    );
  },

  createTicket: async (
    payload: CreateVendorSupportTicketPayload
  ): Promise<CreateVendorSupportTicketResponse> => {
    const formData = buildCreateVendorSupportTicketFormData(payload);

    return api.post<CreateVendorSupportTicketResponse>(
      API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.STORE,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        returnFullResponse: true,
      }
    );
  },

  getMessages: async (
    ticketKey: string,
    params: VendorSupportMessagesParams = {}
  ): Promise<VendorSupportMessagesResponse> => {
    const endpoint = API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.MESSAGES.replace(
      "{ticketKey}",
      encodeURIComponent(ticketKey)
    );

    const query: Record<string, number> = {};
    if (params.page != null) query.page = Math.max(1, params.page);
    if (params.per_page != null) {
      query.per_page = Math.min(100, Math.max(1, params.per_page));
    }

    return api.get<VendorSupportMessagesResponse>(endpoint, {
      params: Object.keys(query).length ? query : { page: 1, per_page: 30 },
      returnFullResponse: true,
    });
  },

  markMessagesRead: async (
    ticketKey: string
  ): Promise<MarkVendorSupportMessagesReadResponse> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.MARK_MESSAGES_READ.replace(
        "{ticketKey}",
        encodeURIComponent(ticketKey)
      );

    return api.post<MarkVendorSupportMessagesReadResponse>(
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
    payload: PinVendorSupportTicketPayload
  ): Promise<PinVendorSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.PIN.replace(
      "{ticketKey}",
      encodeURIComponent(payload.ticketKey)
    );

    return api.post<PinVendorSupportTicketResponse>(
      endpoint,
      { is_pinned: payload.is_pinned },
      {
        returnFullResponse: true,
      }
    );
  },

  escalateTicket: async (
    ticketKey: string
  ): Promise<EscalateVendorSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.ESCALATE.replace(
      "{ticketKey}",
      encodeURIComponent(ticketKey)
    );

    return api.post<EscalateVendorSupportTicketResponse>(
      endpoint,
      undefined,
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
      }
    );
  },

  closeTicket: async (
    payload: CloseVendorSupportTicketPayload
  ): Promise<CloseVendorSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.CLOSE.replace(
      "{ticketKey}",
      encodeURIComponent(payload.ticketKey)
    );

    return api.post<CloseVendorSupportTicketResponse>(
      endpoint,
      { closed_reason: payload.closed_reason },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
      }
    );
  },

  assignTicket: async (
    payload: AssignVendorSupportTicketPayload
  ): Promise<AssignVendorSupportTicketResponse> => {
    const endpoint = API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.ASSIGN.replace(
      "{ticketKey}",
      encodeURIComponent(payload.ticketKey)
    );

    return api.post<AssignVendorSupportTicketResponse>(
      endpoint,
      { staff_id: payload.staff_id },
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
      }
    );
  },

  storeMessage: async (
    payload: StoreVendorSupportMessagePayload
  ): Promise<StoreVendorSupportMessageResponse> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.SUPPORT_TICKETS.STORE_MESSAGE.replace(
        "{ticketKey}",
        encodeURIComponent(payload.ticketKey)
      );

    const attachments = payload.attachments ?? [];
    if (attachments.length > 0) {
      const formData = new FormData();
      formData.append("message", payload.message.trim());
      if (payload.is_internal) {
        formData.append("is_internal", "1");
      }
      attachments.forEach((file) => {
        formData.append("attachments[]", file);
      });

      return api.post<StoreVendorSupportMessageResponse>(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        returnFullResponse: true,
        suppressSuccessToast: true,
      });
    }

    const body: Record<string, string | boolean> = {
      message: payload.message.trim(),
    };
    if (payload.is_internal) {
      body.is_internal = true;
    }

    return api.post<StoreVendorSupportMessageResponse>(endpoint, body, {
      returnFullResponse: true,
      suppressSuccessToast: true,
    });
  },
};
