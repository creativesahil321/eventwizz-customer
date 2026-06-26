import { useQuery } from "@tanstack/react-query";
import { adminSystemLogsService } from "./system-logs.service";
import type {
  AdminSystemLogsParams,
  AdminSystemLogsResponse,
  SystemLogsTab,
} from "./types";

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseTab(raw: string | undefined): SystemLogsTab {
  const v = (raw ?? "all").toLowerCase();
  if (v === "warning") return "warning";
  if (v === "error") return "error";
  return "all";
}

export function buildAdminSystemLogsParams(
  search: Record<string, string | string[] | undefined>
): AdminSystemLogsParams {
  const get = (key: string): string =>
    (Array.isArray(search[key]) ? search[key][0] : search[key]) ?? "";

  return {
    tab: parseTab(get("tab")),
    page: Math.max(1, parseIntSafe(get("page"), 1)),
    per_page: Math.min(100, Math.max(1, parseIntSafe(get("per_page"), 30))),
  };
}

export const adminSystemLogsKeys = {
  all: ["admin", "system-logs"] as const,
  list: (params: AdminSystemLogsParams) =>
    [...adminSystemLogsKeys.all, params] as const,
};

export function useAdminSystemLogs(
  search: Record<string, string | string[] | undefined>
) {
  const params = buildAdminSystemLogsParams(search);

  return useQuery<AdminSystemLogsResponse>({
    queryKey: adminSystemLogsKeys.list(params),
    queryFn: () => adminSystemLogsService.getSystemLogs(params),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}
