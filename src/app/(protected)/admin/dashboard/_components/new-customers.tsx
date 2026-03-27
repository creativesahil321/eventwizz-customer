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
import { Badge } from "@/components/ui/badge";
import type { NewlyAddedVenueRow } from "@/services/admin/dashboard/types";

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

function buildNewlyAddedVenuesParams(
  search: DashboardSearch,
  page: number,
): string {
  const params = new URLSearchParams();
  params.set("period", String(search.period));
  params.set("from_date", String(search.from_date ?? ""));
  params.set("to_date", String(search.to_date ?? ""));
  params.set("sales_period", String(search.sales_period ?? "monthly"));
  params.set("vendor_page", String(search.vendor_page));
  params.set("vendor_per_page", String(search.vendor_per_page));
  params.set("newly_added_page", String(page));
  params.set("newly_added_per_page", String(search.newly_added_per_page));
  params.set("venues_limit", String(search.venues_limit ?? 5));
  if (search.vendor_search)
    params.set("vendor_search", String(search.vendor_search));
  if (search.newly_added_search)
    params.set("newly_added_search", String(search.newly_added_search));
  return params.toString();
}

interface NewCustomersProps {
  venues: NewlyAddedVenueRow[];
  pagination: PaginationMeta;
  search: DashboardSearch;
}

export default function NewCustomers({
  venues = [],
  pagination,
  search,
}: NewCustomersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = "/admin/dashboard";

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const params = new URLSearchParams();
    params.set("period", String(formData.get("period") || search.period));
    params.set("vendor_page", String(formData.get("vendor_page") || search.vendor_page));
    params.set("vendor_per_page", String(formData.get("vendor_per_page") || search.vendor_per_page));
    params.set("newly_added_page", "1");
    params.set("newly_added_per_page", String(formData.get("newly_added_per_page") || search.newly_added_per_page));
    params.set("venues_limit", String(formData.get("venues_limit") ?? search.venues_limit ?? 5));
    if (search.sales_period) params.set("sales_period", String(search.sales_period));
    if (search.vendor_search) params.set("vendor_search", String(search.vendor_search));
    const newlyAddedSearch = (formData.get("newly_added_search") as string)?.trim();
    if (newlyAddedSearch) params.set("newly_added_search", newlyAddedSearch);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl mb-0 title-header font-medium">
            Newly Registered Venues
          </CardTitle>

          <form
            onSubmit={handleSearch}
            className="w-full sm:w-auto flex gap-2 items-center"
          >
            <input type="hidden" name="period" value={search.period} />
            <input type="hidden" name="vendor_page" value={String(search.vendor_page)} />
            <input type="hidden" name="vendor_per_page" value={String(search.vendor_per_page)} />
            <input type="hidden" name="newly_added_page" value="1" />
            <input type="hidden" name="newly_added_per_page" value={String(search.newly_added_per_page)} />
            <input type="hidden" name="venues_limit" value={String(search.venues_limit ?? 5)} />
            {search.sales_period != null && (
              <input type="hidden" name="sales_period" value={String(search.sales_period)} />
            )}
            <div className="relative flex-1 min-w-0 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                name="newly_added_search"
                placeholder="Venue or email..."
                className="pl-9 h-9 rounded-md border bg-background"
                defaultValue={search.newly_added_search}
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
                <TableHead>Venue Name</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Register On</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead>Total Events</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.length > 0 ? (
                venues.map((row) => (
                  <TableRow key={row.venue_id}>
                    <TableCell className="font-medium">{row.s_no}</TableCell>
                    <TableCell>
                      {row.vendor_id != null ? (
                        <Link
                          href={`/admin/vendors/${row.vendor_id}`}
                          className="group block w-full rounded-md px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title={`View ${row.venue_name}`}
                        >
                          <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                            {row.venue_name}
                          </span>
                        </Link>
                      ) : (
                        row.venue_name
                      )}
                    </TableCell>
                    <TableCell>
                      {row.vendor_id != null ? (
                        <Link
                          href={`/admin/vendors/${row.vendor_id}`}
                          className="group block w-full rounded-md px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title={`View ${row.vendor_name}`}
                        >
                          <span className="text-foreground transition-colors group-hover:text-primary">
                            {row.vendor_name}
                          </span>
                        </Link>
                      ) : (
                        row.vendor_name
                      )}
                    </TableCell>
                    <TableCell>{row.register_on}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.account_status?.toLowerCase() === "active"
                            ? "default"
                            : "outline"
                        }
                      >
                        {row.account_status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.total_events}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell className="text-right">
                      {row.vendor_id != null ? (
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/vendors/${row.vendor_id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No venues found
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
                      ? `${basePath}?${buildNewlyAddedVenuesParams(search, pagination.current_page - 1)}`
                      : "#"
                  }
                  aria-disabled={pagination.current_page <= 1}
                  onClick={(e) => {
                    if (pagination.current_page <= 1) return;
                    e.preventDefault();
                    router.replace(
                      `${pathname}?${buildNewlyAddedVenuesParams(search, pagination.current_page - 1)}`,
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
                    href={`${basePath}?${buildNewlyAddedVenuesParams(search, page)}`}
                    isActive={page === pagination.current_page}
                    onClick={(e) => {
                      e.preventDefault();
                      router.replace(
                        `${pathname}?${buildNewlyAddedVenuesParams(search, page)}`,
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
                      ? `${basePath}?${buildNewlyAddedVenuesParams(search, pagination.current_page + 1)}`
                      : "#"
                  }
                  aria-disabled={
                    pagination.current_page >= pagination.last_page
                  }
                  onClick={(e) => {
                    if (pagination.current_page >= pagination.last_page) return;
                    e.preventDefault();
                    router.replace(
                      `${pathname}?${buildNewlyAddedVenuesParams(search, pagination.current_page + 1)}`,
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
