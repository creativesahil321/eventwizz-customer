"use client";

import { PermissionRoute } from "@/components/permission";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Download,
  Loader2,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  buildAdminCommissionsParams,
  useAdminCommissions,
  adminCommissionsService,
} from "@/services/admin/commissions";
import type {
  CommissionEntry,
  CommissionStatusTab,
} from "@/services/admin/commissions";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

const PERIOD_OPTIONS = ["today", "weekly", "monthly", "yearly"] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100] as const;

function toSearchRecord(
  searchParams: ReturnType<typeof useSearchParams>,
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

function actionClass(action: CommissionEntry["action"], type: CommissionEntry["type"]): string {
  if (action === "Paid") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (action === "Refunded" || type === "refund") {
    return "text-rose-600 bg-rose-50 border-rose-200";
  }
  if (action === "Due (Offline)" || type === "offline") {
    return "text-amber-700 bg-amber-50 border-amber-200";
  }
  return "text-slate-700 bg-slate-100 border-slate-200";
}

export function CommissionOverviewContent() {
  const { format: formatMoney } = useCurrencyFormat();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isExporting, setIsExporting] = useState(false);
  const searchRecord = useMemo(() => toSearchRecord(searchParams), [searchParams]);
  const parsed = useMemo(() => buildAdminCommissionsParams(searchRecord), [searchRecord]);

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
  } = useAdminCommissions(searchRecord);

  const overview = response?.data?.overview;
  const entries = response?.data?.entries?.data ?? [];
  const meta = response?.data?.entries?.meta;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const onTabChange = (status: CommissionStatusTab) => {
    updateParams({ status, page: "1" });
  };

  const onPeriodChange = (value: string) => {
    updateParams({ period: value, page: "1" });
  };

  const onPaidStatusChange = (value: string) => {
    updateParams({ paid_status: value === "all" ? undefined : value, page: "1" });
  };

  const onPerPageChange = (value: string) => {
    updateParams({ per_page: value, page: "1" });
  };

  const onPageChange = (page: number) => {
    if (!meta) return;
    if (page < 1 || page > meta.last_page) return;
    updateParams({ page: String(page) });
  };

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = String(formData.get("search") ?? "").trim();
    updateParams({ search: search || undefined, page: "1" });
  };

  const onExport = async () => {
    try {
      setIsExporting(true);
      const blob = await adminCommissionsService.exportCommissionsCsv({
        period: parsed.period,
        from_date: parsed.from_date,
        to_date: parsed.to_date,
        status: parsed.status,
        paid_status: parsed.paid_status,
        search: parsed.search,
      });

      const from = parsed.from_date ?? "start";
      const to = parsed.to_date ?? "end";
      const filename = `commission-overview-${from}-to-${to}.csv`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const onResetFilters = () => {
    updateParams({
      period: "monthly",
      from_date: undefined,
      to_date: undefined,
      status: "settled",
      paid_status: undefined,
      search: undefined,
      page: "1",
      per_page: "30",
    });
  };

  if (isLoading && !response) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        {error instanceof Error ? error.message : "Failed to load commissions."}
      </div>
    );
  }

  return (
    <PermissionRoute permissionKey="read-commission" fallbackPath="/admin/dashboard">
      <section className="page text-black min-w-0">
        <Shell className="gap-2">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
                  <div>
                    <h1 className="text-2xl title-header font-bold text-black">Commission Overview</h1>
                    <p className="text-muted-foreground">
                      Track settled and due commissions with real-time filters.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Commission Earned</p>
                      <p className="text-base font-semibold text-rose-600 sm:text-lg">{overview?.total_commission_earned_formatted ?? formatMoney(0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Commission Received</p>
                      <p className="text-base font-semibold text-violet-600 sm:text-lg">{overview?.total_commission_received_formatted ?? formatMoney(0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Commission Due</p>
                      <p className="text-base font-semibold text-cyan-600 sm:text-lg">{overview?.total_commission_due_formatted ?? formatMoney(0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-base font-semibold text-emerald-600 sm:text-lg">{overview?.total_revenue_formatted ?? formatMoney(0)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex rounded-md border border-[var(--color-border)] p-0.5 bg-muted/50 w-fit">
                    <button
                      type="button"
                      onClick={() => onTabChange("settled")}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        (parsed.status ?? "settled") === "settled"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Commission Settled
                    </button>
                    <button
                      type="button"
                      onClick={() => onTabChange("due")}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        parsed.status === "due"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Commission Due
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <Select value={parsed.period ?? "monthly"} onValueChange={onPeriodChange}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Period" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <form onSubmit={onSearchSubmit} className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="search"
                        placeholder="Search booking # or venue name"
                        defaultValue={parsed.search ?? ""}
                        className="pl-8"
                      />
                    </form>

                    <Select value={parsed.paid_status ?? "all"} onValueChange={onPaidStatusChange}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Payment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="event-outline"
                      size="sm"
                      onClick={onResetFilters}
                      disabled={isFetching || isExporting}
                    >
                      Reset
                    </Button>

                    <Button variant="event-primary" size="sm" onClick={onExport} disabled={isExporting} className="gap-2">
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <section className="overflow-x-auto rounded-md border text-black min-w-0 relative">
              {isFetching && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)] animate-pulse z-10" />
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Venue Name</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-background">
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((row) => (
                      <TableRow key={row.id} className="border-b hover:bg-slate-100">
                        <TableCell className="py-4 px-4 font-medium">{row.s_no}</TableCell>
                        <TableCell className="py-4 px-4">{row.date}</TableCell>
                        <TableCell className="py-4 px-4">{row.booking_number}</TableCell>
                        <TableCell className="py-4 px-4">{row.venue_name}</TableCell>
                        <TableCell className="py-4 px-4 text-right font-medium">{row.commission_settled_formatted}</TableCell>
                        <TableCell className="py-4 px-4">{row.paid_date ?? "—"}</TableCell>
                        <TableCell className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${actionClass(row.action, row.type)}`}>
                            {row.action}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            {meta && meta.last_page > 1 && (
              <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
                <div className="flex flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8 text-black">
                  <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
                    Showing {meta.from ?? 0} to {meta.to ?? 0} of {meta.total} entries
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <p className="whitespace-nowrap font-medium text-sm">Rows per page</p>
                      <Select value={String(meta.per_page)} onValueChange={onPerPageChange}>
                        <SelectTrigger className="h-8 w-[4.5rem]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              onPageChange(meta.current_page - 1);
                            }}
                            aria-disabled={meta.current_page <= 1}
                          />
                        </PaginationItem>
                        {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              isActive={page === meta.current_page}
                              onClick={(e) => {
                                e.preventDefault();
                                onPageChange(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              onPageChange(meta.current_page + 1);
                            }}
                            aria-disabled={meta.current_page >= meta.last_page}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              </footer>
            )}
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
