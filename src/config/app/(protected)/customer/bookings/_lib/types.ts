import { Row } from "@tanstack/react-table";
import type { BookingListPaymentSummary } from "@/services/customer/bookings/type";

/**
 * Booking date information from API
 * Room bookings include `room_name`; same calendar day can appear multiple times.
 * No `room_id` on customer list responses.
 */
export interface BookingDate {
  date_key: string;
  date: string;
  room_name?: string | null;
  table?: {
    table_id: number;
    table_size: number;
  };
  /** @deprecated Prefer `table` from API */
  tables?: number;
  tickets?: number;
  drinks?: number;
  status: string; // e.g., "Pending", "Confirmed", "confirmed"
}

/**
 * Booking interface matching API response structure
 */
export interface Booking {
  booking_number: string;
  booking_id: number;
  id: number; // Alias for booking_id for backward compatibility
  event_name: string;
  is_menu_choice: boolean;
  event_slug: string;
  event_image: string;
  status: string; // e.g., "pending", "Confirmed", "confirmed"
  payment_status: string; // Changed from number to string to match API
  partial_payment: string;
  total: string | number;
  total_amount?: string | number; // Alias for total for backward compatibility
  created_date: string;
  booking_dates: BookingDate[];
  balance_amount?: string;
  /** List savings live only here — not on the booking root. */
  payment_summary?: BookingListPaymentSummary | null;
}

export interface SearchParams {
  page?: string;
  per_page?: string;
  sort?: string;
  filters?: string;
  status?: string;
  payment_status?: string;
}

export type DataTableRowAction<TData> = {
  row: Row<TData>;
  type: "update" | "delete" | "view" | "download" | "mail";
};
