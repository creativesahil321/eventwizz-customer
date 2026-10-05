import axios from "axios";
import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { backendProxyHeaders, backendProxyUrl } from "@/lib/backend/backend-transport";
import { useDomainStore } from "@/store/domain.store";
import type {
  TableAssignmentsQueryParams,
  TableAssignmentsResponse,
} from "./type";

/** GET CSV blob via the same-origin backend proxy (same pattern as menu choices exports). */
async function fetchBlobAndDownload(
  url: string,
  options: { params?: Record<string, unknown>; defaultFilename: string },
): Promise<void> {
  const domain = useDomainStore.getState().domain;
  const headers: Record<string, string> = backendProxyHeaders();
  if (domain) headers["X-Domain"] = domain;

  const response = await axios.get<Blob>(url, {
    ...(options.params && { params: options.params }),
    responseType: "blob",
    headers,
  });

  const contentDisposition = response.headers?.["content-disposition"];
  let filename = options.defaultFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";]+)"?/i);
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

export const tableAssignmentsService = {
  list: async (
    params: TableAssignmentsQueryParams,
  ): Promise<TableAssignmentsResponse> => {
    const trimmed = params.search?.trim();
    const requestParams: Record<string, string | number | null | undefined> = {
      event: params.event,
      date: params.date,
      ...(params.per_page != null ? { per_page: params.per_page } : {}),
      ...(params.next_cursor ? { next_cursor: params.next_cursor } : {}),
      ...(params.prev_cursor ? { prev_cursor: params.prev_cursor } : {}),
      ...(trimmed ? { search: trimmed } : {}),
    };
    return api.get<TableAssignmentsResponse>(
      API_ENDPOINTS.VENDOR.TABLE_ASSIGNMENTS.LIST,
      {
        params: requestParams,
        returnFullResponse: true,
      },
    );
  },

  confirmBookingDate: async (params: {
    bookingDateId: number | string;
    /** Preferred: API slot id -> final table number (form `final_tables[slotId]=…`). */
    finalTablesBySlotKey?: Record<string, string>;
    /** Legacy list pairing when maps are not used. */
    tempTables?: string[];
    finalTables?: string[];
  }): Promise<TableAssignmentsResponse> => {
    const form = new FormData();
    const toNum = (v: string) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const sortNumericLike = (arr: string[]) =>
      [...arr].sort((a, b) => {
        const na = toNum(a);
        const nb = toNum(b);
        if (na != null && nb != null) return na - nb;
        if (na != null) return -1;
        if (nb != null) return 1;
        return a.localeCompare(b);
      });

    if (
      params.finalTablesBySlotKey &&
      Object.keys(params.finalTablesBySlotKey).length > 0
    ) {
      const slotIds = sortNumericLike(Object.keys(params.finalTablesBySlotKey));
      for (const slotId of slotIds) {
        const v = params.finalTablesBySlotKey[slotId];
        if (v == null || String(v).trim() === "") continue;
        form.append(`final_tables[${slotId}]`, String(v).trim());
      }
    } else if (params.tempTables?.length && params.finalTables?.length) {
      const tempKeys = sortNumericLike(params.tempTables.map((t) => String(t)));
      const finalVals = sortNumericLike(
        params.finalTables.map((t) => String(t)),
      );
      tempKeys.forEach((temp, idx) => {
        const v = finalVals[idx];
        if (v == null) return;
        form.append(`final_tables[${temp}]`, v);
      });
    }

    return api.post<TableAssignmentsResponse>(
      API_ENDPOINTS.VENDOR.TABLE_ASSIGNMENTS.CONFIRM_BOOKING_DATE.replace(
        "{bookingDateId}",
        String(params.bookingDateId),
      ),
      form,
      {
        returnFullResponse: true,
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },

  /**
   * POST multipart/form-data with field `image` (file).
   */
  uploadSeatingPlanImage: async (params: {
    bookingDateId: number | string;
    file: File;
  }): Promise<TableAssignmentsResponse> => {
    const form = new FormData();
    form.append("image", params.file);
    return api.post<TableAssignmentsResponse>(
      API_ENDPOINTS.VENDOR.TABLE_ASSIGNMENTS.SEATING_PLAN_IMAGE.replace(
        "{bookingDateId}",
        String(params.bookingDateId),
      ),
      form,
      {
        returnFullResponse: true,
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },

  /**
   * DELETE JSON body: { "temp_table": "<temp key>" } — removes one final assignment for that temp slot.
   */
  deleteFinalAssignment: async (params: {
    bookingDateId: number | string;
    tempTable: string;
  }): Promise<TableAssignmentsResponse> => {
    return api.delete<TableAssignmentsResponse>(
      API_ENDPOINTS.VENDOR.TABLE_ASSIGNMENTS.DELETE_FINAL_ASSIGNMENT.replace(
        "{bookingDateId}",
        String(params.bookingDateId),
      ),
      {
        data: { temp_table: String(params.tempTable).trim() },
        returnFullResponse: true,
        headers: { "Content-Type": "application/json" },
      },
    );
  },

  /**
   * GET /vendor/table-assignments/export?event=<slug>&date=<YYYY-MM-DD>
   */
  exportCsv: async (params: {
    event: string;
    date: string;
  }): Promise<void> => {
    const endpoint = API_ENDPOINTS.VENDOR.TABLE_ASSIGNMENTS.EXPORT;
    await fetchBlobAndDownload(backendProxyUrl(endpoint), {
      params: { event: params.event, date: params.date },
      defaultFilename: `table-assignments-${params.event}-${params.date}.csv`,
    });
  },
};

