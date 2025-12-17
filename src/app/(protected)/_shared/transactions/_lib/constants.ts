/**
 * Transaction Constants
 * Configuration for transaction categories, statuses, and display
 */

export const TRANSACTION_STATUSES = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
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
  { value: "card", label: "Card Payment" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "worldpay", label: "WorldPay" },
  { value: "klarna", label: "Klarna" },
  { value: "truelayer", label: "TrueLayer" },
];

// Status configuration with colors and icons
export const STATUS_CONFIG: Record<
  string,
  { color: string; icon: string; bgColor: string }
> = {
  pending: {
    color: "var(--color-warning)",
    icon: "Clock",
    bgColor: "bg-amber-50 border-amber-200",
  },
  completed: {
    color: "var(--color-success)",
    icon: "CheckCircle2",
    bgColor: "bg-green-50 border-green-200",
  },
  failed: {
    color: "var(--color-destructive)",
    icon: "XCircle",
    bgColor: "bg-red-50 border-red-200",
  },
  refunded: {
    color: "var(--color-info)",
    icon: "RefreshCw",
    bgColor: "bg-blue-50 border-blue-200",
  },
  cancelled: {
    color: "var(--color-muted)",
    icon: "X",
    bgColor: "bg-gray-50 border-gray-200",
  },
};

// Payment method icons
export const PAYMENT_METHOD_ICONS: Record<string, string> = {
  card: "CreditCard",
  bank_transfer: "Building2",
  stripe: "CreditCard",
  paypal: "Wallet",
  worldpay: "CreditCard",
  klarna: "ShoppingBag",
  truelayer: "Building2",
};
