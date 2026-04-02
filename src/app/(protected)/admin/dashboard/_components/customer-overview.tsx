"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { VendorOverviewRow } from "@/services/admin/dashboard/types";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

type DashboardSearch = {
  period: string;
  from_date?: string;
  to_date?: string;
  sales_period?: string;
  vendor_page: number;
  vendor_per_page: number;
  vendor_search: string;
  newly_added_page: number;
  newly_added_per_page: number;
  newly_added_search: string;
  venues_limit?: number;
  [key: string]: string | number | undefined;
};

function buildVendorOverviewParams(
  search: DashboardSearch,
  page: number,
): string {
  const params = new URLSearchParams();
  params.set("period", String(search.period));
  params.set("from_date", String(search.from_date ?? ""));
  params.set("to_date", String(search.to_date ?? ""));
  params.set("sales_period", String(search.sales_period ?? "monthly"));
  params.set("vendor_page", String(page));
  params.set("vendor_per_page", String(search.vendor_per_page));
  params.set("newly_added_page", String(search.newly_added_page));
  params.set("newly_added_per_page", String(search.newly_added_per_page));
  params.set("venues_limit", String(search.venues_limit ?? 5));
  if (search.vendor_search)
    params.set("vendor_search", String(search.vendor_search));
  if (search.newly_added_search)
    params.set("newly_added_search", String(search.newly_added_search));
  return params.toString();
}

interface CustomerOverviewProps {
  title: string;
  data: VendorOverviewRow[];
  pagination: PaginationMeta;
  search: DashboardSearch;
}

export default function CustomerOverview({
  title,
  data,
  pagination,
  search,
}: CustomerOverviewProps) {
  const { formatLocale: formatMoneyLocale } = useCurrencyFormat();
  const router = useRouter();
  const pathname = usePathname();
  const basePath = "/admin/dashboard";

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams();
    params.set("period", String(formData.get("period") || search.period));
    params.set("vendor_page", "1");
    params.set("vendor_per_page", String(formData.get("vendor_per_page") || search.vendor_per_page));
    params.set("newly_added_page", String(formData.get("newly_added_page") || search.newly_added_page));
    params.set("newly_added_per_page", String(formData.get("newly_added_per_page") || search.newly_added_per_page));
    params.set("venues_limit", String(formData.get("venues_limit") ?? search.venues_limit ?? 5));
    if (search.sales_period) params.set("sales_period", String(search.sales_period));
    const vendorSearch = (formData.get("vendor_search") as string)?.trim();
    if (vendorSearch) params.set("vendor_search", vendorSearch);
    if (search.newly_added_search) params.set("newly_added_search", String(search.newly_added_search));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl mb-0 title-header font-medium">
            {title}
          </CardTitle>

          <form
            onSubmit={handleSearch}
            className="w-full sm:w-auto flex gap-2 items-center"
          >
            <input type="hidden" name="period" value={search.period} />
            <input type="hidden" name="vendor_page" value="1" />
            <input type="hidden" name="vendor_per_page" value={String(search.vendor_per_page)} />
            <input type="hidden" name="newly_added_page" value={String(search.newly_added_page)} />
            <input type="hidden" name="newly_added_per_page" value={String(search.newly_added_per_page)} />
            <input type="hidden" name="venues_limit" value={String(search.venues_limit ?? 5)} />
            {search.sales_period != null && (
              <input type="hidden" name="sales_period" value={String(search.sales_period)} />
            )}
            <div className="relative flex-1 min-w-0 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                name="vendor_search"
                placeholder="Search vendors..."
                className="pl-9 h-9 rounded-md border bg-background"
                defaultValue={search.vendor_search}
              />
            </div>
            <Button type="submit" variant="event-primary" size="sm" className="h-9 shrink-0">
              Apply
            </Button>
          </form>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Total Events</TableHead>
                <TableHead>Total Earning</TableHead>
                <TableHead>Commission Earned</TableHead>
                <TableHead>Commission Pending</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((row) => (
                  <TableRow key={`${row.vendor_id}-${row.s_no}`}>
                    <TableCell className="font-medium">{row.s_no}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/vendors/${row.vendor_id}`}
                        className="group block w-full rounded-md px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        title={`View ${row.vendor_name}`}
                      >
                        <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                          {row.vendor_name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>{row.total_events}</TableCell>
                    <TableCell>
                      {formatMoneyLocale(row.total_earning ?? 0)}
                    </TableCell>
                    <TableCell>
                      {formatMoneyLocale(row.commission_earned ?? 0)}
                    </TableCell>
                    <TableCell>
                      {formatMoneyLocale(row.commission_pending ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/vendors/${row.vendor_id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No vendors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {pagination.last_page > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={
                    pagination.current_page > 1
                      ? `${basePath}?${buildVendorOverviewParams(search, pagination.current_page - 1)}`
                      : "#"
                  }
                  aria-disabled={pagination.current_page <= 1}
                  onClick={(e) => {
                    if (pagination.current_page <= 1) return;
                    e.preventDefault();
                    router.replace(
                      `${pathname}?${buildVendorOverviewParams(search, pagination.current_page - 1)}`,
                      { scroll: false }
                    );
                  }}
                />
              </PaginationItem>
              {Array.from(
                { length: pagination.last_page },
                (_, i) => i + 1,
              ).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href={`${basePath}?${buildVendorOverviewParams(search, page)}`}
                    isActive={page === pagination.current_page}
                    onClick={(e) => {
                      e.preventDefault();
                      router.replace(
                        `${pathname}?${buildVendorOverviewParams(search, page)}`,
                        { scroll: false }
                      );
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={
                    pagination.current_page < pagination.last_page
                      ? `${basePath}?${buildVendorOverviewParams(search, pagination.current_page + 1)}`
                      : "#"
                  }
                  aria-disabled={
                    pagination.current_page >= pagination.last_page
                  }
                  onClick={(e) => {
                    if (pagination.current_page >= pagination.last_page) return;
                    e.preventDefault();
                    router.replace(
                      `${pathname}?${buildVendorOverviewParams(search, pagination.current_page + 1)}`,
                      { scroll: false }
                    );
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
