"use client";

import { Percent, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResolvedBookingAppliedOffer } from "@/lib/booking-applied-offer";

type BookingAppliedOffersProps = {
  offers: ResolvedBookingAppliedOffer[];
  formatMoney?: (amount: number) => string;
  /** Compact pills for list cards; rows for payment summary. */
  variant?: "pills" | "rows";
  className?: string;
};

/**
 * Read-only display of coupons / date discounts already applied on a booking.
 * No apply / remove controls — post-booking visibility only.
 */
export function BookingAppliedOffers({
  offers,
  formatMoney,
  variant = "pills",
  className,
}: BookingAppliedOffersProps) {
  if (!offers.length) return null;

  if (variant === "rows") {
    return (
      <div className={cn("space-y-1.5", className)}>
        {offers.map((offer, index) => {
          const title =
            offer.kind === "coupon" && offer.code
              ? `Coupon ${offer.code}`
              : offer.label || "Discount applied";
          const subtitle =
            offer.kind === "coupon" && offer.code && offer.label
              ? offer.label
              : offer.kind === "discount"
                ? "Date offer"
                : null;

          return (
            <div
              key={`${offer.code ?? offer.label ?? "offer"}-${index}`}
              className="flex items-center justify-between gap-3 text-sm text-emerald-700"
            >
              <span className="min-w-0">
                <span className="font-medium">{title}</span>
                {subtitle ? (
                  <span className="ml-1 text-emerald-700/80">({subtitle})</span>
                ) : null}
              </span>
              {offer.amount != null && formatMoney ? (
                <span className="shrink-0 font-semibold tabular-nums">
                  −{formatMoney(offer.amount)}
                </span>
              ) : offer.label && !(offer.kind === "coupon" && offer.code) ? (
                <span className="shrink-0 font-medium">{offer.label}</span>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {offers.map((offer, index) => {
        const Icon = offer.kind === "coupon" ? Tag : Percent;
        const text =
          offer.kind === "coupon" && offer.code
            ? offer.label
              ? `${offer.code} · ${offer.label}`
              : `Code ${offer.code}`
            : offer.label || "Offer applied";

        return (
          <span
            key={`${offer.code ?? offer.label ?? "offer"}-${index}`}
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5",
              "border-emerald-200/80 bg-emerald-50 text-[11px] font-semibold text-emerald-800",
            )}
            title={
              offer.amount != null && formatMoney
                ? `${text} (−${formatMoney(offer.amount)})`
                : text
            }
          >
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{text}</span>
            {offer.amount != null && formatMoney ? (
              <span className="shrink-0 tabular-nums">
                −{formatMoney(offer.amount)}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
