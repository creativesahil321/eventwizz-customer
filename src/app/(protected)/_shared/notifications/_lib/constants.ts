export const NOTIFICATION_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "account", label: "Account" },
  { value: "payment", label: "Payment" },
  { value: "order", label: "Order" },
  { value: "event", label: "Event" },
  { value: "customer", label: "Customer" },
  { value: "system", label: "System" },
];

export const NOTIFICATION_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "read", label: "Read" },
  { value: "unread", label: "Unread" },
];

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
