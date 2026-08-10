"use client";

import { useState } from "react";
import { Check, Percent, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Dummy auto-applied event discount — replace with API later. */
export const DUMMY_AUTO_DISCOUNT = {
  id: "auto-midweek",
  label: "Midweek offer",
  detail: "10% off · selected date",
  amount: 6,
} as const;

/** Dummy coupon codes accepted in this UI-only preview. */
export const DUMMY_COUPONS: Record<
  string,
  { label: string; amount: number; kind: "percentage" | "flat" }
> = {
  TEA50: { label: "50% off afternoon tea", amount: 25, kind: "percentage" },
  SAVE10: { label: "£10 off", amount: 10, kind: "flat" },
  WELCOME: { label: "Welcome £5 off", amount: 5, kind: "flat" },
};

export type CheckoutPromoApplied = {
  autoDiscountOn: boolean;
  couponCode: string | null;
};

export function resolveCheckoutPromoTotals(promo: CheckoutPromoApplied): {
  autoDiscountAmount: number;
  couponAmount: number;
  totalDiscount: number;
  couponLabel: string | null;
} {
  const autoDiscountAmount = promo.autoDiscountOn
    ? DUMMY_AUTO_DISCOUNT.amount
    : 0;
  const couponMeta = promo.couponCode
    ? DUMMY_COUPONS[promo.couponCode]
    : null;
  const couponAmount = couponMeta?.amount ?? 0;
  return {
    autoDiscountAmount,
    couponAmount,
    totalDiscount: autoDiscountAmount + couponAmount,
    couponLabel: couponMeta?.label ?? null,
  };
}

export const DEFAULT_CHECKOUT_PROMO: CheckoutPromoApplied = {
  autoDiscountOn: true,
  couponCode: null,
};

type CheckoutPromoPanelProps = {
  formatMoney: (n: number) => string;
  value: CheckoutPromoApplied;
  onChange: (promo: CheckoutPromoApplied) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Dummy customer-facing coupon + discount UI for checkout Order Summary.
 * Controlled local UI only — wire to cart/checkout API when ready.
 */
export function CheckoutPromoPanel({
  formatMoney,
  value,
  onChange,
  className,
  disabled = false,
}: CheckoutPromoPanelProps) {
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const totals = resolveCheckoutPromoTotals(value);
  const couponMeta = value.couponCode
    ? DUMMY_COUPONS[value.couponCode]
    : null;

  const handleApply = () => {
    const normalized = codeInput.trim().toUpperCase();
    if (!normalized) {
      setError("Enter a coupon code");
      return;
    }
    if (!DUMMY_COUPONS[normalized]) {
      setError("That code isn’t valid for this booking");
      return;
    }
    onChange({ ...value, couponCode: normalized });
    setCodeInput("");
    setError(null);
  };

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-[color:var(--checkout-brand-primary)]" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--checkout-foreground)]">
          Offers & codes
        </p>
      </div>

      {value.autoDiscountOn ? (
        <div
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-3 py-2.5",
            "border-emerald-200/80 bg-emerald-50/70",
          )}
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Percent className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-950">
              {DUMMY_AUTO_DISCOUNT.label} applied
            </p>
            <p className="text-xs text-emerald-800/80">
              {DUMMY_AUTO_DISCOUNT.detail}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-emerald-800">
              −{formatMoney(DUMMY_AUTO_DISCOUNT.amount)}
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...value, autoDiscountOn: false })}
              disabled={disabled}
              className="rounded-md p-1 text-emerald-700/70 transition-colors hover:bg-emerald-100 hover:text-emerald-900 disabled:opacity-50"
              aria-label="Remove automatic discount"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...value, autoDiscountOn: true })}
          className={cn(
            "w-full rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2.5 text-left text-xs",
            "text-[color:var(--checkout-muted-foreground)] transition-colors",
            "hover:border-[color:var(--checkout-brand-primary)]/30 hover:bg-[color:var(--checkout-brand-primary)]/5",
            "disabled:opacity-50",
          )}
        >
          Re-apply midweek offer (−{formatMoney(DUMMY_AUTO_DISCOUNT.amount)})
        </button>
      )}

      {value.couponCode && couponMeta ? (
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
              {couponMeta.label}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-[color:var(--checkout-brand-primary)]">
              −{formatMoney(couponMeta.amount)}
            </span>
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
        </div>
      ) : (
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
              placeholder="e.g. SAVE10"
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
          ) : (
            <p className="text-[11px] text-[color:var(--checkout-muted-foreground)]">
              Try TEA50, SAVE10, or WELCOME (demo codes)
            </p>
          )}
        </div>
      )}

      {totals.totalDiscount > 0 ? (
        <p className="text-xs font-medium text-emerald-800">
          You’re saving {formatMoney(totals.totalDiscount)} on this booking
        </p>
      ) : null}
    </div>
  );
}
