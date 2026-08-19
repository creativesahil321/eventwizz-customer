"use client";

import { useState } from "react";
import { Check, Lock, Percent, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CouponStripSource } from "@/lib/coupon-strip-props";
import { parseRoomDateKey } from "../_lib/cart-calculations";
import type { CartDateDiscountRow } from "../_lib/cart-calculations";

export type CheckoutPromoApplied = {
  /** Customer applied the event coupon code (matches `event.coupon`). */
  couponCode: string | null;
};

export const DEFAULT_CHECKOUT_PROMO: CheckoutPromoApplied = {
  couponCode: null,
};

function roundMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

function isCouponExpired(expiresAt: string | null | undefined): boolean {
  const raw = expiresAt?.trim();
  if (!raw) return false;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T23:59:59`
    : raw;
  const end = new Date(normalized);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
}

/**
 * Coupon codes support percentage only (flat off total removed):
 * - `discount_type: "percentage"` + `amount` → % of booking final total
 *
 * Coupons are applied once to the booking final total
 * (tables + tickets + drinks across all dates) — never per-date.
 */
export function computeCouponDiscountAmount(
  coupon: CouponStripSource | null | undefined,
  subtotal: number,
): number {
  if (!coupon || !(subtotal > 0)) return 0;
  if (isCouponExpired(coupon.expires_at)) return 0;

  // Prefer cart API fields; keep vendor-form aliases as fallback.
  const type = (coupon.discount_type ?? coupon.value_type ?? "")
    .toString()
    .toLowerCase();
  const rawAmount = Number(coupon.amount ?? coupon.discount_value ?? NaN);
  if (!Number.isFinite(rawAmount) || !(rawAmount > 0)) return 0;

  if (type === "percentage") {
    return roundMoney(Math.min(subtotal, (subtotal * rawAmount) / 100));
  }

  return 0;
}

export function isCheckoutCouponApplied(
  promo: CheckoutPromoApplied,
  eventCoupon: CouponStripSource | null | undefined,
): boolean {
  const apiCode = eventCoupon?.coupon_code?.trim().toUpperCase() ?? "";
  const applied = promo.couponCode?.trim().toUpperCase() ?? "";
  return Boolean(apiCode && applied && apiCode === applied);
}

/**
 * Offer resolution:
 * - Coupon → applied once to booking final total; date offers ignored
 * - No coupon → per-date offers apply (each date’s own offer)
 */
export function resolveCheckoutPromoTotals(
  promo: CheckoutPromoApplied,
  eventCoupon: CouponStripSource | null | undefined,
  /**
   * Booking final total (all dates: tables + tickets + drinks).
   * Used only as the coupon base — never per-date.
   */
  subtotal: number,
  /** Automatic date-offer savings (ignored when a coupon is applied — no stacking). */
  dateOfferAmount = 0,
): {
  autoDiscountAmount: number;
  couponAmount: number;
  totalDiscount: number;
  couponLabel: string | null;
  usingCoupon: boolean;
} {
  const usingCoupon = isCheckoutCouponApplied(promo, eventCoupon);
  if (usingCoupon) {
    const couponAmount = computeCouponDiscountAmount(eventCoupon, subtotal);
    return {
      autoDiscountAmount: 0,
      couponAmount,
      totalDiscount: couponAmount,
      couponLabel: eventCoupon?.value_label?.trim() || null,
      usingCoupon: true,
    };
  }

  const autoDiscountAmount = roundMoney(dateOfferAmount);
  return {
    autoDiscountAmount,
    couponAmount: 0,
    totalDiscount: autoDiscountAmount,
    couponLabel: null,
    usingCoupon: false,
  };
}

function formatOfferDate(dateKey: string): string {
  try {
    const { date } = parseRoomDateKey(dateKey);
    return new Date(date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateKey;
  }
}

type CheckoutPromoPanelProps = {
  formatMoney: (n: number) => string;
  /** Event-level coupon from GET /customer/event. */
  eventCoupon?: CouponStripSource | null;
  /** Date-level offers with eligibility + savings. */
  dateDiscounts?: CartDateDiscountRow[];
  value: CheckoutPromoApplied;
  onChange: (promo: CheckoutPromoApplied) => void;
  /** Jump to the matching date accordion in the cart (scroll + expand). */
  onDateOfferClick?: (dateKey: string) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Customer-facing offers panel — clear savings, locked rules, and coupon entry.
 */
export function CheckoutPromoPanel({
  formatMoney,
  eventCoupon,
  dateDiscounts = [],
  value,
  onChange,
  onDateOfferClick,
  className,
  disabled = false,
}: CheckoutPromoPanelProps) {
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apiCode = eventCoupon?.coupon_code?.trim().toUpperCase() ?? "";
  const couponValueLabel = eventCoupon?.value_label?.trim() || null;
  const couponHeading =
    eventCoupon?.banner_heading?.trim() ||
    eventCoupon?.banner_subheading?.trim() ||
    null;

  const appliedMatchesApi =
    Boolean(value.couponCode) &&
    Boolean(apiCode) &&
    value.couponCode === apiCode;

  const handleApply = () => {
    const normalized = codeInput.trim().toUpperCase();
    if (!normalized) {
      setError("Enter a coupon code");
      return;
    }
    if (!apiCode) {
      setError("No coupon is available for this event");
      return;
    }
    if (normalized !== apiCode) {
      setError("That code isn’t valid for this booking");
      return;
    }
    if (isCouponExpired(eventCoupon?.expires_at)) {
      setError("This coupon has expired");
      return;
    }
    const type = (
      eventCoupon?.discount_type ??
      eventCoupon?.value_type ??
      ""
    )
      .toString()
      .toLowerCase();
    if (type !== "percentage" && type !== "flat") {
      setError("This coupon is not available");
      return;
    }
    onChange({ ...value, couponCode: normalized });
    setCodeInput("");
    setError(null);
  };

  const appliedDateOffers = dateDiscounts.filter(
    (row) => row.status === "applied" && row.amount > 0,
  );
  const lockedDateOffers = dateDiscounts.filter(
    (row) => row.status === "locked" || row.status === "expired",
  );
  const hasCouponOffer = Boolean(apiCode);

  if (
    appliedDateOffers.length === 0 &&
    lockedDateOffers.length === 0 &&
    !hasCouponOffer &&
    !value.couponCode
  ) {
    return null;
  }

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-[color:var(--checkout-brand-primary)]" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--checkout-foreground)]">
          Offers & codes
        </p>
      </div>

      {appliedMatchesApi ? (
        <p className="text-[11px] leading-snug text-[color:var(--checkout-muted-foreground)]">
          Coupon applied to the booking total — date discounts are not used with
          a coupon.
        </p>
      ) : hasCouponOffer && appliedDateOffers.length > 0 ? (
        <p className="text-[11px] leading-snug text-[color:var(--checkout-muted-foreground)]">
          A coupon applies once to the booking total and replaces the date
          offers below.
        </p>
      ) : null}

      {!appliedMatchesApi && appliedDateOffers.length > 0 ? (
        <div className="space-y-1.5">
          {appliedDateOffers.map((row) => (
            <button
              key={row.dateKey}
              type="button"
              onClick={() => onDateOfferClick?.(row.dateKey)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                "border-emerald-200/80 bg-emerald-50/70",
                onDateOfferClick &&
                  "cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.99]",
              )}
              aria-label={`Show ${formatOfferDate(row.dateKey)} booking details`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Percent className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-emerald-950">
                  {formatOfferDate(row.dateKey)}
                </p>
                <p className="truncate text-xs text-emerald-800/85">
                  {row.valueLabel}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-800">
                {formatMoney(row.amount)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {!appliedMatchesApi && lockedDateOffers.length > 0 ? (
        <div className="space-y-1.5">
          {lockedDateOffers.map((row) => (
            <button
              key={row.dateKey}
              type="button"
              onClick={() => onDateOfferClick?.(row.dateKey)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                "border-amber-200/70 bg-amber-50/50",
                onDateOfferClick &&
                  "cursor-pointer hover:border-amber-300 hover:bg-amber-50 active:scale-[0.99]",
              )}
              aria-label={`Go to ${formatOfferDate(row.dateKey)} to unlock this offer`}
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Lock className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-amber-950">
                  {formatOfferDate(row.dateKey)} · {row.valueLabel}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-amber-800/90">
                  {row.unlockHint || "Offer not available yet"}
                  {onDateOfferClick ? (
                    <span className="mt-0.5 block font-medium text-amber-900/80">
                      Tap to open this date
                    </span>
                  ) : null}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {appliedMatchesApi ? (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-3 py-2.5",
            "border-[color:var(--checkout-brand-primary)]/25 bg-[color:var(--checkout-brand-primary)]/5",
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              "bg-[color:var(--checkout-brand-primary)]/15 text-[color:var(--checkout-brand-primary)]",
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[color:var(--checkout-foreground)]">
              Code{" "}
              <span className="font-mono font-bold tracking-wide">
                {value.couponCode}
              </span>
            </p>
            <p className="text-xs text-[color:var(--checkout-muted-foreground)]">
              {couponHeading || couponValueLabel || "Coupon applied"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange({ ...value, couponCode: null })}
            disabled={disabled}
            className="rounded-md p-1 text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-white hover:text-[color:var(--checkout-foreground)] disabled:opacity-50"
            aria-label="Remove coupon"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : hasCouponOffer ? (
        <div className="space-y-1.5">
          <label
            htmlFor="checkout-coupon-code"
            className="text-xs font-medium text-[color:var(--checkout-muted-foreground)]"
          >
            Have a coupon code?
          </label>
          <div className="flex min-w-0 gap-2">
            <Input
              id="checkout-coupon-code"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
              placeholder="Enter code"
              maxLength={40}
              disabled={disabled}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className={cn(
                "h-10 flex-1 rounded-xl border-gray-200 bg-white font-mono text-sm uppercase tracking-wide",
                "placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400",
                error && "border-red-300 focus-visible:ring-red-200",
              )}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled || !codeInput.trim()}
              onClick={handleApply}
              className="h-10 shrink-0 rounded-xl px-4 text-sm font-semibold"
            >
              Apply
            </Button>
          </div>
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : couponValueLabel ? (
            <p className="text-[11px] text-[color:var(--checkout-muted-foreground)]">
              Available: {couponValueLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
