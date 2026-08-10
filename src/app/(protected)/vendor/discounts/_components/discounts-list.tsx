"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Power,
  Percent,
  Tag,
  CalendarDays,
  Ticket,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DiscountRowsSkeleton } from "./discounts-list-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ProtectedPageHeader,
  pageCardClassName,
} from "@/app/(protected)/_components/page-header-card";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import type { DiscountCategory, DiscountStatus } from "../_lib/types";
import { DISCOUNT_CATEGORY_LABELS } from "../_lib/types";
import {
  useDiscounts,
  useUpdateDiscountStatus,
} from "../_lib/queries";
import { DiscountStatusBadge } from "./discount-status-badge";
import {
  formatDiscountMetaLine,
  formatDiscountValue,
  getDiscountDisplayName,
} from "./format";

const CATEGORY_META: Record<
  DiscountCategory,
  { icon: typeof Tag; hint: string }
> = {
  discount: {
    icon: Tag,
    hint: "Event discount",
  },
  coupon_code: {
    icon: Ticket,
    hint: "Checkout code",
  },
  event_specific: {
    icon: Tag,
    hint: "Event discount",
  },
  date_wise: {
    icon: CalendarDays,
    hint: "Room and dates",
  },
};

const PER_PAGE = 10;

export function DiscountsList() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const eventNameParam = searchParams.get("eventName");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DiscountCategory | "all">("all");
  const [status, setStatus] = useState<DiscountStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [scopedToEvent, setScopedToEvent] = useState(Boolean(eventIdParam));

  const debouncedSearch = useDebounce(search, 400);
  const eventIdNum = eventIdParam ? Number(eventIdParam) : null;

  const queryParams = useMemo(
    () => ({
      category,
      status,
      search: debouncedSearch.trim() || undefined,
      page,
      per_page: PER_PAGE,
      ...(scopedToEvent &&
      eventIdNum &&
      Number.isFinite(eventIdNum) &&
      eventIdNum > 0
        ? { vendor_event_id: eventIdNum }
        : {}),
    }),
    [category, status, debouncedSearch, page, scopedToEvent, eventIdNum]
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useDiscounts(queryParams);
  const updateStatus = useUpdateDiscountStatus();

  const items = data?.data ?? [];
  const meta = data?.meta;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? 0;

  const createHref = eventIdParam
    ? `/vendor/discounts/create?eventId=${eventIdParam}${
        eventNameParam
          ? `&eventName=${encodeURIComponent(eventNameParam)}`
          : ""
      }`
    : "/vendor/discounts/create";

  const handleCategoryChange = (next: DiscountCategory | "all") => {
    setCategory(next);
    setPage(1);
  };

  const handleStatusChange = (next: DiscountStatus | "all") => {
    setStatus(next);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  /** Success and error toasts come from the api-client interceptor. */
  const toggleStatus = async (id: number, current: DiscountStatus) => {
    if (current === "expired") return;
    const nextStatus = current === "active" ? "inactive" : "active";
    try {
      await updateStatus.mutateAsync({ id, status: nextStatus });
    } catch {
      // Mutation state already reflects the failure in the UI
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <ProtectedPageHeader
        title="Discounts"
        locationScope="venue"
        description="Discounts and coupon codes for this venue only. A Discount can cover multiple dates with different offers. Coupon codes are reusable and tied to one event. Switch location in the header to manage another."
        actions={
          <Button asChild>
            <Link href={createHref}>
              <Plus className="mr-2 h-4 w-4" />
              Create discount
            </Link>
          </Button>
        }
      />

      {scopedToEvent && eventIdParam ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Percent className="h-4 w-4 text-[var(--color-primary)]" />
            <span>
              Showing discounts for{" "}
              <strong>{eventNameParam || `Event #${eventIdParam}`}</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/vendor/events/${eventIdParam}`}>Back to event</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setScopedToEvent(false);
                setPage(1);
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Show all discounts
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleCategoryChange("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            category === "all"
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "bg-white hover:bg-muted"
          )}
        >
          All
        </button>
        {(
          Object.keys(CATEGORY_META) as DiscountCategory[]
        )
          .filter((key) => key === "discount" || key === "coupon_code")
          .map((key) => {
          const Icon = CATEGORY_META[key].icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleCategoryChange(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                category === key
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "bg-white hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {DISCOUNT_CATEGORY_LABELS[key]}
            </button>
          );
        })}
      </div>

      <div className={pageCardClassName("space-y-4")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name, code, event…"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) =>
              handleStatusChange(v as DiscountStatus | "all")
            }
          >
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <DiscountRowsSkeleton />
        ) : isError ? (
          <div className="rounded-lg border border-dashed border-destructive/30 px-4 py-12 text-center">
            <p className="font-medium text-[#0F172A]">Could not load discounts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Please try again."}
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Percent className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-[#0F172A]">No discounts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first discount or coupon code for this location.
            </p>
            <Button asChild className="mt-4">
              <Link href={createHref}>
                <Plus className="mr-2 h-4 w-4" />
                Create discount
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <ul
              className={cn(
                "space-y-3",
                isFetching && !isLoading && "opacity-70"
              )}
            >
              {items.map((discount) => {
                const Icon = CATEGORY_META[discount.category].icon;
                return (
                  <li
                    key={discount.id}
                    className="group flex flex-col gap-3 rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F8] text-[#0B6A75]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-[#0F172A]">
                            {getDiscountDisplayName(discount)}
                          </p>
                          <DiscountStatusBadge status={discount.status} />
                        </div>
                        <p className="text-sm font-medium text-[var(--color-primary)]">
                          {formatDiscountValue(discount)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDiscountMetaLine(discount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/vendor/discounts/${discount.id}/edit`}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {discount.status !== "expired" ? (
                            <DropdownMenuItem
                              disabled={updateStatus.isPending}
                              onClick={() =>
                                toggleStatus(discount.id, discount.status)
                              }
                            >
                              <Power className="mr-2 h-4 w-4" />
                              {discount.status === "active"
                                ? "Pause (turn off)"
                                : "Make live"}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              Expired — cannot activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                );
              })}
            </ul>

            {lastPage > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Page {meta?.current_page ?? page} of {lastPage}
                  {total ? ` · ${total} total` : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= lastPage || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {total} discount{total === 1 ? "" : "s"}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
