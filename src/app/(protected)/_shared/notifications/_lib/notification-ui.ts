import { Notification } from "@/services/common/notification/type";
import {
  isToday,
  isYesterday,
  isThisWeek,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  format,
} from "date-fns";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  Flag,
  Headset,
  Info,
  ShoppingCart,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  bell: Bell,
  flag: Flag,
  calendar: Calendar,
  user: User,
  "credit-card": CreditCard,
  creditcard: CreditCard,
  "shopping-cart": ShoppingCart,
  shoppingcart: ShoppingCart,
  users: Users,
  check: CheckCircle2,
  "check-circle": CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  headset: Headset,
  support: Headset,
};

const SEVERITY_COLOR_MAP: Record<string, string> = {
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-destructive)",
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  event_cancellation: "var(--color-destructive)",
  event_created: "var(--color-info)",
  account: "var(--color-primary)",
  payment: "var(--color-success)",
  order: "var(--color-info)",
  booking: "var(--color-info)",
  support: "var(--color-destructive)",
  event: "var(--color-secondary)",
  customer: "#7c3aed",
  system: "#a16207",
};

/** Soft icon tile styles (Lovable-style feed). */
const CATEGORY_TONE_MAP: Record<string, { bg: string; fg: string }> = {
  payment: { bg: "bg-emerald-50", fg: "text-emerald-700" },
  order: { bg: "bg-sky-50", fg: "text-sky-700" },
  booking: { bg: "bg-sky-50", fg: "text-sky-700" },
  support: { bg: "bg-rose-50", fg: "text-rose-700" },
  account: { bg: "bg-blue-50", fg: "text-blue-700" },
  event: { bg: "bg-indigo-50", fg: "text-indigo-700" },
  event_created: { bg: "bg-sky-50", fg: "text-sky-700" },
  event_cancellation: { bg: "bg-rose-50", fg: "text-rose-700" },
  customer: { bg: "bg-violet-50", fg: "text-violet-700" },
  system: { bg: "bg-amber-50", fg: "text-amber-800" },
};

const DEFAULT_TONE = { bg: "bg-slate-50", fg: "text-slate-600" };

function toKey(value?: string | null): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/^fa\s+fa-/, "")
    .replace(/\s+/g, "-");
}

function parseLegacyIconToKey(icon?: string | null): string | null {
  const normalized = (icon || "").trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("fa-flag") || normalized === "flag") return "flag";
  if (normalized.includes("fa-bell") || normalized === "bell") return "bell";
  if (normalized.includes("fa-check")) return "check-circle";
  if (normalized.includes("fa-user")) return "user";
  if (normalized.includes("headset") || normalized.includes("support"))
    return "headset";

  return toKey(normalized.split(" ").at(-1));
}

function getCategoryLabel(categoryKey: string): string {
  if (categoryKey === "order" || categoryKey === "booking") return "Booking";
  if (categoryKey === "support") return "Support";
  if (categoryKey === "payment") return "Payment";
  if (categoryKey === "customer") return "Customer";
  if (categoryKey === "system") return "System";

  const clean = categoryKey.replace(/[_-]+/g, " ").trim();
  if (!clean) return "System";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function resolveNotificationPresentation(notification: Notification): {
  icon: LucideIcon;
  categoryKey: string;
  categoryLabel: string;
  color: string;
  tone: { bg: string; fg: string };
} {
  const categoryKey = toKey(notification.category) || "system";
  const iconKey =
    toKey(notification.icon_name) ||
    parseLegacyIconToKey(notification.icon) ||
    "bell";
  const severityKey = toKey(notification.severity);

  return {
    icon: ICON_MAP[iconKey] || Bell,
    categoryKey,
    categoryLabel: getCategoryLabel(categoryKey),
    color:
      notification.icon_color ||
      SEVERITY_COLOR_MAP[severityKey] ||
      CATEGORY_COLOR_MAP[categoryKey] ||
      "var(--color-muted)",
    tone: CATEGORY_TONE_MAP[categoryKey] || DEFAULT_TONE,
  };
}

/** Compact relative time: "2h ago", "Yesterday", "4d ago". */
export function formatShortRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const minutes = Math.max(0, differenceInMinutes(now, date));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;

  if (isYesterday(date)) return "Yesterday";

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d ago`;

  return format(date, "dd MMM");
}

export type NotificationDateGroupKey =
  | "today"
  | "yesterday"
  | "this_week"
  | "earlier";

export const NOTIFICATION_DATE_GROUP_LABELS: Record<
  NotificationDateGroupKey,
  string
> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  earlier: "Earlier",
};

export function getNotificationDateGroupKey(
  dateInput: string | Date,
): NotificationDateGroupKey {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "this_week";
  return "earlier";
}

export function groupNotificationsByDate(
  notifications: Notification[],
): Array<{
  key: NotificationDateGroupKey;
  label: string;
  items: Notification[];
}> {
  const buckets: Record<NotificationDateGroupKey, Notification[]> = {
    today: [],
    yesterday: [],
    this_week: [],
    earlier: [],
  };

  for (const notification of notifications) {
    const key = getNotificationDateGroupKey(notification.created_at);
    buckets[key].push(notification);
  }

  return (
    Object.keys(NOTIFICATION_DATE_GROUP_LABELS) as NotificationDateGroupKey[]
  )
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      key,
      label: NOTIFICATION_DATE_GROUP_LABELS[key],
      items: buckets[key],
    }));
}
