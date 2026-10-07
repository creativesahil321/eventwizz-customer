import { useQuery } from "@tanstack/react-query";
import { adminCommissionsService } from "./commissions.service";
import type {
  AdminCommissionsParams,
  AdminCommissionsResponse,
  CommissionStatusTab,
  PaidStatus,
} from "./types";
import { FRESHNESS } from "@/lib/query-freshness";

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function buildAdminCommissionsParams(
  search: Record<string, string | string[] | undefined>
): AdminCommissionsParams {
  const get = (key: string): string =>
    (Array.isArray(search[key]) ? search[key][0] : search[key]) ?? "";

  return {
    period: (get("period") || "monthly") as AdminCommissionsParams["period"],
    from_date: get("from_date") || undefined,
    to_date: get("to_date") || undefined,
    status: (get("status") || "settled") as CommissionStatusTab,
    paid_status: (get("paid_status") || undefined) as PaidStatus | undefined,
    search: get("search") || undefined,
    per_page: Math.min(100, Math.max(1, parseIntSafe(get("per_page"), 30))),
    page: Math.max(1, parseIntSafe(get("page"), 1)),
  };
}

export const adminCommissionsKeys = {
  all: ["admin", "commissions"] as const,
  list: (params: AdminCommissionsParams) =>
    [...adminCommissionsKeys.all, params] as const,
};

export function useAdminCommissions(
  search: Record<string, string | string[] | undefined>
) {
  const params = buildAdminCommissionsParams(search);

  return useQuery<AdminCommissionsResponse>({
    queryKey: adminCommissionsKeys.list(params),
    queryFn: () => adminCommissionsService.getCommissions(params),
    ...FRESHNESS.operational,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}
