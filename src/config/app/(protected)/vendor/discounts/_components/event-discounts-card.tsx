"use client";

import Link from "next/link";
import {
  Percent,
  Plus,
  ArrowRight,
  Tag,
  CalendarDays,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DiscountCategory } from "../_lib/types";
import { DISCOUNT_CATEGORY_LABELS } from "../_lib/types";
import { useDiscounts } from "../_lib/queries";
import { DiscountStatusBadge } from "./discount-status-badge";
import { formatDiscountValue, getDiscountDisplayName } from "./format";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<DiscountCategory, typeof Tag> = {
  discount: Tag,
  coupon_code: Ticket,
  event_specific: Tag,
  date_wise: CalendarDays,
};

interface EventDiscountsCardProps {
  eventId: string | number;
  eventName?: string;
  /** compact = single-row banner for Edit Event header; full = overview panel */
  variant?: "compact" | "full";
  className?: string;
}

export function EventDiscountsCard({
  eventId,
  eventName,
  variant = "full",
  className,
}: EventDiscountsCardProps) {
  const id = Number(eventId);
  const enabled = Number.isFinite(id) && id > 0;

  const { data, isLoading } = useDiscounts({
    category: "all",
    status: "all",
    vendor_event_id: enabled ? id : undefined,
    per_page: 10,
    page: 1,
  });

  const discounts = enabled ? (data?.data ?? []) : [];
  const active = discounts.filter((d) => d.status === "active");
  const manageHref = `/vendor/discounts?eventId=${eventId}${
    eventName ? `&eventName=${encodeURIComponent(eventName)}` : ""
  }`;
  const createHref = `/vendor/discounts/create?eventId=${eventId}${
    eventName ? `&eventName=${encodeURIComponent(eventName)}` : ""
  }`;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-[#D6ECEF] bg-[#F7FCFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          className
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Percent className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F172A]">
              Promotions for this event
            </p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? (
                <Skeleton className="mt-1 inline-block h-3 w-48 max-w-full align-middle" />
              ) : active.length > 0 ? (
                `${active.length} active discount${active.length > 1 ? "s" : ""}`
              ) : (
                "No active discounts yet. Add a discount or coupon for this event."
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={manageHref}>
              View discounts
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={createHref}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add discount
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0F172A]">
              Discounts and coupons
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Manage offers for{" "}
              <span className="font-medium text-foreground">
                {eventName || "this event"}
              </span>
              . Use Discounts for full control; this is a quick view.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={manageHref}>Manage all</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={createHref}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Create
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ul className="mt-4 divide-y rounded-lg border">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                <div className="min-w-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-40 max-w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </li>
          ))}
        </ul>
      ) : discounts.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[#D6ECEF] bg-[#F7FCFC] px-4 py-6 text-center">
          <p className="text-sm font-medium text-[#0F172A]">
            No discounts for this event yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create an event discount or a shareable coupon code.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href={createHref}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Create discount
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {discounts.slice(0, 4).map((d) => {
            const Icon = CATEGORY_ICON[d.category];
            return (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getDiscountDisplayName(d)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {DISCOUNT_CATEGORY_LABELS[d.category]} ·{" "}
                      {formatDiscountValue(d)}
                    </p>
                  </div>
                </div>
                <DiscountStatusBadge status={d.status} />
              </li>
            );
          })}
        </ul>
      )}

      {discounts.length > 4 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          +{discounts.length - 4} more —{" "}
          <Link href={manageHref} className="underline underline-offset-2">
            view all
          </Link>
        </p>
      ) : null}
    </div>
  );
}
