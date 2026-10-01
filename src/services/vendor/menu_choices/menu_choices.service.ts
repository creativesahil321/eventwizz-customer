import axios from "axios";
import { getSession } from "next-auth/react";
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { env } from "@/env";
import { useDomainStore } from "@/store/domain.store";
import { CustomerMenuChoicesListResponse } from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

/** Shared: fetch blob from API and trigger CSV download (DRY for export endpoints). */
async function fetchBlobAndDownload(
  url: string,
  options: { params?: Record<string, unknown>; defaultFilename: string }
): Promise<void> {
  const session = await getSession();
  const token = session?.user?.token as string | undefined;
  const domain = useDomainStore.getState().domain;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (domain) headers["X-Domain"] = domain;

  const response = await axios.get<Blob>(url, {
    ...(options.params && { params: options.params }),
    responseType: "blob",
    headers,
  });

  const contentDisposition = response.headers?.["content-disposition"];
  let filename = options.defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/i);
    if (match?.[1]) filename = match[1].trim();
  }

  const blob = new Blob([response.data], {
    type: (response.headers?.["content-type"] as string | undefined) || "text/csv",
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
}

/**
 * Menu Choices Service
 * Handles API calls related to vendor menu choices management
 */
export const menuChoicesService = {
  /**
   * Fetch customer menu choices list with pagination and search
   * @param params page, per_page, search
   * @returns Promise with paginated customer menu choices (data, links, meta)
   */
  getCustomerMenuChoices: (params?: {
    search?: string;
    page?: number;
    per_page?: number;
    event_id?: number;
    event_date?: string;
    event_name?: string;
    room_id?: number | string;
  }) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    return api.get<CustomerMenuChoicesListResponse>(endpoints.GET_ALL, {
      params: {
        search: params?.search || undefined,
        page: params?.page ?? 1,
        per_page: params?.per_page ?? 30,
        event_id: params?.event_id ?? undefined,
        event_date: params?.event_date || undefined,
        event_name: params?.event_name || undefined,
        room_id: params?.room_id ?? undefined,
      },
      returnFullResponse: true,
    });
  },

  /**
   * Export a single customer menu choice as CSV (triggers file download)
   * @param id Customer menu choice record ID
   */
  exportSingleMenuChoiceCsv: async (id: number | string): Promise<void> => {
    const endpoint =
      API_ENDPOINTS.VENDOR.MENU_CHOICES.EXPORT_SINGLE_MENU_CHOICES_CSV.replace(
        "{id}",
        String(id)
      );
    await fetchBlobAndDownload(`${env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      defaultFilename: `menu-choice-${id}.csv`,
    });
  },

  /**
   * Export all customer menu choices for an event date as CSV (date-wise, all users)
   * GET .../customer-menu-choices/export?event_id=93&event_date=2026-01-30
   */
  exportByDateCsv: async (
    eventId: number,
    eventDate: string,
    roomId?: number | string,
  ): Promise<void> => {
    const endpoint = API_ENDPOINTS.VENDOR.MENU_CHOICES.EXPORT_BY_DATE;
    await fetchBlobAndDownload(`${env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      params: {
        event_id: eventId,
        event_date: eventDate,
        ...(roomId != null && roomId !== "" ? { room_id: roomId } : {}),
      },
      defaultFilename: `menu-choices-${eventId}-${eventDate}.csv`,
    });
  },
};
