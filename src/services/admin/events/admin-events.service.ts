import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminEventShowResponse,
  AdminEventActionResponse,
  AdminRejectEventPayload,
  AdminRequestChangesPayload,
} from "./types";

export const adminEventsService = {
  getById: async (eventId: number | string): Promise<AdminEventShowResponse> => {
    const url = API_ENDPOINTS.ADMIN.EVENTS.SHOW.replace(
      "{eventId}",
      String(eventId)
    );
    return api.get<AdminEventShowResponse>(url, { returnFullResponse: true });
  },

  approve: async (eventId: number | string): Promise<AdminEventActionResponse> => {
    const url = API_ENDPOINTS.ADMIN.EVENTS.APPROVE.replace(
      "{eventId}",
      String(eventId)
    );
    return api.post<AdminEventActionResponse>(url, {}, { returnFullResponse: true });
  },

  reject: async (
    eventId: number | string,
    payload: AdminRejectEventPayload
  ): Promise<AdminEventActionResponse> => {
    const url = API_ENDPOINTS.ADMIN.EVENTS.REJECT.replace(
      "{eventId}",
      String(eventId)
    );
    return api.post<AdminEventActionResponse>(url, payload, {
      returnFullResponse: true,
    });
  },

  requestChanges: async (
    eventId: number | string,
    payload: AdminRequestChangesPayload
  ): Promise<AdminEventActionResponse> => {
    const url = API_ENDPOINTS.ADMIN.EVENTS.REQUEST_CHANGES.replace(
      "{eventId}",
      String(eventId)
    );
    return api.post<AdminEventActionResponse>(url, payload, {
      returnFullResponse: true,
    });
  },

  approveDateCancellation: async (
    eventId: number | string,
    dateId: number | string
  ): Promise<AdminEventActionResponse> => {
    const url = API_ENDPOINTS.ADMIN.EVENTS.APPROVE_DATE_CANCELLATION.replace(
      "{eventId}",
      String(eventId)
    ).replace("{dateId}", String(dateId));
    return api.post<AdminEventActionResponse>(url, {}, { returnFullResponse: true });
  },
};
