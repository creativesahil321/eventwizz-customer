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

export type NotificationFeedFilter = {
  id: string;
  label: string;
  type: "all" | "status" | "category";
  value?: string;
};

const FEED_FILTER_ALL: NotificationFeedFilter = {
  id: "all",
  label: "All",
  type: "all",
};

const FEED_FILTER_UNREAD: NotificationFeedFilter = {
  id: "unread",
  label: "Unread",
  type: "status",
  value: "unread",
};

const FEED_FILTER_BOOKINGS: NotificationFeedFilter = {
  id: "bookings",
  label: "Bookings",
  type: "category",
  value: "order",
};

const FEED_FILTER_PAYMENTS: NotificationFeedFilter = {
  id: "payments",
  label: "Payments",
  type: "category",
  value: "payment",
};

const FEED_FILTER_CUSTOMER: NotificationFeedFilter = {
  id: "customer",
  label: "Customer",
  type: "category",
  value: "customer",
};

const FEED_FILTER_SYSTEM: NotificationFeedFilter = {
  id: "system",
  label: "System",
  type: "category",
  value: "system",
};

/**
 * Role-aware feed chips.
 * "Customer" is only for vendor/admin (customer activity alerts) — never on customer dashboards.
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
    FEED_FILTER_CUSTOMER,
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
