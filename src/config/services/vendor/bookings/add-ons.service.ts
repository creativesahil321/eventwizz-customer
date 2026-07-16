/**
 * Vendor Booking Add-ons Service
 * Handles API calls related to vendor booking add-ons
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

// Add-ons Response Types
export interface VendorAddOnsTable {
  id: number;
  min_persons: number;
  max_persons: number;
  price: number;
  total_tables: number;
  sold_tables: number;
  available_tables?: number;
  available_new_tables?: number;
  has_existing_on_booking?: boolean;
  can_extend_existing?: boolean;
  can_add_new_table?: boolean;
  status?: number;
}

export interface VendorAddOnsTicket {
  id: number;
  title: string;
  description: string;
  price: number;
  total_capacity: number;
  sold_tickets: number;
  available_tickets: number;
}

export interface VendorAddOnsDrink {
  id: number;
  title: string;
  description: string;
  price: string;
  available_quantity: number;
  sold_quantity: number;
  available_drinks: number;
  status: number;
}

/**
 * Allocation entry for vendor selected tables
 */
export interface VendorAllocationEntry {
  parent_id: number;
  booking_date_table_id?: number;
  seats: number;
}

export interface VendorAddOnsSelectedTable {
  id: number;
  table_size: number;
  no_tables: number;
  price: string;
  allocation: VendorAllocationEntry[];
}

export interface VendorAddOnsData {
  booking_date_id?: number;
  room_id?: number | null;
  room_name?: string | null;
  date_key?: string;
  event_date_id?: number;
  selected_tables: VendorAddOnsSelectedTable[];
  tables: VendorAddOnsTable[];
  tickets: VendorAddOnsTicket[];
  drinks: VendorAddOnsDrink[];
}

export interface VendorAddOnsResponse {
  status: boolean;
  message: string;
  data: VendorAddOnsData;
  errors: string[];
}

export interface VendorAddOnsSaveResponse {
  status: boolean;
  message: string;
  data?: {
    booking_id?: number;
  };
  errors?: string[];
}

/**
 * Vendor Add-ons Service
 */
export const vendorAddOnsService = {
  /**
   * Fetch add-ons available for a specific booking date.
   * Room-scoped bookings pass `room_id` as a query param (mirrors customer add-ons).
   */
  getAddOns: (
    bookingId: number | string,
    date: string,
    roomId?: number | null,
  ) => {
    const url = API_ENDPOINTS.VENDOR.BOOKING_HISTORY.ADD_ONS.GET_ALL.replace(
      "{id}",
      bookingId.toString(),
    ).replace("{date}", date);
    const resolvedRoomId =
      roomId != null && Number(roomId) > 0 ? Number(roomId) : undefined;

    return api.get<VendorAddOnsResponse>(url, {
      returnFullResponse: true,
      params: resolvedRoomId != null ? { room_id: resolvedRoomId } : undefined,
    });
  },

  /**
   * Save/Store add-ons for a booking
   * @param formData FormData containing add-ons details
   * @returns Promise with save response
   */
  saveAddOns: (formData: FormData) => {
    return api.post<VendorAddOnsSaveResponse>(
      API_ENDPOINTS.VENDOR.BOOKING_HISTORY.ADD_ONS.SAVE,
      formData,
      {
        returnFullResponse: true,
      }
    );
  },
};
