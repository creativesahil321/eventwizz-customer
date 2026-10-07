/**
 * Admin dashboard query hook — same pattern as vendor dashboard.
 * GET /admin/dashboard with optional query params from URL.
 */

import { useQuery } from "@tanstack/react-query";
import { adminDashboardService } from "./dashboard.service";
import type {
  AdminDashboardParams,
  AdminDashboardResponse,
} from "./types";
import { FRESHNESS } from "@/lib/query-freshness";

export const adminDashboardKeys = {
  all: ["admin", "dashboard"] as const,
  detail: (params: AdminDashboardParams) =>
    [...adminDashboardKeys.all, params] as const,
};

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * Build API params from URL search params (e.g. from useSearchParams()).
 * Keeps defaults consistent with adminDashboardSearchParamsCache.
 */
export function buildAdminDashboardParams(
  search: Record<string, string | string[] | undefined>
): AdminDashboardParams {
  const get = (key: string): string =>
    (Array.isArray(search[key]) ? search[key][0] : search[key]) ?? "";

  return {
    period: (get("period") || "monthly") as AdminDashboardParams["period"],
    from_date: get("from_date") || undefined,
    to_date: get("to_date") || undefined,
    sales_period: (get("sales_period") || "monthly") as AdminDashboardParams["sales_period"],
    vendor_page: parseIntSafe(get("vendor_page"), 1),
    vendor_per_page: parseIntSafe(get("vendor_per_page"), 10),
    vendor_search: get("vendor_search") || undefined,
    newly_added_page: parseIntSafe(get("newly_added_page"), 1),
    newly_added_per_page: parseIntSafe(get("newly_added_per_page"), 10),
    newly_added_search: get("newly_added_search") || undefined,
    venues_limit: Math.min(20, Math.max(1, parseIntSafe(get("venues_limit"), 5))),
  };
}

export function useAdminDashboard(
  search: Record<string, string | string[] | undefined>
) {
  const params = buildAdminDashboardParams(search);

  return useQuery<AdminDashboardResponse>({
    queryKey: adminDashboardKeys.detail(params),
    queryFn: () => adminDashboardService.getDashboard(params),
    ...FRESHNESS.operational,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
