import { Row } from "@tanstack/react-table";

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  status: string;
}

export interface History {
  id: string; // Maps to booking_id from API
  booking_id?: number; // Original booking_id from API
  booking_number?: string; // Booking number from API (e.g., "EV-007")
  event_id?: string | number; // Event ID for navigation to event page
  event_name: string;
  user_name: string;
  user_id?: number; // User ID from API
  booking_date: string; // Format: "05-11-2025"
  tickets?: number;
  total_table?: number;
  total_people?: number;
  paid_amount?: number;
  balance_amount?: number;
  discount?: number;
  total_amount?: number;
  payment_status?: string;
  transaction_history?: Transaction[];
  date: string; // Primary event date (first from event_date array)
  event_dates?: string[]; // Array of event dates from API (event_date field)
  amount: number | string; // Amount from API (can be string like "5800.00")
  status: string; // "Pending", "Confirmed", "Processing", "Cancelled"
  created_at?: string;
  action?: string;
  platform_fee?: number | string; // Platform fee from API
  deposit_amount?: number | string; // Deposit amount from API
  pending_amount?: number | string; // Pending amount from API
}
export interface AdminHistoryParams {
  search?: string;
  page?: number | string;
  per_page?: number | string;
  status?: string;
  event_date?: string;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  type: "update" | "mail" | "download" | "adjust" | "view";
}

export type SearchParams = {
  page?: string;
  per_page?: string;
  status?: string;
  search?: string;
  event_date?: string;
  from?: string;
  to?: string;
  filters?: string | unknown;
  [key: string]: string | string[] | undefined | unknown;
};
