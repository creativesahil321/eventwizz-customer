/** Vendor booking payment status helpers — API is source of truth. */

export interface VendorStatusOptionLike {
  value: number;
  label: string;
}

/** Resolve status code from API fields (legacy bookings may lack `payment_status_code`). */
export function resolvePaymentStatusCode(date: {
  payment_status_code?: number;
  payment_status_label?: string;
}): number {
  if (date.payment_status_code != null) return date.payment_status_code;

  const status = date.payment_status_label?.toLowerCase().trim() ?? "";
  if (status === "paid" || (status.includes("paid") && !status.includes("partial"))) {
    return 2;
  }
  if (status.includes("partial")) return 1;
  if (status.includes("cancel")) return 3;
  if (status.includes("refund")) return 4;
  if (status.includes("failed")) return 6;
  return 0;
}

export function getPaymentStatusNumber(status: string): number {
  return resolvePaymentStatusCode({ payment_status_label: status });
}

/** Label for a status code — prefer API `vendor_status_options`, then `payment_status_label` fallbacks. */
export function getPaymentStatusLabel(
  statusNumber: number,
  options?: VendorStatusOptionLike[],
): string {
  const fromApi = options?.find((option) => option.value === statusNumber);
  if (fromApi?.label) return fromApi.label;

  switch (statusNumber) {
    case 0:
      return "Pending";
    case 1:
      return "Partial Payment";
    case 2:
      return "Paid";
    case 3:
      return "Cancelled";
    case 4:
      return "Refunded";
    case 5:
      return "Partial Payment";
    case 6:
      return "Failed";
    default:
      return "Unknown";
  }
}

/**
 * Allowed status transitions for the vendor dropdown.
 * When the API sends `vendor_status_options`, use them as-is — the backend defines valid targets.
 */
export function getAllowedStatusOptions(
  _currentStatusCode: number,
  apiOptions?: VendorStatusOptionLike[],
): VendorStatusOptionLike[] {
  if (apiOptions?.length) {
    return apiOptions;
  }

  // Legacy fallback when API omits options (old bookings / transitional responses).
  return [];
}

export function normalizeVendorPaymentStatus(
  status: string,
): "paid" | "pending" | "partial" | "refunded" | "cancelled" {
  const s = status?.toLowerCase().trim() ?? "";
  if (s === "paid" || (s.includes("paid") && !s.includes("partial"))) return "paid";
  if (s.includes("refund")) return "refunded";
  if (s.includes("cancel")) return "cancelled";
  if (s === "partial payment" || s.includes("partial")) return "partial";
  return "pending";
}
