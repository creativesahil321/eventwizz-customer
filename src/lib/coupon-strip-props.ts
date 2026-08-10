import type { EventCouponStripProps } from "@/components/public/event-coupon-strip";

/** Max length for strip eyebrow / banner heading. */
export const COUPON_BANNER_HEADING_MAX = 40;

/** Max length for vendor `dynamic_text` / strip subheading (main line). */
export const COUPON_BANNER_TEXT_MAX = 120;

export const COUPON_STRIP_DEFAULT_HEADING = "Limited time offer";

/**
 * Fields needed to build the public coupon strip.
 * Accepts vendor form shape (`value_type` / `discount_value`) or API shape
 * (`discount_type` / `amount`).
 */
export type CouponStripSource = {
  coupon_code?: string | null;
  /** Small uppercase eyebrow on the strip (e.g. "Limited time offer"). */
  banner_heading?: string | null;
  /** Main promo line under the heading. */
  dynamic_text?: string | null;
  discount_type?: "percentage" | "flat" | string | null;
  value_type?: "percentage" | "flat" | string | null;
  amount?: number | null;
  discount_value?: number | null;
  flat_mode?: string | null;
  expires_at?: string | null;
  show_on_banner?: boolean | null;
};

export type CouponStripMappedProps = Pick<
  EventCouponStripProps,
  "code" | "label" | "badge" | "headline" | "endsAt"
>;

function resolveValueType(
  source: CouponStripSource,
): "percentage" | "flat" | null {
  const raw = source.value_type ?? source.discount_type;
  if (raw === "percentage" || raw === "flat") return raw;
  return null;
}

function resolveAmount(source: CouponStripSource): number {
  const n = Number(source.discount_value ?? source.amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Compact badge for the strip, e.g. `50% OFF` or `£10 OFF`. */
export function formatCouponStripBadge(source: CouponStripSource): string {
  const amount = resolveAmount(source);
  const valueType = resolveValueType(source);
  if (!(amount > 0) || !valueType) return "";

  if (valueType === "percentage") {
    return `${amount}% OFF`;
  }

  const formatted = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  if (source.flat_mode === "per_person") {
    return `£${formatted} / PERSON`;
  }
  return `£${formatted} OFF`;
}

/**
 * Normalize expiry for the countdown.
 * Date-only `YYYY-MM-DD` → end of that local day so the strip stays live all day.
 */
export function couponStripEndsAt(
  expiresAt: string | null | undefined,
): string | undefined {
  const raw = expiresAt?.trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T23:59:59`;
  }
  return raw;
}

/**
 * Map coupon form / API fields → `EventCouponStrip` props.
 * Returns `null` when the strip should not show (`show_on_banner` false or no code).
 */
export function couponToStripProps(
  source: CouponStripSource | null | undefined,
): CouponStripMappedProps | null {
  if (!source) return null;
  if (source.show_on_banner === false) return null;

  const code = source.coupon_code?.trim() ?? "";
  if (!code) return null;

  const label = (
    source.banner_heading?.trim() || COUPON_STRIP_DEFAULT_HEADING
  ).slice(0, COUPON_BANNER_HEADING_MAX);

  const headline = (source.dynamic_text?.trim() ?? "").slice(
    0,
    COUPON_BANNER_TEXT_MAX,
  );

  return {
    code,
    label,
    badge: formatCouponStripBadge(source) || undefined,
    headline: headline || undefined,
    endsAt: couponStripEndsAt(source.expires_at),
  };
}

/**
 * Demo coupon shaped like the API — used on the public event page until
 * banner coupons are returned with the event payload.
 */
function demoCouponExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DEMO_EVENT_BANNER_COUPON: CouponStripSource = {
  coupon_code: "TEA50",
  banner_heading: COUPON_STRIP_DEFAULT_HEADING,
  dynamic_text: "Claim Your 50% Off Afternoon Tea",
  discount_type: "percentage",
  amount: 50,
  flat_mode: null,
  expires_at: demoCouponExpiresAt(),
  show_on_banner: true,
};
