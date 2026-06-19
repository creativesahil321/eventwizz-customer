import { Notification } from "@/services/common/notification/type";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  Flag,
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
  event: "var(--color-secondary)",
  customer: "var(--color-warning)",
  system: "var(--color-muted)",
};

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

  return toKey(normalized.split(" ").at(-1));
}

function getCategoryLabel(categoryKey: string): string {
  const clean = categoryKey.replace(/[_-]+/g, " ").trim();
  if (!clean) return "System";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function resolveNotificationPresentation(notification: Notification): {
  icon: LucideIcon;
  categoryKey: string;
  categoryLabel: string;
  color: string;
} {
  const categoryKey = toKey(notification.category) || "system";
  const iconKey =
    toKey(notification.icon_name) || parseLegacyIconToKey(notification.icon) || "bell";
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
  };
}
