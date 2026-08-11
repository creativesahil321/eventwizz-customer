import { Row } from "@tanstack/react-table";
import { ReactNode } from "react";
import type { BookingAppliedOffer } from "@/services/customer/bookings/type";

/**
 * Booking date information from API
 */
export interface BookingDate {
  date_key: string;
  date: string;
  room_id?: number | null;
  room_name?: string | null;
  tables: number;
  tickets: number;
  drinks: number;
  status: string; // e.g., "Pending", "Confirmed", "confirmed"
}

/**
 * Booking interface matching API response structure
 */
export interface Booking {
  booking_number: string | ReactNode;
  booking_id: number;
  id: number; // Alias for booking_id for backward compatibility
  event_name: string;
  is_menu_choice: boolean;
  event_slug: string;
  event_image: string;
  status: string; // e.g., "pending", "Confirmed", "confirmed"
  payment_status: string; // Changed from number to string to match API
  partial_payment: string;
  total: string;
  total_amount: string; // Alias for total for backward compatibility
  created_date: string;
  booking_dates: BookingDate[];
  /** @deprecated Prefer structured offer fields from the API. */
  discount?: string;
  balance_amount?: string;
  coupon_code?: string | null;
  discount_code?: string | null;
  value_label?: string | null;
  discount_label?: string | null;
  discount_amount?: number | string | null;
  applied_offer?: BookingAppliedOffer | null;
  coupon?: BookingAppliedOffer | null;
  offers?: BookingAppliedOffer[] | null;
  applied_offers?: BookingAppliedOffer[] | null;
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
