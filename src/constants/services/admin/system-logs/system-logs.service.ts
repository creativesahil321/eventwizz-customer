import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { AdminSystemLogsParams, AdminSystemLogsResponse } from "./types";

/**
 * Builds query params for GET /admin/systemlogs.
 * Uses `level=WARNING|ERROR` when a tab filter is active; omit for all entries.
 * If your backend expects a different key or casing, adjust here only.
 */
function buildParams(
  params: AdminSystemLogsParams
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.page != null) out.page = Math.max(1, params.page);
  if (params.per_page != null) {
    out.per_page = Math.min(100, Math.max(1, params.per_page));
  }
  if (params.tab === "warning") out.level = "WARNING";
  if (params.tab === "error") out.level = "ERROR";
  return out;
}

export const adminSystemLogsService = {
  getSystemLogs: async (
    params: AdminSystemLogsParams = {}
  ): Promise<AdminSystemLogsResponse> => {
    const query = buildParams(params);
    return api.get<AdminSystemLogsResponse>(API_ENDPOINTS.ADMIN.SYSTEM_LOGS.LIST, {
      params: Object.keys(query).length ? query : undefined,
      returnFullResponse: true,
    });
  },
};
