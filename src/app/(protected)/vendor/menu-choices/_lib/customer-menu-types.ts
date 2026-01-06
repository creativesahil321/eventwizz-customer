/**
 * Customer Menu Choices Types for Vendor Listing
 */

export interface CustomerMenuChoice {
  id: string;
  event_name: string;
  event_date: string; // Format: "Saturday, September 20, 2025"
  customer_email: string;
  customer_phone: string;
  submitted_on: string; // Format: "24-12-2025"
  booking_id?: number;
  date_key?: string;
}

export interface CustomerMenuChoiceFilters {
  event_name?: string;
  event_date?: string;
  customer_email?: string;
  customer_phone?: string;
  submitted_on?: string;
}
