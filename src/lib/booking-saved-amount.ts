/**
 * Parse optional promo savings from booking APIs.
 * Backend omits the key when there is no discount — never sends 0/null.
 */
export function parseSavedAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Parse optional coupon code from booking APIs.
 * Omitted when no coupon was used (date-only discounts may still have savings).
 */
export function parseCouponCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
