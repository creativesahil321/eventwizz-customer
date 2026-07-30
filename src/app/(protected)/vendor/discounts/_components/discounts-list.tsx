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
} from "lucide-react";
import { toast } from "sonner";
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
import { DUMMY_DISCOUNTS } from "../_lib/dummy-data";
import type { Discount, DiscountCategory, DiscountStatus } from "../_lib/types";
import { DISCOUNT_CATEGORY_LABELS } from "../_lib/types";
import { DiscountStatusBadge } from "./discount-status-badge";
import {
  formatDiscountScope,
  formatDiscountValue,
  getDiscountDisplayName,
} from "./format";

const CATEGORY_META: Record<
  DiscountCategory,
  { icon: typeof Tag; hint: string }
> = {
  event_specific: {
    icon: Tag,
    hint: "Whole event",
  },
  date_wise: {
    icon: CalendarDays,
    hint: "Room + dates",
  },
  coupon_code: {
    icon: Ticket,
    hint: "Checkout code",
  },
};

export function DiscountsList() {
  const searchParams = useSearchParams();
  const eventIdParam = searchParams.get("eventId");
  const eventNameParam = searchParams.get("eventName");

  const [items, setItems] = useState<Discount[]>(DUMMY_DISCOUNTS);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DiscountCategory | "all">("all");
  const [status, setStatus] = useState<DiscountStatus | "all">("all");
  const [scopedToEvent, setScopedToEvent] = useState(Boolean(eventIdParam));

  const eventIdNum = eventIdParam ? Number(eventIdParam) : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (
        scopedToEvent &&
        eventIdNum &&
        Number.isFinite(eventIdNum) &&
        d.event_id !== eventIdNum
      ) {
        return false;
      }
      if (category !== "all" && d.category !== category) return false;
      if (status !== "all" && d.status !== status) return false;
      if (!q) return true;
      const haystack = [
        d.name,
        d.coupon_code,
        d.event_name,
        d.location_name,
        d.room_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, category, status, scopedToEvent, eventIdNum]);

  const stats = useMemo(() => {
    const pool =
      scopedToEvent && eventIdNum
        ? items.filter((d) => d.event_id === eventIdNum)
        : items;
    return {
      active: pool.filter((d) => d.status === "active").length,
      coupons: pool.filter((d) => d.category === "coupon_code").length,
      total: pool.length,
    };
  }, [items, scopedToEvent, eventIdNum]);

  const createHref = eventIdParam
    ? `/vendor/discounts/create?eventId=${eventIdParam}${
        eventNameParam
          ? `&eventName=${encodeURIComponent(eventNameParam)}`
          : ""
      }`
    : "/vendor/discounts/create";

  const toggleStatus = (id: number) => {
    setItems((prev) =>
      prev.map((d) => {
        if (d.id !== id || d.status === "expired") return d;
        const nextStatus = d.status === "active" ? "inactive" : "active";
        toast.success(
          nextStatus === "active" ? "Discount activated" : "Discount deactivated"
        );
        return {
          ...d,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        };
      })
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <ProtectedPageHeader
        title="Discounts"
        description="Create event offers, date deals, and coupon codes. One discount applies per booking — coupons win first."
        actions={
          <Button asChild>
            <Link href={createHref}>
              <Plus className="mr-2 h-4 w-4" />
              Create Discount
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
              onClick={() => setScopedToEvent(false)}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Show all discounts
            </Button>
          </div>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active", value: stats.active },
          { label: "Coupon codes", value: stats.coupons },
          { label: "Total", value: stats.total },
        ].map((s) => (
          <div
            key={s.label}
            className={pageCardClassName("!p-4 flex items-center justify-between")}
          >
            <span className="text-sm text-muted-foreground">{s.label}</span>
            <span className="text-2xl font-bold text-[#0F172A]">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            category === "all"
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "bg-white hover:bg-muted"
          )}
        >
          All
        </button>
        {(Object.keys(CATEGORY_META) as DiscountCategory[]).map((key) => {
          const Icon = CATEGORY_META[key].icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, event…"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as DiscountStatus | "all")}
          >
            <SelectTrigger className="w-full lg:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Percent className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium text-[#0F172A]">No discounts found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another filter, or create your first promotion.
            </p>
            <Button asChild className="mt-4">
              <Link href={createHref}>
                <Plus className="mr-2 h-4 w-4" />
                Create Discount
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((discount) => {
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
                        {DISCOUNT_CATEGORY_LABELS[discount.category]}
                        {" · "}
                        {formatDiscountScope(discount)}
                        {" · Expires "}
                        {discount.expires_at}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {discount.status !== "expired" ? (
                          <DropdownMenuItem
                            onClick={() => toggleStatus(discount.id)}
                          >
                            <Power className="mr-2 h-4 w-4" />
                            {discount.status === "active"
                              ? "Deactivate"
                              : "Activate"}
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
        )}
      </div>
    </div>
  );
}
