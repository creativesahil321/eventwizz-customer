"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Wallet,
  Clock,
  Search,
  Download,
  CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PermissionRoute } from "@/components/permission";
import {
  dummyCommissionSummary,
  getDummyCommissionEntriesSettled,
  getDummyCommissionEntriesDue,
  formatCurrency,
} from "../_lib/dummy-data";
import type { CommissionTab } from "../_lib/types";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

export function CommissionOverviewContent() {
  const [activeTab, setActiveTab] = useState<CommissionTab>("settled");
  const [dateRangePlaceholder, setDateRangePlaceholder] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("paid");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const entries = useMemo(() => {
    const list =
      activeTab === "settled"
        ? getDummyCommissionEntriesSettled()
        : getDummyCommissionEntriesDue();
    let filtered = list;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.venueName.toLowerCase().includes(q) ||
          e.date.toLowerCase().includes(q),
      );
    }
    if (statusFilter === "paid") {
      filtered = filtered.filter((e) => e.status === "paid");
    } else if (statusFilter === "due") {
      filtered = filtered.filter((e) => e.status === "due");
    }
    return filtered;
  }, [activeTab, searchQuery, statusFilter]);

  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageEntries = entries.slice(start, start + pageSize);

  const summary = dummyCommissionSummary;

  const boxConfig = [
    {
      label: "Total Commission Earned",
      sublabel: "All payments & bookings",
      value: summary.totalCommissionEarned,
      icon: TrendingUp,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
      valueColor: "text-rose-600",
    },
    {
      label: "Total Commission Received",
      sublabel: "Paid & auto settled",
      value: summary.totalCommissionReceived,
      icon: Wallet,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-600",
      valueColor: "text-violet-600",
    },
    {
      label: "Total Commission Due",
      sublabel: "Pending & overdue",
      value: summary.totalCommissionDue,
      icon: Clock,
      iconBg: "bg-cyan-500/10",
      iconColor: "text-cyan-600",
      valueColor: "text-cyan-600",
    },
  ];

  return (
    <PermissionRoute
      permissionKey="read-commission"
      fallbackPath="/admin/dashboard"
    >
      <section className="page text-black min-w-0">
        <Shell className="gap-2">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Header card — same structure as booking history */}
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center flex-wrap gap-4">
                  <div className="flex flex-col gap-2">
                    <h1 className="text-2xl title-header font-bold text-black">
                      Commission Overview
                    </h1>
                    <p className="text-muted-foreground">
                      View and manage commission details for all vendors. Filter
                      by status and track settled vs due amounts.
                    </p>
                  </div>
                </div>

                {/* Summary boxes — booking-history style (icon + label + value in card) */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                  {boxConfig.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:p-4 min-h-[72px]"
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          stat.iconBg,
                          stat.iconColor,
                        )}
                      >
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-muted-foreground">
                          {stat.label}
                        </p>
                        <p
                          className={cn(
                            "truncate text-base font-semibold tabular-nums sm:text-lg",
                            stat.valueColor,
                          )}
                        >
                          {formatCurrency(stat.value)}
                        </p>
                        {stat.sublabel && (
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {stat.sublabel}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Filters row */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-4 border-t border-[var(--color-border)]">
                  {/* Segment: Commission Settled / Commission Due */}
                  <div className="flex rounded-md border border-[var(--color-border)] p-0.5 bg-muted/50">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("settled");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab === "settled"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Commission Settled
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("due");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        activeTab === "due"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Commission Due
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <div className="relative min-w-[200px] sm:min-w-[220px]">
                      <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filter by date range"
                        value={dateRangePlaceholder}
                        onChange={(e) =>
                          setDateRangePlaceholder(e.target.value)
                        }
                        className="pl-8"
                      />
                    </div>
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search bookings..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-8"
                      />
                    </div>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => {
                        setStatusFilter(v);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="due">Due</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Table — same wrapper as vendor booking history DataTable */}
            <section className="overflow-x-auto rounded-md border text-black min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue Name</TableHead>
                    <TableHead className="text-right">
                      Commission Settled
                    </TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-background">
                  {pageEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageEntries.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-b hover:bg-slate-100"
                      >
                        <TableCell className="py-4 px-4 font-medium">
                          {row.sno}
                        </TableCell>
                        <TableCell className="py-4 px-4">{row.date}</TableCell>
                        <TableCell className="py-4 px-4">
                          {row.venueName}
                        </TableCell>
                        <TableCell className="py-4 px-4 text-right font-medium">
                          {formatCurrency(row.commissionSettled)}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {row.paidDate ?? "—"}
                        </TableCell>
                        <TableCell className="py-4 px-4">
                          {row.status === "paid" ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Paid
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            {/* Pagination — separate footer, same layout as vendor booking history */}
            <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
              <div className="flex flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8 text-black">
                <div className="flex-1 whitespace-nowrap text-muted-foreground text-sm">
                  0 of {totalEntries} row(s) selected.
                </div>
                <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
                  <div className="flex items-center space-x-2">
                    <p className="whitespace-nowrap font-medium text-sm">
                      Rows per page
                    </p>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }}
                    >
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
                  <div className="flex items-center justify-center font-medium text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      aria-label="Go to first page"
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Go to previous page"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Go to next page"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="Go to last page"
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
