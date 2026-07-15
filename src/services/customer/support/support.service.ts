/**
 * Customer Support Tickets Service
 *
 * GET  /api/v1/customer/support-tickets
 * POST /api/v1/customer/support-tickets/store
 * GET  /api/v1/customer/support-tickets/locations
 * GET  /api/v1/customer/support-tickets/locations?location_id=
 * GET  /api/v1/customer/support-tickets/{ticketKey}/messages
 * POST /api/v1/customer/support-tickets/{ticketKey}/messages/store
 * POST /api/v1/customer/support-tickets/{ticketKey}/messages/read
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  CreateCustomerSupportTicketPayload,
  CreateCustomerSupportTicketResponse,
  CustomerSupportApiCategory,
  CustomerSupportCategoryFilter,
  CustomerSupportLocationBookingsResponse,
  CustomerSupportLocationsResponse,
  CustomerSupportMessagesParams,
  CustomerSupportMessagesResponse,
  CustomerSupportTicketsParams,
  CustomerSupportTicketsResponse,
  CustomerSupportTimeFilter,
  MarkCustomerSupportMessagesReadResponse,
  StoreCustomerSupportMessagePayload,
  StoreCustomerSupportMessageResponse,
} from "./type";

export const CATEGORY_TO_API: Record<
  CustomerSupportCategoryFilter,
  CustomerSupportApiCategory
> = {
  general_support: "general",
  technical_support: "technical",
};

/**
 * Maps inbox date presets to API `time` query values.
 */
export function mapInboxDateToApiTime(
  date: "all" | "today" | "week" | "month"
): CustomerSupportTimeFilter | undefined {
  if (date === "today") return "today";
  if (date === "week") return "this_week";
  if (date === "month") return "this_month";
  return undefined;
}

function buildListParams(
  params: CustomerSupportTicketsParams
): Record<string, string | number> {
  const out: Record<string, string | number> = {};

  if (params.sort) out.sort = params.sort;

  const search = params.search?.trim();
  if (search) out.search = search;

  if (params.status) out.status = params.status;
  if (params.priority) out.priority = params.priority;

  if (params.category) {
    out.category = CATEGORY_TO_API[params.category];
  }

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

export function buildCreateTicketFormData(
  payload: CreateCustomerSupportTicketPayload
): FormData {
  const formData = new FormData();

  formData.append("subject", payload.subject.trim());
  formData.append("category", CATEGORY_TO_API[payload.category]);
  formData.append("contact_number", payload.contact_number.trim());
  formData.append(
    "vendor_location_id",
    payload.vendor_location_id != null && payload.vendor_location_id > 0
      ? String(payload.vendor_location_id)
      : ""
  );
  formData.append(
    "booking_id",
    payload.booking_id != null && payload.booking_id > 0
      ? String(payload.booking_id)
      : ""
  );
  formData.append("priority", payload.priority);
  formData.append("message", payload.message.trim());

  const files = payload.attachments ?? [];
  files.forEach((file, index) => {
    formData.append(`attachments[${index}]`, file);
  });

  return formData;
}

export function buildStoreMessageFormData(
  payload: Omit<StoreCustomerSupportMessagePayload, "ticketKey">
): FormData {
  const formData = new FormData();
  formData.append("message", payload.message.trim());

  (payload.attachments ?? []).forEach((file) => {
    formData.append("attachments[]", file);
  });

  return formData;
}

export const customerSupportService = {
  getTickets: async (
    params: CustomerSupportTicketsParams = {}
  ): Promise<CustomerSupportTicketsResponse> => {
    const query = buildListParams(params);

    return api.get<CustomerSupportTicketsResponse>(
      API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.LIST,
      {
        params: Object.keys(query).length ? query : undefined,
        returnFullResponse: true,
      }
    );
  },

  createTicket: async (
    payload: CreateCustomerSupportTicketPayload
  ): Promise<CreateCustomerSupportTicketResponse> => {
    const formData = buildCreateTicketFormData(payload);

    return api.post<CreateCustomerSupportTicketResponse>(
      API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.STORE,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        returnFullResponse: true,
      }
    );
  },

  getLocations: async (): Promise<CustomerSupportLocationsResponse> => {
    return api.get<CustomerSupportLocationsResponse>(
      API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.LOCATIONS,
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
        suppressErrorToast: true,
      }
    );
  },

  getLocationBookings: async (
    locationId: number | string
  ): Promise<CustomerSupportLocationBookingsResponse> => {
    return api.get<CustomerSupportLocationBookingsResponse>(
      API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.LOCATIONS,
      {
        params: { location_id: locationId },
        returnFullResponse: true,
        suppressSuccessToast: true,
        suppressErrorToast: true,
      }
    );
  },

  getMessages: async (
    ticketKey: string,
    params: CustomerSupportMessagesParams = {}
  ): Promise<CustomerSupportMessagesResponse> => {
    const endpoint = API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.MESSAGES.replace(
      "{ticketKey}",
      encodeURIComponent(ticketKey)
    );

    const query: Record<string, number> = {};
    if (params.page != null) query.page = Math.max(1, params.page);
    if (params.per_page != null) {
      query.per_page = Math.min(100, Math.max(1, params.per_page));
    }

    return api.get<CustomerSupportMessagesResponse>(endpoint, {
      params: Object.keys(query).length ? query : { page: 1, per_page: 30 },
      returnFullResponse: true,
    });
  },

  storeMessage: async (
    payload: StoreCustomerSupportMessagePayload
  ): Promise<StoreCustomerSupportMessageResponse> => {
    const endpoint =
      API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.STORE_MESSAGE.replace(
        "{ticketKey}",
        encodeURIComponent(payload.ticketKey)
      );

    const formData = buildStoreMessageFormData({
      message: payload.message,
      attachments: payload.attachments,
    });

    return api.post<StoreCustomerSupportMessageResponse>(endpoint, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      returnFullResponse: true,
      suppressSuccessToast: true,
    });
  },

  markMessagesRead: async (
    ticketKey: string
  ): Promise<MarkCustomerSupportMessagesReadResponse> => {
    const endpoint =
      API_ENDPOINTS.CUSTOMER.SUPPORT_TICKETS.MARK_MESSAGES_READ.replace(
        "{ticketKey}",
        encodeURIComponent(ticketKey)
      );

    return api.post<MarkCustomerSupportMessagesReadResponse>(
      endpoint,
      undefined,
      {
        returnFullResponse: true,
        suppressSuccessToast: true,
        suppressErrorToast: true,
      }
    );
  },
};
