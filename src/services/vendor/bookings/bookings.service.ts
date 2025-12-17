/**
 * Vendor Bookings Service
 * Handles API calls related to vendor booking history
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

export interface VendorBookingHistoryResponse {
  status: boolean;
  message: string;
  data: VendorBookingItem[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    path: string;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
  };
}

export interface VendorBookingItem {
  booking_id: number;
  event_id: number;
  event_name: string;
  user_id: number;
  user_name: string;
  booking_date: string; // Format: "05-11-2025"
  event_date: string[]; // Format: ["20-09-2025", "21-09-2025"]
  amount: string; // Format: "5800.00"
  status: string; // "Pending", "Confirmed", etc.
}

// Vendor Booking Detail Types
export interface VendorBookingUser {
  full_name: string;
  email: string;
  phone: string;
}

export interface VendorBookingTable {
  table_size: number;
  price_per_person: number;
  no_tables: number;
  allocation: number[];
  people: number;
  total: number;
}

export interface VendorBookingTicket {
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
}

export interface VendorBookingDrink {
  id: number;
  title: string;
  price: number;
  quantity: number;
  total: number;
}

export interface VendorBookingAddons {
  tables: VendorBookingTable[];
  tickets: VendorBookingTicket[];
  drinks: VendorBookingDrink[];
  total_amount: number;
}

export interface VendorBookingParentDate {
  booking_date_id: number;
  date_key: string;
  date: string;
  total_amount: number;
  paid_amount: number;
  pending_payment: number;
  tables: VendorBookingTable[];
  tickets: VendorBookingTicket[];
  drinks: VendorBookingDrink[];
  addons: VendorBookingAddons;
}

export interface VendorBookingEventDate {
  has_unbooked_event_dates: boolean;
  booking_date_id: number;
  date_key: string;
  date: string;
  payment_status: string;
  total_amount: number;
  paid_amount: number;
  pending_payment: number;
  tables: VendorBookingTable[];
  tickets: VendorBookingTicket[];
  drinks: VendorBookingDrink[];
  addons: VendorBookingAddons;
  parent_booking_date?: VendorBookingParentDate | null;
}

export interface VendorBookingDetail {
  booking_id: number;
  booking_number: string;
  user: VendorBookingUser;
  event_name: string;
  is_menu_choice: boolean;
  slug: string;
  location: string;
  drink_title: string;
  payment_status: string;
  payment_gateways: string[];
  sub_total: number;
  addons_amount: number | null;
  deposit_paid: number | null;
  paid_amount: number;
  pending_payment: number;
  total: number;
  event_dates: VendorBookingEventDate[];
}

export interface VendorBookingDetailResponse {
  status: boolean;
  message: string;
  data: VendorBookingDetail;
  errors: string[];
}

export interface VendorBookingsQueryParams {
  page?: number | string;
  per_page?: number | string;
  status?: string;
  search?: string;
}

/**
 * Vendor Bookings Service
 */
export const vendorBookingsService = {
  /**
   * Fetch all bookings with optional search parameters
   * @param params Search parameters (page, per_page, status, search)
   * @returns Promise with bookings data
   */
  getBookings: (params?: VendorBookingsQueryParams) => {
    return api.get<VendorBookingHistoryResponse>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.GET_ALL,
      {
        params,
        returnFullResponse: true,
      }
    );
  },

  /**
   * Fetch a specific booking by ID
   * @param id Booking ID
   * @returns Promise with booking data
   */
  getBookingById: (id: number | string) => {
    const url = API_ENDPOINTS.VENDOR.BOOKING_HISTORY.GET_BY_ID.replace(
      "{id}",
      id.toString()
    );
    return api.get<VendorBookingDetailResponse>(url, {
      returnFullResponse: true,
    });
  },
};
