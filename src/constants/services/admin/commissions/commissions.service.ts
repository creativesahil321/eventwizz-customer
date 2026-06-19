import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminCommissionsParams,
  AdminCommissionsResponse,
} from "./types";

function buildParams(
  params: AdminCommissionsParams
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.period != null) out.period = params.period;
  if (params.from_date != null) out.from_date = params.from_date;
  if (params.to_date != null) out.to_date = params.to_date;
  if (params.status != null) out.status = params.status;
  if (params.paid_status != null) out.paid_status = params.paid_status;
  if (params.search != null) out.search = params.search;
  if (params.per_page != null) out.per_page = Math.min(100, Math.max(1, params.per_page));
  if (params.page != null) out.page = Math.max(1, params.page);
  return out;
}

export const adminCommissionsService = {
  getCommissions: async (
    params: AdminCommissionsParams = {}
  ): Promise<AdminCommissionsResponse> => {
    const query = buildParams(params);
    return api.get<AdminCommissionsResponse>(API_ENDPOINTS.ADMIN.COMMISSIONS.LIST, {
      params: Object.keys(query).length ? query : undefined,
      returnFullResponse: true,
    });
  },

  exportCommissionsCsv: async (
    params: Omit<AdminCommissionsParams, "page" | "per_page"> = {}
  ): Promise<Blob> => {
    const query = buildParams(params);
    return api.get<Blob>(API_ENDPOINTS.ADMIN.COMMISSIONS.EXPORT, {
      params: Object.keys(query).length ? query : undefined,
      responseType: "blob",
      returnFullResponse: true,
    });
  },
};
