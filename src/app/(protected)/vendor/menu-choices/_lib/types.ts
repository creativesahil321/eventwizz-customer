/**
 * Menu Choices Types
 * Types for booking menu selection system with multi-date and multi-table support
 */

export interface MenuBookingDate {
  date_key: string;
  date: string;
  tables: TableInfo[];
  tickets: number;
  drinks: number;
  status: string;
}

export interface TableInfo {
  table_id: string;
  table_name: string;
  seats: number;
  guests: number;
}

export interface MenuBooking {
  booking_id: number;
  booking_number?: string;
  event_name: string;
  event_image: string;
  dates: MenuBookingDate[];
  total_guests: number;
}

export interface AttendeeMenuSelection {
  id: string;
  booking_id: number;
  date_key: string;
  table_id: string;
  title: string;
  fullName: string;
  // Dynamic menu selections: key is category title, value is item ID
  menuSelections: Record<string, string>;
  // Legacy fields for backward compatibility (will be populated from menuSelections)
  starter: string;
  mainCourse: string;
  dessert: string;
  sides?: string;
  allergens?: string[];
  dietaryRequirements?: string[];
  additionalNotes?: string;
  status: "completed" | "pending";
}

export interface MenuSelectionState {
  [bookingId: number]: {
    [dateKey: string]: {
      [tableId: string]: AttendeeMenuSelection[];
    };
  };
}

/** Params for customer menu choices list query (pagination + search) */
export interface UseMenuChoicesQueryParams {
  search?: string;
  page?: number;
  per_page?: number;
  event_type?: string;
  menu?: string;
  status?: string;
  event_id?: number;
  event_date?: string;
  event_name?: string;
  options?: { enabled?: boolean };
}
