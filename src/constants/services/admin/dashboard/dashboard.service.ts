/**
 * Admin dashboard service — fetches dashboard data from API.
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminDashboardParams,
  AdminDashboardResponse,
} from "./types";

/** Backend expects "today" for day-level range; UI uses "daily". */
function normalizePeriod(value: string): string {
  return value === "daily" ? "today" : value;
}

function buildDashboardParams(params: AdminDashboardParams): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (params.period != null) out.period = normalizePeriod(params.period);
  if (params.from_date != null) out.from_date = params.from_date;
  if (params.to_date != null) out.to_date = params.to_date;
  if (params.sales_period != null) out.sales_period = normalizePeriod(params.sales_period);
  if (params.vendor_page != null) out.vendor_page = params.vendor_page;
  if (params.vendor_per_page != null) out.vendor_per_page = params.vendor_per_page;
  if (params.vendor_search != null) out.vendor_search = params.vendor_search;
  if (params.newly_added_page != null) out.newly_added_page = params.newly_added_page;
  if (params.newly_added_per_page != null) out.newly_added_per_page = params.newly_added_per_page;
  if (params.newly_added_search != null) out.newly_added_search = params.newly_added_search;
  if (params.venues_limit != null) out.venues_limit = Math.min(20, Math.max(1, params.venues_limit));
  return out;
}

export const adminDashboardService = {
  /**
   * Fetch admin dashboard data with optional filters.
   * GET /admin/dashboard?period=monthly&vendor_page=1&...
   */
  getDashboard: async (
    params: AdminDashboardParams = {}
  ): Promise<AdminDashboardResponse> => {
    const url = API_ENDPOINTS.ADMIN.DASHBOARD.STATISTICS;
    const query = buildDashboardParams(params);
    return api.get<AdminDashboardResponse>(url, {
      params: Object.keys(query).length ? query : undefined,
      returnFullResponse: true,
    });
  },
};
