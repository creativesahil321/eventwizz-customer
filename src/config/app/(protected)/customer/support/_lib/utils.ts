import type { SupportCategory, SupportPriority, SupportStatus } from "./types";

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function formatSupportMessageDate(iso: string): string {
  const date = new Date(iso);
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .toUpperCase();
}

export function formatSupportMessageTimestamp(iso: string): string {
  const date = new Date(iso);
  const dayMonth = date.toLocaleDateString("en-GB", {
    month: "short",
    day: "2-digit",
  });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dayMonth} • ${time}`;
}

export function groupMessagesByDate<T extends { createdAt: string }>(
  messages: T[]
): { date: string; messages: T[] }[] {
  const groups: { date: string; messages: T[] }[] = [];

  for (const message of messages) {
    const date = formatSupportMessageDate(message.createdAt);
    const lastGroup = groups[groups.length - 1];

    if (!lastGroup || lastGroup.date !== date) {
      groups.push({ date, messages: [message] });
      continue;
    }

    lastGroup.messages.push(message);
  }

  return groups;
}

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  general_support: "Event & booking support",
  technical_support: "Account & technical support",
};

export const SUPPORT_PRIORITIES: SupportPriority[] = ["low", "medium", "high"];

export const PRIORITY_LABELS: Record<SupportPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const SUPPORT_STATUSES: SupportStatus[] = [
  "new",
  "open",
  "reopen",
  "waiting_customer",
  "waiting_general_support",
  "waiting_platform_support",
  "resolved",
  "closed",
];

/** Customer inbox status filter — excludes internal waiting queues. */
export const CUSTOMER_INBOX_STATUS_FILTERS: SupportStatus[] = [
  "new",
  "open",
  "reopen",
  "waiting_customer",
  "resolved",
  "closed",
];

export const STATUS_LABELS: Record<SupportStatus, string> = {
  new: "New",
  open: "Open",
  reopen: "Reopened",
  waiting_customer: "Awaiting your reply",
  waiting_general_support: "With our support team",
  waiting_platform_support: "With technical support",
  resolved: "Resolved",
  closed: "Closed",
};

export const CLOSED_TICKET_STATUSES: SupportStatus[] = ["closed", "resolved"];

export function normalizeSupportStatus(
  status: string | null | undefined
): SupportStatus {
  const normalized = (status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "reopened") return "reopen";
  // Legacy / alias keys → current API contract
  if (
    normalized === "waiting_event_admin" ||
    normalized === "waiting_you"
  ) {
    return "waiting_general_support";
  }
  if (normalized === "waiting_vendor") {
    return "waiting_general_support";
  }
  if (
    normalized === "waiting_platform" ||
    normalized === "waiting_from_you" ||
    normalized === "waiting_technical_support"
  ) {
    return "waiting_platform_support";
  }
  if ((SUPPORT_STATUSES as string[]).includes(normalized)) {
    return normalized as SupportStatus;
  }
  return "new";
}

export function getStatusLabel(
  status: string | null | undefined,
  fallbackLabel?: string | null
): string {
  // Badge text should come from API `status_label`. This is only a last-resort for status keys.
  if (fallbackLabel?.trim()) return fallbackLabel.trim();
  return STATUS_LABELS[normalizeSupportStatus(status)];
}

export function isClosedTicketStatus(status: SupportStatus): boolean {
  return CLOSED_TICKET_STATUSES.includes(status);
}

export function getPriorityClass(priority: SupportPriority): string {
  const map: Record<SupportPriority, string> = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    medium: "bg-blue-50 text-blue-700 border-blue-200",
    high: "bg-red-50 text-red-700 border-red-200",
  };
  return map[priority] ?? map.medium;
}

export function getStatusClass(status: SupportStatus): string {
  const map: Record<SupportStatus, string> = {
    new: "bg-violet-50 text-violet-700 border-violet-200",
    open: "bg-sky-50 text-sky-700 border-sky-200",
    reopen: "bg-blue-50 text-blue-700 border-blue-200",
    waiting_customer: "bg-orange-50 text-orange-700 border-orange-200",
    waiting_general_support: "bg-indigo-50 text-indigo-700 border-indigo-200",
    waiting_platform_support: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return map[status] ?? map.new;
}
