import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminEventShowResponse,
  AdminEventActionResponse,
} from "./types";

export const adminEventsService = {
  getById: async (eventId: number | string): Promise<AdminEventShowResponse> => {
    const url = API_ENDPOINTS.ADMIN.EVENTS.SHOW.replace(
      "{eventId}",
      String(eventId)
    );
    return api.get<AdminEventShowResponse>(url, { returnFullResponse: true });
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
