/**
 * Bookings Service Type Definitions
 *
 * Contains service-specific types needed for the bookings service.
 */

/**
 * Query parameters for bookings list requests
 */
export interface BookingsQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  payment_status?: string;
}

/**
 * Booking date information
 */
export interface BookingDate {
  date_key: string;
  date: string;
  table: {
    table_id: number;
    table_size: number;
  };
  status: string; // e.g., "Pending", "Confirmed", "confirmed"
}

/**
 * Individual booking item from API response
 */
export interface BookingItem {
  booking_id: number;
  booking_number: string;
  event_name: string;
  is_menu_choice: boolean;
  event_slug: string;
  event_image: string;
  status: string; // e.g., "pending", "Confirmed", "confirmed"
  payment_status: string; // Changed from number to string to match API
  partial_payment: string;
  total: string;
  created_date: string;
  booking_dates: BookingDate[];
}

/**
 * Paginated response data for bookings list
 */
export interface BookingsResponseData {
  data: BookingItem[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
    path: string;
  };
}

/**
 * Complete response type for bookings list
 * This matches the actual API response structure
 */
export interface BookingsResponse {
  status: boolean;
  message: string;
  data: BookingItem[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
    links: Array<{
      url: string | null;
      label: string;
      page: number | null;
      active: boolean;
    }>;
    path: string;
  };
}

/**
 * Table allocation details
 */
export interface TableAllocation {
  price_per_person: number;
  table_size: number;
  no_tables: number;
  allocation: number[];
  people: number;
}

/**
 * Ticket details in booking
 */
export interface BookingTicketDetails {
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
}

/**
 * Drink details in booking
 */
export interface BookingDrinkDetails {
  title: string;
  price: number;
  quantity: number;
}

/**
 * Add-on ticket details
 */
export interface AddOnTicketDetails {
  title: string;
  description: string;
  price_per_ticket: string;
  quantity: string;
}

/**
 * Add-on drink details
 */
export interface AddOnDrinkDetails {
  title: string;
  price: string;
  quantity: string;
}

/**
 * Add-ons data for a booking date
 */
export interface BookingAddOnsData {
  tickets?: AddOnTicketDetails[];
  drinks?: AddOnDrinkDetails[];
  total_amount?: number;
}

/**
 * Event date details for booking details page
 */
export interface BookingEventDate {
  has_unbooked_event_dates: boolean;
  booking_date_id: number;
  date_key: string;
  date: string;
  parent_booking_date?: string | null; // Original date before reschedule
  payment_status: string;
  total_amount: number;
  paid_amount: number | null;
  pending_payment: number;
  tables: TableAllocation[];
  tickets: BookingTicketDetails[];
  drinks: BookingDrinkDetails[];
  addons?: BookingAddOnsData;
}

/**
 * Booking details data structure
 */
export interface BookingDetailsData {
  is_menu_choice: boolean;
  booking_id: number;
  booking_number?: string;
  event_name: string;
  slug: string;
  location: string;
  payment_status: string;
  sub_total: string;
  partial_payment: string;
  paid_amount: number | null;
  pending_payment: number;
  addons_amount: number;
  total: number;
  event_dates: BookingEventDate[];
}

/**
 * Complete response type for booking details
 */
export interface BookingDetailsResponse {
  status: boolean;
  message: string;
  data: BookingDetailsData;
  errors: string[];
}

// Add-Ons Types
export interface AddOnsTable {
  id: number;
  min_persons: number;
  max_persons: number;
  price: number;
  total_tables: number;
  sold_tables: number;
  available_tables: number;
}

export interface AddOnsTicket {
  id: number;
  title: string;
  description: string;
  price: number;
  total_capacity: number;
  sold_tickets: number;
  available_tickets: number;
}

export interface AddOnsDrink {
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
 * Allocation entry for selected tables
 */
export interface AllocationEntry {
  parent_id: number;
  seats: number;
}

export interface SelectedTable {
  id: number;
  price: string;
  table_size: number;
  no_tables: number;
  allocation: AllocationEntry[];
}

export interface AddOnsData {
  tables: AddOnsTable[];
  tickets: AddOnsTicket[];
  drinks: AddOnsDrink[];
  selected_tables: SelectedTable[];
}

export interface AddOnsResponse {
  status: boolean;
  message: string;
  data: AddOnsData;
  errors: string[];
}

// Save Add-ons Payload Types
export interface SaveDrinkPackage {
  title: string;
  price: number;
  quantity: number;
}

export interface SaveTicket {
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
}

export interface SaveTable {
  table_size: number;
  price_per_person: number;
  no_tables: number;
  allocation: number[];
  type?: "existing" | "new";
  table_id?: number;
}

export interface SaveAddOnsPayload {
  booking_id: number;
  date: string;
  drink_package?: SaveDrinkPackage[];
  tickets?: SaveTicket[];
  tables?: SaveTable[];
}

export interface SaveAddOnsResponse {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
}

// Menu Items Types
export interface MenuItem {
  id: number;
  name: string;
  desc: string;
}

export interface MenuCategory {
  id?: number; // event_menu_id - category ID from backend
  title: string;
  items: MenuItem[];
}

export interface MenuTable {
  id: number;
  table_size: number;
  allocated_seat: number;
  source_type?: number;
}

/**
 * Persisted menu choice from backend API
 * Backend should return menu_selections as Record<string, string>
 * where key is category title and value is item ID
 */
export interface PersistedMenuChoice {
  id: number;
  table_id: number;
  date_key: string;
  title: string;
  full_name: string;
  menu_selections: Record<string, string>; // { "Category Title": "item_id" }
  allergens?: string[];
  dietary_requirements?: string[];
  additional_notes?: string;
}

export interface MenuItemsData {
  booking_id: number;
  booking_number: string;
  event_menu: MenuCategory[];
  tables: MenuTable[];
  menu_choices?: PersistedMenuChoice[];
}

export interface MenuItemsResponse {
  status: boolean;
  message: string;
  data: MenuItemsData;
  errors: string[];
}

// Submit Menu Selections Payload (for batch submission)
export interface MenuSelectionPayload {
  booking_id: number;
  date: string;
  table_id: number;
  attendees: Array<{
    title: string;
    full_name: string;
    starter_id: number;
    main_course_id: number;
    dessert_id: number;
    sides_id?: number;
    allergens?: string[];
    dietary_requirements?: string[];
    additional_notes?: string;
  }>;
}

// Menu Choice Item (for choices array)
export interface MenuChoiceItem {
  event_menu_id: number;
  menu_item_id: number;
}

// Save Single Menu Choice Payload (for immediate save)
// Supports both new format (choices array) and legacy format (individual IDs)
export interface SaveMenuChoicePayload {
  booking_id: number;
  table_id: number;
  no_of_attendees: number; // Required for both add and edit
  title: string;
  name: string; // Changed from full_name to name
  menu_choice_id?: number; // Required for edit case
  choices?: MenuChoiceItem[]; // New format: array of choices
  // Legacy format (backward compatibility)
  date?: string;
  full_name?: string;
  starter_id?: number;
  main_course_id?: number;
  dessert_id?: number;
  sides_id?: number;
  allergens?: string[];
  dietary_requirements?: string[];
  additional_notes?: string;
}

export interface MenuSelectionResponse {
  status: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
}

/**
 * Payment gateway for reschedule
 */
export interface ReschedulePaymentGateway {
  id: number;
  slug: string;
}

/**
 * Table details for reschedule (allocated_seat is an array)
 */
export interface RescheduleTableDetail {
  event_date_table_id: number;
  allocated_seat: number[]; // Array of seat allocations per table
  table_size: number;
  price_per_person: number;
  total: number;
}

/**
 * Available date for rescheduling (with full details)
 */
export interface AvailableRescheduleDate {
  id: number;
  dateKey: string;
  date: string;
  price: number;
  people: number;
  tables: number;
  drinks: number;
  table_details: RescheduleTableDetail[];
}

/**
 * Current date details for reschedule
 */
export interface RescheduleCurrentDate {
  dateKey: string;
  date: string;
  price: string;
  people: number;
  tables: number;
  drinks: number;
}

/**
 * Unified response for reschedule (includes current date, payment gateways, and available dates)
 */
export interface RescheduleDataResponse {
  status: boolean;
  message: string;
  data: {
    current: RescheduleCurrentDate;
    payment_gateways: ReschedulePaymentGateway[];
    availableDates: AvailableRescheduleDate[];
  };
  errors: string[];
}

/**
 * Table detail for reschedule booking payload
 * allocated_seat is an array of seat allocations per table
 */
export interface RescheduleTableDetailPayload {
  event_date_table_id: number;
  allocated_seat: number[]; // Array of seat allocations per table
  table_size: number;
  price_per_person: number;
  total: number;
}

/**
 * Payload for reschedule booking API
 */
export interface RescheduleBookingPayload {
  booking_id: number;
  booking_date_id: number;
  new_booking_date_id: number;
  new_date: string; // Date string like "2025-09-20"
  total_amount: number;
  unpaid_amount: number;
  payment_gateway: string; // Payment gateway slug like "stripe"
  table_details: RescheduleTableDetailPayload[];
}
