export {
  CATEGORY_LABELS,
  CLOSED_TICKET_STATUSES,
  formatRelativeTime,
  formatSupportMessageDate,
  formatSupportMessageTimestamp,
  getPriorityClass,
  getStatusClass,
  groupMessagesByDate,
  isClosedTicketStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
} from "@/app/(protected)/customer/support/_lib/utils";

import { endOfDay, format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import type { SupportCategory } from "./types";
import type { DashboardDateFilter, DashboardDateRange } from "./types";

export const VENDOR_CATEGORY_LABELS: Record<SupportCategory, string> = {
  general_support: "Event support",
  technical_support: "Technical support",
};

export const CLOSE_TICKET_REASON_LABELS = {
  issue_resolved: "Issue resolved",
  duplicate_ticket: "Duplicate ticket",
  customer_no_response: "Customer didn't respond",
} as const;

export const TRANSFER_REASON_LABELS = {
  technical_issue: "Technical issue",
  other: "Others",
} as const;

export const DASHBOARD_DATE_LABELS: Record<DashboardDateRange, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

export function isWithinDateRange(iso: string, range: DashboardDateRange): boolean {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (range === "today") return diff <= day;
  if (range === "7d") return diff <= day * 7;
  if (range === "30d") return diff <= day * 30;
  return true;
}

export function matchesDashboardDateFilter(
  iso: string,
  filter: DashboardDateFilter
): boolean {
  if (filter.customRange) {
    const date = new Date(iso);
    return (
      date >= startOfDay(filter.customRange.from) &&
      date <= endOfDay(filter.customRange.to)
    );
  }
  return isWithinDateRange(iso, filter.preset);
}

export function formatDashboardPeriodLabel(filter: DashboardDateFilter): string {
  if (filter.customRange) {
    return `${format(filter.customRange.from, "d MMM yyyy")} – ${format(filter.customRange.to, "d MMM yyyy")}`;
  }
  return DASHBOARD_DATE_LABELS[filter.preset];
}

export function toDashboardDateFilter(
  preset: DashboardDateRange,
  customRange?: DateRange
): DashboardDateFilter {
  if (customRange?.from && customRange?.to) {
    return { preset, customRange: { from: customRange.from, to: customRange.to } };
  }
  return { preset };
}

export function formatOpenedAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
