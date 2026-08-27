"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type PaginationState,
  type Updater,
} from "@tanstack/react-table";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

export interface Vendor {
  id: number;
  image: string;
  name: string;
  address: string;
  status: "active" | "inactive";
  liveEvents: number;
  totalEvents: number;
  totalEarnings: number;
  adminCommission: number;
  commissionPending: number;
  netPayout: number;
}

interface VendorsTableProps {
  vendors: Vendor[];
  searchQuery?: string;
  statusFilter?: string;
  /** Server-side: total page count from API meta.last_page */
  pageCount?: number;
  /** Server-side: controlled pagination */
  pageIndex?: number;
  pageSize?: number;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
}

function getVendorColumns(
  formatLocale: (value: number) => string,
): ColumnDef<Vendor>[] {
  return [
    {
      id: "index",
      header: "#",
      cell: ({ row, table }) => {
        const { pageIndex, pageSize } = table.getState().pagination;
        return (
          <span className="text-sm font-medium text-muted-foreground">
            {pageIndex * pageSize + row.index + 1}.
          </span>
        );
      },
      enableSorting: false,
      size: 48,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Venue Name"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => {
        const v = row.original;
        return (
          <Link
            href={`/admin/vendors/${v.id}`}
            className="group flex items-start gap-3 min-w-[200px] rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/40"
            title={`View ${v.name}`}
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200">
              <Image
                src={v.image}
                alt={v.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight transition-colors group-hover:text-primary">
                {v.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                {v.address}
              </p>
            </div>
          </Link>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as Vendor["status"];
        return (
          <Badge
            className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full border-0",
              status === "active"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-600",
            )}
          >
            {status === "active" ? "Active" : "Inactive"}
          </Badge>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "liveEvents",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Live Events"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-center">
          {row.getValue("liveEvents")}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "totalEvents",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Total Events"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-center">
          {row.getValue("totalEvents")}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "totalEarnings",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Total Earnings"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatLocale(row.getValue("totalEarnings"))}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "adminCommission",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Admin Commission"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {formatLocale(row.getValue("adminCommission"))}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "commissionPending",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Commission Pending"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {formatLocale(row.getValue("commissionPending"))}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "netPayout",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Net Payout"
          className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
        />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {formatLocale(row.getValue("netPayout"))}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const vendor = row.original;
        const vendorId = vendor.id;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="View vendor"
              asChild
            >
              <Link href={`/admin/vendors/${vendorId}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Edit vendor"
              asChild
            >
              <Link href={`/admin/vendors/${vendorId}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];
}

export function VendorsTable({
  vendors,
  searchQuery = "",
  statusFilter = "all",
  pageCount: serverPageCount,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize = 30,
  onPaginationChange,
}: VendorsTableProps) {
  const { formatLocale } = useCurrencyFormat();
  const isServerPaginated =
    serverPageCount != null && onPaginationChange != null;

  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalEarnings", desc: true },
  ]);
  const [clientPagination, setClientPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });

  const pagination: PaginationState = isServerPaginated
    ? {
        pageIndex: controlledPageIndex ?? 0,
        pageSize: controlledPageSize,
      }
    : clientPagination;

  const filteredData = useMemo(() => {
    if (isServerPaginated) return vendors;
    let data = [...vendors];
    if (statusFilter !== "all") {
      data = data.filter((v) => v.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.address.toLowerCase().includes(q),
      );
    }
    return data;
  }, [vendors, statusFilter, searchQuery, isServerPaginated]);

  const columns = useMemo(
    () => getVendorColumns(formatLocale),
    [formatLocale],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: isServerPaginated,
    pageCount: isServerPaginated ? (serverPageCount ?? 1) : undefined,
    onSortingChange: setSorting,
    onPaginationChange: isServerPaginated
      ? (updater: Updater<PaginationState>) => {
          const next = (
            updater as (pagination: PaginationState) => PaginationState
          )(pagination);
          onPaginationChange?.(next.pageIndex, next.pageSize);
        }
      : setClientPagination,
    state: {
      sorting,
      pagination,
    },
  });

  return (
    <div className="flex w-full max-w-full min-w-0 flex-col gap-2.5">
      <DataTable
        table={table}
        tableClassName="min-w-[1100px]"
        showPagination={false}
        emptyStateRenderer={() => (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-32 text-center text-muted-foreground"
            >
              No vendors found matching your search.
            </TableCell>
          </TableRow>
        )}
      />
      <footer className="bg-background border w-full p-4 my-4 rounded-lg min-w-0">
        <div className="flex flex-col gap-2.5 min-w-0">
          <DataTablePagination table={table} />
        </div>
      </footer>
    </div>
  );
}
