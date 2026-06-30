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
  room_id?: number | null;
  room_name?: string | null;
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
 * Allocation format: Record<table_id, seat_count>
 * - Integer values (e.g., 8) represent NEW tables
 * - String values with "+" (e.g., "+4") represent additions to EXISTING tables
 */
export interface TableAllocation {
  price_per_person: number | string;
  table_size: number;
  no_tables: number;
  allocation: Record<string, number | string>; // key = table_id, value = seat count or "+X"
  people: number;
  total?: number;
  deposit_per_person?: number | string | null;
}

/** Table seat allocation on a booking date line item */
export interface BookingTableAllocation {
  id: number;
  table_number: string | number;
  label: string;
  people: number;
  base_seats?: number;
  addon_seats?: number;
  capacity?: number;
  seats_label?: string;
}

/** Incremental add-on merged into an original checkout line item */
export interface BookingDetailsAddonBreakdown {
  id: number;
  label: string;
  amount: number;
  quantity?: number;
  seats?: number;
  parent_allocation_id?: number;
}

export type BookingDetailsPurchaseType = "checkout" | "addon";

/** Booked table line item */
export interface BookingDetailsTable {
  id: number;
  name: string;
  description?: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  table_size: number;
  table_count: number;
  allocations?: BookingTableAllocation[];
  purchase_type?: BookingDetailsPurchaseType;
  is_addon?: boolean;
  addon_breakdown?: BookingDetailsAddonBreakdown[];
  addon_extra_total?: number;
  addon_extra_label?: string;
  has_addon_breakdown?: boolean;
  guest_pricing_label?: string;
}

/** Booked ticket line item */
export interface BookingDetailsTicket {
  id: number;
  name: string;
  description?: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  purchase_type?: BookingDetailsPurchaseType;
  is_addon?: boolean;
  addon_breakdown?: BookingDetailsAddonBreakdown[];
  addon_extra_total?: number;
  has_addon_breakdown?: boolean;
}

/** Booked package line item (drinks / brunch / etc.) */
export interface BookingDetailsPackage {
  id: number;
  name: string;
  description?: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  purchase_type?: BookingDetailsPurchaseType;
  is_addon?: boolean;
  addon_breakdown?: BookingDetailsAddonBreakdown[];
  addon_extra_total?: number;
  has_addon_breakdown?: boolean;
}

/** Saved add-on ticket on a booking date */
export interface BookingDetailsAddonTicket {
  id?: number;
  booking_date_ticket_id?: number;
  name: string;
  description?: string | null;
  unit_price: number;
  quantity: number;
  total_amount?: number;
}

/** Saved add-on package on a booking date */
export interface BookingDetailsAddonPackage {
  id?: number;
  booking_date_package_id?: number;
  name: string;
  description?: string | null;
  unit_price: number;
  quantity: number;
  total_amount?: number;
}

/** Saved add-on table on a booking date */
export interface BookingDetailsAddonTable {
  id?: number;
  booking_date_table_id?: number;
  name?: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  table_size: number;
  table_count?: number;
  allocations?: BookingTableAllocation[];
}

/** Add-ons bucket for a booking date */
export interface BookingDetailsAddons {
  tickets?: BookingDetailsAddonTicket[];
  packages?: BookingDetailsAddonPackage[];
  tables?: BookingDetailsAddonTable[];
  total_amount?: number;
}

export interface BookingRescheduleRequest {
  id: number;
  booking_id: number;
  bookings_date_id: number;
  event_date_id: number;
  event_date: string;
  payment_method: string;
  unpaid_amount: number;
  table_details: Array<{
    event_date_table_id: number;
    allocated_seat: number[];
    table_size: number;
    price_per_person: number;
    total: number;
  }>;
  drink_details: unknown[];
  created_at: string;
  updated_at: string;
}

/** Single date entry in booking details */
export interface BookingDetailsDate {
  booking_date_id: number;
  event_date_id: number;
  room_id?: number;
  room_name?: string;
  package_title?: string;
  date_key: string;
  date_label: string;
  /** Original date label before customer reschedule (when moved) */
  previous_date_label?: string | null;
  item_summary?: string;
  payment_status_code?: number;
  payment_status_label: string;
  total_amount: number;
  paid_amount: number | null;
  pending_amount?: number | null;
  can_pay_now?: boolean;
  is_menu_choice?: boolean;
  has_unbooked_event_dates?: boolean;
  tickets: BookingDetailsTicket[];
  packages: BookingDetailsPackage[];
  tables: BookingDetailsTable[];
  addons?: BookingDetailsAddons;
  reschedule_requests?: BookingRescheduleRequest[];
}

/** Top-level payment summary on booking details */
export interface BookingPaymentSummary {
  sub_total_amount: number;
  total_paid_amount?: number | null;
  total_pending_amount?: number | null;
  total_addons_amount?: number | null;
  total_amount: number;
  can_pay_now?: boolean;
  /** @deprecated use total_paid_amount */
  paid_amount?: number | null;
  /** @deprecated use total_pending_amount */
  pending_amount?: number | null;
  /** @deprecated use total_addons_amount */
  addons_amount?: number | null;
  deposit_amount?: number | null;
}

/**
 * Booking details data structure (customer booking detail / checkout page)
 */
export interface BookingDetailsData {
  booking_id: number;
  booking_number?: string;
  event_name: string;
  event_slug: string;
  location: string;
  is_room_system?: boolean;
  payment_status_code?: number;
  payment_status_label: string;
  is_menu_choice?: boolean;
  reschedule_status?: boolean;
  /** How many dates on this booking have been rescheduled */
  reschedule_count?: number;
  payment_gateways?: Array<{
    id: number;
    slug: string;
  }>;
  dates: BookingDetailsDate[];
  payment_summary: BookingPaymentSummary;
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
  available_new_tables?: number;
  has_existing_on_booking?: boolean;
  can_extend_existing?: boolean;
  can_add_new_table?: boolean;
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
 * Allocation entry for selected tables (DEPRECATED - kept for backward compatibility)
 * New API format uses Record<string, number | string> directly
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
  allocation: Record<string, number | string>; // key = table_id, value = seat count or "+X"
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
  allocation: Record<string, number | string>; // key = table_id, value = seat count or "+X"
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
  /** Required for multi-room events */
  room_id?: number;
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
  /** Preferred id for `new_booking_date_id` on store */
  event_date_id?: number;
  dateKey?: string;
  date_key?: string;
  date: string;
  date_label?: string;
  price: number;
  unpaid_amount?: number;
  /** Server-computed upgrade amount — use on review when `requires_payment` */
  additional_payment_required?: number;
  requires_payment?: boolean;
  people: number;
  tables: number;
  drinks?: number;
  room_id?: number;
  room_name?: string;
  table_details: RescheduleTableDetail[];
}

/**
 * Current date details for reschedule
 */
export interface RescheduleCurrentDate {
  dateKey?: string;
  date_key?: string;
  date: string;
  date_label?: string;
  price: string;
  paid_amount?: number | string;
  people: number;
  tables: number;
  drinks?: number;
  room_id?: number;
  room_name?: string;
}

/**
 * Unified response for reschedule (includes current date, payment gateways, and available dates)
 */
export interface RescheduleDataResponse {
  status: boolean;
  message: string;
  data: {
    current: RescheduleCurrentDate;
    payment_gateways?: ReschedulePaymentGateway[];
    paymentGateways?: ReschedulePaymentGateway[];
    availableDates?: AvailableRescheduleDate[];
    available_dates?: AvailableRescheduleDate[];
    is_room_system?: boolean;
    is_room_scoped?: boolean;
    room_id?: number;
    room_name?: string;
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
  /** Numeric gateway id (e.g. 1 = Stripe) — only when `unpaid_amount > 0` */
  payment_gateway?: number;
  table_details: RescheduleTableDetailPayload[];
}

/**
 * Response data from reschedule booking API
 * Contains reschedule request ID and payment details if payment is required
 */
export interface RescheduleBookingResponseData {
  booking_id?: number;
  booking_number?: string;
  amount?: number;
  unpaid_amount?: number;
  reschedule_request_id?: number;
  payment_gateway?: string;
  payment?: BookingPaymentGatewayInfo;
  /** Legacy redirect-based gateways */
  redirect_url?: string;
}

/**
 * Complete response type for reschedule booking operations
 */
export interface RescheduleBookingResponse {
  status: boolean;
  message: string;
  data?: RescheduleBookingResponseData;
  errors?: string[];
}

/**
 * Payment date add-on table
 */
export interface PaymentDateAddOnTable {
  booking_date_table_id: number;
  event_date_table_id?: number; // Optional, may not be needed
}

/**
 * Payment date add-on ticket
 */
export interface PaymentDateAddOnTicket {
  booking_date_ticket_id: number;
}

/**
 * Payment date add-ons
 */
export interface PaymentDateAddOns {
  tables?: PaymentDateAddOnTable[];
  tickets?: PaymentDateAddOnTicket[];
}

/**
 * Payment date entry
 */
export interface PaymentDate {
  booking_date_id: number;
  add_ons?: PaymentDateAddOns;
}

/**
 * Payload for booking payment API
 */
export interface BookingPaymentPayload {
  booking_id: number;
  payment_gateway: number; // Payment gateway ID (1 = stripe, etc.)
  dates: PaymentDate[];
}

/**
 * Payment details in response
 */
export interface BookingPaymentDetails {
  payment_id: number;
  amount: string;
  currency: string;
  status: string;
  transaction_id: string;
}

/**
 * Stripe credentials returned when booking payment uses Stripe Elements.
 */
export interface BookingPaymentStripeDetails {
  client_secret: string;
  publishable_key: string;
  payment_intent_id?: string;
  checkout_session_id?: string;
  expires_at?: number;
}

export interface BookingPaymentGatewayInfo {
  gateway: string;
  payment_id: number;
  stripe?: BookingPaymentStripeDetails;
  redirect_url?: string;
}

export interface BookingPaymentSettlementLine {
  booking_date_id: number;
  base_due: number;
  addons_due: number;
  reschedule_due: number;
  total: number;
  addon_item_ids?: {
    ticket_ids?: number[];
    table_ids?: number[];
    drink_ids?: number[];
  };
}

export interface BookingPaymentSettlement {
  pay_all_at_once: boolean;
  booking_date_ids: number[];
  date_wise_pending: Record<string, number>;
  lines?: Record<string, BookingPaymentSettlementLine>;
  summary?: {
    pending_amount: number;
    add_ons_amount: number;
    reschedule_unpaid_amount: number;
  };
}

/**
 * Response data from booking payment API
 */
export interface BookingPaymentResponseData {
  booking_id: number;
  booking_number: string;
  amount: number;
  payment?: BookingPaymentGatewayInfo;
  settlement?: BookingPaymentSettlement;
  /** Legacy redirect-based gateways (PayPal, TrueLayer, etc.) */
  redirect_url?: string;
  /** Legacy flat fields — kept for backward compatibility */
  payment_id?: number;
  total_amount?: number;
  pending_amount?: number;
  add_ons_amount?: number;
  booking_date_ids?: number[];
  date_wise_pending?: Record<string, number>;
  gateway?: string;
  payment_details?: BookingPaymentDetails;
}

/**
 * Complete response type for booking payment operations
 */
export interface BookingPaymentResponse {
  status: boolean;
  message: string;
  data?: BookingPaymentResponseData;
  errors?: string[];
}
