/**
 * Parse optional promo savings from customer booking APIs.
 * Backend omits the key when there is no discount — never sends 0/null.
 */
export function parseSavedAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
