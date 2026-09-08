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
  isTicketReopened,
  PRIORITY_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  normalizeSupportStatus,
} from "@/app/(protected)/customer/support/_lib/utils";

import {
  STATUS_LABELS as CUSTOMER_STATUS_LABELS,
  normalizeSupportStatus,
  sanitizeSupportStatusLabel,
} from "@/app/(protected)/customer/support/_lib/utils";
import type { SupportStatus } from "@/app/(protected)/customer/support/_lib/types";
import { endOfDay, format, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import type {
  AdminSupportConversation,
  AdminSupportQueue,
  DashboardDateFilter,
  DashboardDateRange,
  SupportSource,
  WaitingParty,
} from "./types";

/** Admin badge/filter labels — platform team copy (not customer/vendor wording). */
export const STATUS_LABELS: Record<SupportStatus, string> = {
  ...CUSTOMER_STATUS_LABELS,
  waiting_customer: "Waiting for Customer",
  waiting_general_support: "Waiting for Vendor",
  waiting_platform_support: "Waiting for You",
};

/**
 * Admin inbox status filter.
 * New = untouched tickets. Open = not closed or resolved. Closed = closed.
 * Reopened is a badge (`reopened`), not a filter.
 */
export const ADMIN_INBOX_STATUS_FILTERS = [
  "new",
  "open",
  "closed",
] as const;

export type AdminInboxStatusFilter =
  (typeof ADMIN_INBOX_STATUS_FILTERS)[number];

export function getStatusLabel(
  status: string | null | undefined,
  fallbackLabel?: string | null
): string {
  return (
    sanitizeSupportStatusLabel(fallbackLabel) ||
    STATUS_LABELS[normalizeSupportStatus(status)]
  );
}

export const ADMIN_CATEGORY_LABELS = {
  general_support: "General support",
  technical_support: "Technical support",
} as const;

export const ADMIN_QUEUE_LABELS: Record<AdminSupportQueue, string> = {
  general_support: "General support",
  technical_support: "Technical support",
  customer: "Customer tickets",
  vendor: "Vendor tickets",
};

export const ADMIN_SOURCE_LABELS: Record<SupportSource, string> = {
  customer: "Customer",
  vendor: "Vendor",
};

export const WAITING_PARTY_LABELS: Record<WaitingParty, string> = {
  customer: "Customer",
  vendor: "Vendor",
};

export const CLOSE_TICKET_REASON_LABELS = {
  issue_resolved: "Issue resolved",
  duplicate_ticket: "Duplicate ticket",
  customer_didnt_respond: "Customer didn't respond",
} as const;

export function getCloseTicketReasonLabel(
  reason: keyof typeof CLOSE_TICKET_REASON_LABELS,
  source: SupportSource
): string {
  if (reason === "customer_didnt_respond" && source === "vendor") {
    return "Vendor didn't respond";
  }
  return CLOSE_TICKET_REASON_LABELS[reason];
}

export function getCloseTicketReopenDescription(source: SupportSource): string {
  if (source === "vendor") {
    return "The vendor can reopen this ticket for the next 14 days by replying to the thread.";
  }
  return "The customer can reopen this ticket for the next 14 days by replying to the thread.";
}

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

export function isWaitingConversation(
  conversation: AdminSupportConversation
): boolean {
  return Boolean(conversation.waitingOn);
}

export function getConversationQueue(
  conversation: AdminSupportConversation
): AdminSupportQueue {
  if (conversation.source === "vendor") return "vendor";
  if (conversation.category === "technical_support") return "technical_support";
  return "general_support";
}
