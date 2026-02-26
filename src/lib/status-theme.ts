/**
 * Shared status color theme for the app.
 * Use the same soft pill style (light bg + dark text) everywhere:
 * - Success/Paid: green
 * - Pending: amber
 * - Processing/Partial/Info: blue
 * - Failed/Cancelled: red
 * - Refunded/Neutral: gray
 */

export const STATUS_THEME = {
  /** Success, Paid, Confirmed */
  success:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  /** Pending, Draft */
  pending:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  /** Processing, Partially paid, Info */
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  /** Failed, Cancelled, Error */
  destructive:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  /** Refunded, Neutral, Default */
  neutral:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
} as const;

export type StatusThemeKey = keyof typeof STATUS_THEME;

/**
 * Normalized status key for lookup (lowercase, common aliases).
 */
function normalizeStatus(status: string): string {
  const s = status?.toLowerCase().trim() || "";
  if (s.includes("paid") || s === "confirmed" || s === "success" || s === "completed") return "success";
  if (s.includes("pending") || s === "draft") return "pending";
  if (s.includes("partial") || s === "processing") return "info";
  if (s.includes("fail") || s.includes("cancel") || s === "cancelled") return "destructive";
  if (s.includes("refund")) return "neutral";
  if (s === "partially_paid") return "info";
  return "neutral";
}

/**
 * Returns Tailwind classes for a status pill (same style as Email Logs Success/Paid).
 * Use for div/Badge that displays status text.
 */
export function getStatusClassName(status: string): string {
  const key = normalizeStatus(status) as StatusThemeKey;
  return `inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${STATUS_THEME[key]}`;
}

/**
 * Returns only the color part (no layout). Use when you need to merge with existing className.
 */
export function getStatusColorClass(status: string): string {
  const key = normalizeStatus(status) as StatusThemeKey;
  return STATUS_THEME[key];
}

/**
 * Returns theme key for the status (e.g. for icons or conditional logic).
 */
export function getStatusThemeKey(status: string): StatusThemeKey {
  return normalizeStatus(status) as StatusThemeKey;
}
