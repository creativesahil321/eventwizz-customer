/**
 * Customer Menu Choices Types for Vendor Listing
 */

export interface CustomerMenuChoice {
  id: string;
  event_name: string;
  event_date: string; // Format: "Saturday, September 20, 2025"
  event_date_raw?: string;
  customer_name?: string;
  customer_email: string;
  customer_phone: string;
  status: string; // e.g. "Submitted", "Initiated"
  booking_id?: number;
  booking_date_id?: number;
  date_key?: string;
}

export interface CustomerMenuChoiceFilters {
  event_name?: string;
  event_date?: string;
  customer_email?: string;
  customer_phone?: string;
  status?: string;
}
