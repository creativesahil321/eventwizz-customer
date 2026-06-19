import type { LineItemKind } from "./item-kinds";

export interface AllocationPill {
  label: string;
  value: string;
}

export interface CheckoutLineItem {
  id: string;
  kind: LineItemKind;
  name: string;
  description?: string;
  meta: string;
  amount: number;
  allocation?: AllocationPill[];
  quantity?: number;
  /** When true, show delete action (saved add-ons only) */
  deletable?: boolean;
  deletePayload?: {
    type: "table" | "package" | "ticket";
    keyword: string | number;
  };
  /** Menu choices shortcut for table rows */
  showMenuChoices?: boolean;
}

export interface CheckoutDateCard {
  id: string;
  booking_date_id: number;
  date: string;
  subtitle?: string;
  amount: number;
  amountFormatted: string;
  paymentStatus: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  canPayNow?: boolean;
}

export interface PaymentBreakdownLine {
  id: string;
  label: string;
  meta: string;
  amount: number;
  isAddon?: boolean;
}

export interface PaymentBreakdownGroup {
  id: string;
  title: string;
  subtotal: number;
  lines: PaymentBreakdownLine[];
  isExtras?: boolean;
}
