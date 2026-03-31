export interface TableData {
  id: string; // Internal ID for React state management
  tableConfigId: number; // Actual table configuration ID from backend (required for API)
  capacity: number;
  table_count: number;
  allocation: number[]; // Simple array for internal state (e.g., [8, 8])
  parent_ids: number[]; // Parent IDs from backend (e.g., [127, 128])
  people_added: number;
  price_per_person: number;
}

/** Normalized from booking details API (see adjust-booking-content) */
export type BookingDatePaymentStatus =
  | "paid"
  | "pending"
  | "partial"
  | "refunded"
  | "cancelled";

export interface BookingDate {
  id: string;
  date: string;
  people: number;
  /** When missing, date is treated as eligible (legacy API) */
  paymentStatus?: BookingDatePaymentStatus;
  tables?: TableData[];
}

/** Add-ons / edits allowed only for active payment states */
export function isBookingDateEligibleForAddOns(
  status?: BookingDatePaymentStatus,
): boolean {
  if (status === undefined) return true;
  return status === "paid" || status === "pending" || status === "partial";
}

export interface DrinkItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  maxQuantity?: number;
}

export interface TicketItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  maxQuantity?: number;
}

export interface AvailableTableSize {
  id: number;
  size: number;
  min_persons: number;
  max_persons: number;
  price: number;
  available: number;
}

export interface NewTableState {
  quantity: number;
  allocation: number[];
}
