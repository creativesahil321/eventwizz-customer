"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  buildAdminSystemLogsParams,
  useAdminSystemLogs,
} from "@/services/admin/system-logs";
import type { SystemLogsTab } from "@/services/admin/system-logs";
import { SystemLogsTable } from "./system-logs-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toSearchRecord(
  searchParams: ReturnType<typeof useSearchParams>
): Record<string, string | string[] | undefined> {
  if (!searchParams) return {};
  const out: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    const prev = out[key];
    if (prev === undefined) out[key] = value;
    else if (Array.isArray(prev)) prev.push(value);
    else out[key] = [prev, value];
  });
  return out;
}

export default function SystemLogsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const searchRecord = useMemo(
    () => toSearchRecord(searchParams),
    [searchParams]
  );
  const parsed = useMemo(
    () => buildAdminSystemLogsParams(searchRecord),
    [searchRecord]
  );

  const { data: response, isLoading, isFetching, isError, error } =
    useAdminSystemLogs(searchRecord);

  const rows = response?.data ?? [];
  const meta = response?.meta;
  const counts = response?.counts;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const onLevelFilterChange = (tab: SystemLogsTab) => {
    updateParams({ tab: tab === "all" ? undefined : tab, page: "1" });
  };

  const onPaginationChange = (pageIndex: number, pageSize: number) => {
    updateParams({
      page: String(pageIndex + 1),
      per_page: String(pageSize),
    });
  };

  const pageCount = meta?.last_page ?? 1;
  const pageIndex = (meta?.current_page ?? parsed.page ?? 1) - 1;
  const pageSize = meta?.per_page ?? parsed.per_page ?? 30;

  const allCount = counts?.all ?? meta?.total ?? 0;
  const warningCount = counts?.warnings ?? 0;
  const errorCount = counts?.errors ?? 0;

  return (
    <div className="flex flex-col gap-4 min-w-0 max-w-full">
      <header className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 mb-0 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4 min-w-0">
          <nav className="flex flex-col justify-start items-start gap-2 relative min-w-0">
            <h1 className="text-xl sm:text-2xl mb-0 title-header font-bold text-black flex items-center gap-2">
              System Logs
              {isFetching && (
                <Loader2
                  className="h-5 w-5 shrink-0 animate-spin text-[var(--color-primary)]"
                  aria-hidden
                />
              )}
            </h1>
            <p className="text-muted-foreground">
              Track and analyze system logs and user interactions.
            </p>
          </nav>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full min-w-0 sm:w-auto max-w-full">
            <div className="flex flex-col gap-1.5 min-w-0 w-full sm:w-auto">
              <Select
                value={parsed.tab}
                onValueChange={(value) =>
                  onLevelFilterChange(value as SystemLogsTab)
                }
                disabled={isFetching}
              >
                <SelectTrigger
                  aria-label="Log level"
                  className="w-full max-w-full min-w-0 sm:w-[220px] text-black"
                >
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All ({allCount.toLocaleString()})
                  </SelectItem>
                  <SelectItem value="warning">
                    Warning ({warningCount.toLocaleString()})
                  </SelectItem>
                  <SelectItem value="error">
                    Error ({errorCount.toLocaleString()})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="relative min-w-0 bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
          {isLoading && !response ? (
            <div className="w-full py-16 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              {error instanceof Error
                ? error.message
                : "Failed to load system logs."}
            </div>
          ) : (
            <SystemLogsTable
              rows={rows}
              page={parsed.page ?? 1}
              pageCount={pageCount}
              pageIndex={pageIndex}
              pageSize={pageSize}
              onPaginationChange={onPaginationChange}
              isFetching={isFetching}
            />
          )}
      </div>
    </div>
  );
}
