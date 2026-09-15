/** Door-entry QR payload: `ewz1.<base64url>.<hmac-sha256-hex>` */
export const DOOR_ENTRY_TOKEN_PREFIX = "ewz1.";

export const NOT_EVENTWIZZ_QR_MESSAGE =
  "This is not an EventWizz invoice QR. Use the code on the booking invoice.";

export function isEventWizzDoorEntryToken(raw: string): boolean {
  const token = raw.trim();
  if (!token) return false;

  const lower = token.toLowerCase();
  if (lower.startsWith("http:") || lower.startsWith("https:")) return false;
  if (lower.startsWith("wifi:")) return false;

  return token.startsWith(DOOR_ENTRY_TOKEN_PREFIX);
}
