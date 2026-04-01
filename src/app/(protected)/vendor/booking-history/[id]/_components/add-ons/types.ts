import type { BookingDatePaymentStatus } from "@/lib/booking-addons-eligibility";

export type { BookingDatePaymentStatus } from "@/lib/booking-addons-eligibility";
export { isBookingDateEligibleForAddOns } from "@/lib/booking-addons-eligibility";

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

export interface BookingDate {
  id: string;
  date: string;
  people: number;
  paymentStatus?: BookingDatePaymentStatus;
  tables?: TableData[];
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
