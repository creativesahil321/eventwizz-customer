/** Shared cancel/status signals for vendor step-3 event dates (API + form). */
export type VendorDateCancelSignals = {
  status?: number | null;
  cancelled?: boolean | null;
  is_cancelled?: boolean | null;
  is_readonly?: boolean | null;
  can_edit?: boolean | null;
  date_action?: string | null;
};

/**
 * True when the date should render as Cancelled (persisted or pending save).
 * Matches: status === 2 | is_cancelled | date_action === "cancelled" | cancelled.
 */
export function isVendorDateCancelled(
  date?: VendorDateCancelSignals | null,
): boolean {
  if (!date) return false;
  if (date.cancelled === true) return true;
  if (date.is_cancelled === true) return true;
  if (date.date_action === "cancelled") return true;
  if (date.status === 2) return true;
  return false;
}

/**
 * Already cancelled on the server — read-only; no edit / remove / cancel / reactivate.
 */
export function isVendorDateReadonlyCancelled(
  date?: VendorDateCancelSignals | null,
): boolean {
  if (!date) return false;
  if (date.is_readonly === true) return true;
  if (date.is_cancelled === true) return true;
  if (date.date_action === "cancelled") return true;
  if (date.status === 2) return true;
  if (date.can_edit === false && isVendorDateCancelled(date)) return true;
  return false;
}
