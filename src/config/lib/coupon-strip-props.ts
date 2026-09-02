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
  id?: number | null;
  coupon_code?: string | null;
  /** Small uppercase eyebrow on the strip (e.g. "Limited time offer"). */
  banner_heading?: string | null;
  /** Main promo line under the heading (API: `banner_subheading`). */
  banner_subheading?: string | null;
  /** @deprecated Prefer `banner_subheading`. */
  dynamic_text?: string | null;
  /** Preformatted badge from API (e.g. `50% OFF`). */
  value_label?: string | null;
  discount_type?: "percentage" | "flat" | string | null;
  value_type?: "percentage" | "flat" | string | null;
  /** API amount — percentage value. */
  amount?: number | null;
  /** @deprecated Prefer `amount` (vendor form alias). */
  discount_value?: number | null;
  /** Not used for coupons. Kept for date-offer reuse. */
  flat_mode?: string | null;
  expires_at?: string | null;
  /** API: show coupon banner on the event page. */
  show_on_event_page?: boolean | null;
  /** @deprecated Prefer `show_on_event_page`. */
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

/** Compact badge for the strip, e.g. `50% OFF`. */
export function formatCouponStripBadge(source: CouponStripSource): string {
  const amount = resolveAmount(source);
  const valueType = resolveValueType(source);
  if (!(amount > 0) || valueType !== "percentage") return "";

  return `${amount}% OFF`;
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
 * Returns `null` when the strip should not show (`show_on_event_page` /
 * legacy `show_on_banner` false, or no code).
 */
function couponStripVisible(source: CouponStripSource): boolean {
  if (typeof source.show_on_event_page === "boolean") {
    return source.show_on_event_page;
  }
  if (typeof source.show_on_banner === "boolean") {
    return source.show_on_banner;
  }
  return true;
}

export function couponToStripProps(
  source: CouponStripSource | null | undefined,
): CouponStripMappedProps | null {
  if (!source) return null;
  if (!couponStripVisible(source)) return null;

  const code = source.coupon_code?.trim() ?? "";
  if (!code) return null;

  const heading = source.banner_heading?.trim() ?? "";
  // Subheading only when the vendor/API set it — never invent a default line.
  const subheading =
    source.banner_subheading?.trim() || source.dynamic_text?.trim() || "";

  const label = (heading || COUPON_STRIP_DEFAULT_HEADING).slice(
    0,
    COUPON_BANNER_HEADING_MAX,
  );

  const apiBadge = source.value_label?.trim() ?? "";

  return {
    code,
    label,
    badge: apiBadge || formatCouponStripBadge(source) || undefined,
    headline: subheading
      ? subheading.slice(0, COUPON_BANNER_TEXT_MAX)
      : undefined,
    endsAt: couponStripEndsAt(source.expires_at),
  };
}
