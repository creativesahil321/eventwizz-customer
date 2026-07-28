import type { UserRole } from "@/services/common/notification/type";

export const NOTIFICATION_CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "account", label: "Account" },
  { value: "payment", label: "Payment" },
  { value: "order", label: "Booking" },
  { value: "event", label: "Event" },
  { value: "customer", label: "Customer" },
  { value: "system", label: "System" },
];

export const NOTIFICATION_STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "read", label: "Read" },
  { value: "unread", label: "Unread" },
];

/**
 * Feed chips map 1:1 to the API `filter` query param
 * (e.g. `?filter=bookings`, `?filter=customers`).
 */
export type NotificationFeedFilter = {
  id: string;
  label: string;
  /** Omit for "All" (no `filter` query param). */
  filter?:
    | "unread"
    | "bookings"
    | "payments"
    | "customers"
    | "system";
};

const FEED_FILTER_ALL: NotificationFeedFilter = {
  id: "all",
  label: "All",
};

const FEED_FILTER_UNREAD: NotificationFeedFilter = {
  id: "unread",
  label: "Unread",
  filter: "unread",
};

const FEED_FILTER_BOOKINGS: NotificationFeedFilter = {
  id: "bookings",
  label: "Bookings",
  filter: "bookings",
};

const FEED_FILTER_PAYMENTS: NotificationFeedFilter = {
  id: "payments",
  label: "Payments",
  filter: "payments",
};

const FEED_FILTER_CUSTOMERS: NotificationFeedFilter = {
  id: "customers",
  label: "Customers",
  filter: "customers",
};

const FEED_FILTER_SYSTEM: NotificationFeedFilter = {
  id: "system",
  label: "System",
  filter: "system",
};

/**
 * Role-aware feed chips.
 * "Customers" is only for vendor/admin — never on customer dashboards.
 */
export function getNotificationFeedFilters(
  role: UserRole | string | null | undefined,
): NotificationFeedFilter[] {
  const normalizedRole = (role || "").toLowerCase();

  if (normalizedRole === "customer") {
    return [
      FEED_FILTER_ALL,
      FEED_FILTER_UNREAD,
      FEED_FILTER_BOOKINGS,
      FEED_FILTER_PAYMENTS,
      FEED_FILTER_SYSTEM,
    ];
  }

  // vendor + admin (and fallback)
  return [
    FEED_FILTER_ALL,
    FEED_FILTER_UNREAD,
    FEED_FILTER_BOOKINGS,
    FEED_FILTER_PAYMENTS,
    FEED_FILTER_CUSTOMERS,
    FEED_FILTER_SYSTEM,
  ];
}

/** @deprecated Prefer getNotificationFeedFilters(role) */
export const NOTIFICATION_FEED_FILTERS = getNotificationFeedFilters("vendor");

// Map categories to colors/icons
export const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> =
  {
    account: {
      color: "var(--color-primary)",
      icon: "User",
    },
    payment: {
      color: "var(--color-success)",
      icon: "CreditCard",
    },
    order: {
      color: "var(--color-info)",
      icon: "ShoppingCart",
    },
    event: {
      color: "var(--color-secondary)",
      icon: "Calendar",
    },
    customer: {
      color: "var(--color-warning)",
      icon: "Users",
    },
    system: {
      color: "var(--color-muted)",
      icon: "Bell",
    },
  };
