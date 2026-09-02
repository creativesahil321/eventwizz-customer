import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

export const DEFAULT_ADMIN_TRANSACTION_STATUS = "success";

export const ADMIN_TRANSACTION_STATUS_OPTIONS = [
  { label: "Success", value: "success" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
] as const;

export const ADMIN_TRANSACTION_SORT_FIELDS = [
  "booking_date",
  "event_date",
  "amount",
  "platform_fee",
] as const;

export type AdminTransactionSortField =
  (typeof ADMIN_TRANSACTION_SORT_FIELDS)[number];

export function dateParamsFromRange(range: DateRange | undefined): {
  booking_date?: string;
  from_date?: string;
  to_date?: string;
} {
  if (!range?.from) return {};
  const from = format(range.from, "yyyy-MM-dd");
  const to = range.to ? format(range.to, "yyyy-MM-dd") : from;
  if (from === to) return { booking_date: from };
  return { from_date: from, to_date: to };
}

export function formatAdminTransactionEarnings(
  earningsFormatted?: string,
  earnings?: string,
): string {
  if (earningsFormatted?.trim()) return earningsFormatted.trim();
  if (earnings == null || earnings === "") return "£0.00";
  return earnings.startsWith("£") ? earnings : `£${earnings}`;
}

export function isAdminTransactionReceiptAvailable(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "success" || normalized === "executed";
}

export function isAdminTransactionSortField(
  value: string | undefined,
): value is AdminTransactionSortField {
  return (
    !!value &&
    (ADMIN_TRANSACTION_SORT_FIELDS as readonly string[]).includes(value)
  );
}
