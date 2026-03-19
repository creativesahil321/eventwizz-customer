"use client";

import Link from "next/link";
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
import { Eye } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { CustomerOverviewRow } from "@/services/admin/dashboard/types";

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
  customer_page: number;
  customer_per_page: number;
  customer_search: string;
  newly_added_page: number;
  newly_added_per_page: number;
  newly_added_search: string;
  venues_limit?: number;
  [key: string]: string | number | undefined;
};

function buildCustomerOverviewParams(
  search: DashboardSearch,
  page: number,
): string {
  const params = new URLSearchParams();
  params.set("period", String(search.period));
  params.set("from_date", String(search.from_date ?? ""));
  params.set("to_date", String(search.to_date ?? ""));
  params.set("sales_period", String(search.sales_period ?? "monthly"));
  params.set("customer_page", String(page));
  params.set("customer_per_page", String(search.customer_per_page));
  params.set("newly_added_page", String(search.newly_added_page));
  params.set("newly_added_per_page", String(search.newly_added_per_page));
  params.set("venues_limit", String(search.venues_limit ?? 5));
  if (search.customer_search)
    params.set("customer_search", String(search.customer_search));
  if (search.newly_added_search)
    params.set("newly_added_search", String(search.newly_added_search));
  return params.toString();
}

interface CustomerOverviewProps {
  title: string;
  data: CustomerOverviewRow[];
  pagination: PaginationMeta;
  search: DashboardSearch;
}

export default function CustomerOverview({
  title,
  data,
  pagination,
  search,
}: CustomerOverviewProps) {
  const basePath = "/admin/dashboard";

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl mb-0 title-header font-medium">
            {title}
          </CardTitle>

          <form
            method="GET"
            action={basePath}
            className="w-full sm:w-auto flex gap-2"
          >
            <input type="hidden" name="period" value={search.period} />
            <input type="hidden" name="customer_page" value="1" />
            <input
              type="hidden"
              name="customer_per_page"
              value={String(search.customer_per_page)}
            />
            <input
              type="hidden"
              name="newly_added_page"
              value={String(search.newly_added_page)}
            />
            <input
              type="hidden"
              name="newly_added_per_page"
              value={String(search.newly_added_per_page)}
            />
            <input
              type="hidden"
              name="venues_limit"
              value={String(search.venues_limit ?? 5)}
            />
            {search.sales_period != null && (
              <input
                type="hidden"
                name="sales_period"
                value={String(search.sales_period)}
              />
            )}
            <Input
              name="customer_search"
              placeholder="Search for Customer Name"
              className="max-w-sm"
              defaultValue={search.customer_search}
            />
            <Button type="submit" variant="event-primary">
              Search
            </Button>
          </form>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Customer Name</TableHead>
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
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell>{row.total_events}</TableCell>
                    <TableCell>
                      {row.total_earning_formatted ?? String(row.total_earning)}
                    </TableCell>
                    <TableCell>
                      {row.commission_earned_formatted ??
                        String(row.commission_earned)}
                    </TableCell>
                    <TableCell>
                      {row.commission_pending_formatted ??
                        String(row.commission_pending)}
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
                    No customers found
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
                      ? `${basePath}?${buildCustomerOverviewParams(search, pagination.current_page - 1)}`
                      : "#"
                  }
                  aria-disabled={pagination.current_page <= 1}
                />
              </PaginationItem>
              {Array.from(
                { length: pagination.last_page },
                (_, i) => i + 1,
              ).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href={`${basePath}?${buildCustomerOverviewParams(search, page)}`}
                    isActive={page === pagination.current_page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href={
                    pagination.current_page < pagination.last_page
                      ? `${basePath}?${buildCustomerOverviewParams(search, pagination.current_page + 1)}`
                      : "#"
                  }
                  aria-disabled={
                    pagination.current_page >= pagination.last_page
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
