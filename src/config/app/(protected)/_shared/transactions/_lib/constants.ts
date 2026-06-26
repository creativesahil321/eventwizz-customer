/**
 * Transaction Constants
 * Configuration for transaction categories, statuses, and display
 */

export const TRANSACTION_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "success", label: "Completed" }, // API uses "success" for completed
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

export const TRANSACTION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "payment", label: "Payment" },
  { value: "refund", label: "Refund" },
  { value: "partial_payment", label: "Partial Payment" },
  { value: "deposit", label: "Deposit" },
  { value: "full_payment", label: "Full Payment" },
];

export const PAYMENT_METHODS = [
  { value: "all", label: "All Methods" },
  { value: "stripe", label: "Card Payment" }, // API uses "stripe" key
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "klarna", label: "Klarna" },
  { value: "truelayer", label: "TrueLayer" },
];

// Status configuration with colors and icons
// Using informative, semantic colors for better UX
export const STATUS_CONFIG: Record<
  string,
  {
    color: string; // Text/icon color
    bgColor: string; // Background color for badges/icons
    badgeBg: string; // Badge background (solid)
    badgeText: string; // Badge text color
    icon: string;
    label: string; // Display label
  }
> = {
  pending: {
    color: "#f59e0b", // Amber 500 - informative warning color
    bgColor: "bg-amber-50 border-amber-200",
    badgeBg: "#f59e0b", // Amber 500
    badgeText: "#ffffff",
    icon: "Clock",
    label: "Pending",
  },
  success: {
    // API uses "success" for completed
    color: "#10b981", // Green 500 - success/positive
    bgColor: "bg-green-50 border-green-200",
    badgeBg: "#10b981", // Green 500
    badgeText: "#ffffff",
    icon: "CheckCircle2",
    label: "Completed",
  },
  completed: {
    // Fallback for "completed"
    color: "#10b981", // Green 500
    bgColor: "bg-green-50 border-green-200",
    badgeBg: "#10b981", // Green 500
    badgeText: "#ffffff",
    icon: "CheckCircle2",
    label: "Completed",
  },
  failed: {
    color: "#ef4444", // Red 500 - error/destructive
    bgColor: "bg-red-50 border-red-200",
    badgeBg: "#ef4444", // Red 500
    badgeText: "#ffffff",
    icon: "XCircle",
    label: "Failed",
  },
  refunded: {
    color: "#3b82f6", // Blue 500 - informational
    bgColor: "bg-blue-50 border-blue-200",
    badgeBg: "#3b82f6", // Blue 500
    badgeText: "#ffffff",
    icon: "RefreshCw",
    label: "Refunded",
  },
  cancelled: {
    color: "#6b7280", // Gray 500 - neutral/muted
    bgColor: "bg-gray-50 border-gray-200",
    badgeBg: "#6b7280", // Gray 500
    badgeText: "#ffffff",
    icon: "X",
    label: "Cancelled",
  },
};

// Payment method icons
export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  stripe: "CreditCard", // Card Payment
  card: "CreditCard",
  bank_transfer: "Building2",
  paypal: "Wallet",
  worldpay: "CreditCard",
  klarna: "ShoppingBag",
  truelayer: "Building2",
};
