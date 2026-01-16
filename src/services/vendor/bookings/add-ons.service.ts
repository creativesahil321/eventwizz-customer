/**
 * Vendor Booking Add-ons Service
 * Handles API calls related to vendor booking add-ons
 */

import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";

// Add-ons Response Types
export interface VendorAddOnsTable {
  id: number;
  max_persons: number;
  min_persons: number;
  price: number;
  total_tables: number;
  sold_tables: number;
  available_tables?: number; // Optional - can be calculated from total_tables - sold_tables
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
   * Fetch add-ons available for a specific booking date
   * @param bookingId Booking ID
   * @param date Date key (e.g., "2026-02-14")
   * @returns Promise with add-ons data
   */
  getAddOns: (bookingId: number | string, date: string) => {
    const url = API_ENDPOINTS.VENDOR.BOOKING_HISTORY.ADD_ONS.GET_ALL.replace(
      "{id}",
      bookingId.toString()
    ).replace("{date}", date);
    return api.get<VendorAddOnsResponse>(url, {
      returnFullResponse: true,
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
