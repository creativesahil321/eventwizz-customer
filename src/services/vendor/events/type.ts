/**
 * Events Service Type Definitions
 *
 * Contains service-specific types needed for the events service.
 */

// Import the schema type from the component
import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";

/**
 * Query parameters for events list requests
 */
export interface EventsQueryParams {
  vendor_location_id?: number | string | string[];
  search?: string | string[];
  page?: number;
  per_page?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
  category_id?: string;
  room_id?: string;
}

/**
 * Individual event item in API responses
 */
export interface EventApiResponse {
  status?: boolean;
  message?: string;
  data?: EventItem;
  errors?: string[];
}
export interface EventItem {
  updated_at?: string | Date | null;
  id: number;
  name: string;
  slug: string;
  image: string | null;
  status: string;
  is_submitted_for_approval?: boolean;
  event_category_id?: number;
  category_name?: string;
  /** Legacy: single date (older APIs) */
  event_date?: string;
  /** Current: multiple event dates (newer APIs) */
  event_dates?: string[];
  // Legacy fields for backward compatibility
  current_step?: number;
  event_id?: number;
}

export interface EventsListCategoryOption {
  id: number;
  name: string;
}

export interface EventsListRoomOption {
  room_id: number;
  room_name: string;
}

export interface EventsListFilterMeta {
  from_date?: string | null;
  to_date?: string | null;
  date_filter_on?: string;
  selected_category_id?: number | null;
  selected_category_name?: string | null;
  available_dates?: string[];
  available_categories?: EventsListCategoryOption[];
  selected_room_id?: number | null;
  selected_room_name?: string | null;
  has_room_events?: boolean;
  available_rooms?: EventsListRoomOption[];
}

// Minimal event detail structure required by preview
export interface EventDetailStepOne {
  event_id: number;
  step: number;
  vendor_location_id?: number;
  event_name?: string;
  event_category_id?: number;
  category_name?: string | null;
  event_banner_image?: string | null;
  event_banner_video?: string | null;
  event_banner_heading?: string;
  /** Optional accent tail substring (public event page + preview parity with SiteHeading) */
  event_banner_heading_accent?: string | null;
  event_banner_sub_heading?: string;
  about_event_heading?: string;
  about_event_sub_heading?: string;
  about_event_description?: string;
  event_schedular_title?: string;
  event_schedular?: Array<{ time: string; title: string }>;
  event_schedular_background_image?: string | null;
}

export interface EventDetailStepTwo {
  event_id: number;
  step: number;
  package_image?: string | null;
  package_title?: string;
  package_description?: string;
  package_details?: Array<{ title: string }>;
  gallery?: Array<string | { id: number; url: string }>;
  event_schedular_title?: string;
  event_schedule_subtitle?: string;
  event_schedular?: Array<{ time: string; title: string }>;
  event_schedular_background_image?: string | null;
}

export interface EventDetailStepThree {
  event_id: number;
  step: number;
  vendor_location_id?: number;
  dates?: Array<{
    id?: number;
    event_date: string;
    booking_type: "tickets" | "tables" | "both";
    has_bookings?: boolean;
    /** 1 = active, 2 = cancelled, 0 = inactive */
    status?: number;
    is_cancelled?: boolean;
    is_readonly?: boolean;
    can_edit?: boolean;
    /**
     * Backend: "cancel" keeps the date (cancelled: true); "remove" allows omitting it;
     * "cancelled" means already cancelled (read-only).
     */
    date_action?: "cancel" | "remove" | "cancelled";
    use_cancel_date_action?: boolean;
    /** Legacy — do not use for cancel/remove UI gating */
    cancellation_request_pending?: boolean;
    has_financial_bookings?: boolean;
    cancelled?: boolean;
    cancellation_reason?: string | null;
    cancelled_at?: string | null;
    total_table_types?: number;
    tables?: Array<{
      id: number;
      event_date_id: number;
      min_persons: number;
      max_persons: number;
      price: number;
      total_tables: number;
      sold_tables: number;
    }>;
    total_ticket_types?: number;
    tickets?: Array<{
      id: number;
      event_date_id: number;
      title: string;
      description: string;
      price: number;
      total_capacity: number;
      sold_tickets: number;
    }>;
    payment_type?: string;
    deposit_amount?: number;
    deposit_due_date?: string;
  }>;
}

export interface EventDetailStepFour {
  event_id: number;
  step: number;
  catering_option?: number; // 0/1
  menu_title?: string;
  menu_description?: string;
  event_menu_category_id?: number | null;
  menus?: Array<{
    name: string;
    items: Array<{ title: string; description?: string }>;
  }>;
  menu_background_image?: string | null;
}

export interface EventDetailStepFive {
  event_id: number;
  step: number;
  /** Event pin address shown on the public brochure/map section. */
  event_address?: string;
  lat?: string | number | null;
  long?: string | number | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  brochure_pdf?: string | null;
  brochure_pdf_2?: string | null;
  faq_pdf?: string | null;
  price_start_from?: string;
  price_start_from_button_text?: string;
}

export interface EventDetailStepSix {
  event_id: number;
  step: number;
  drink_title?: string;
  drink_description?: string;
  packages?: Array<{
    id?: number;
    title: string;
    description: string;
    price: string | number;
    available_quantity?: number;
  }>;
}

export interface EventDetailStepSeven {
  event_id: number;
  step: number;
  faqs?: Array<{ id?: number; question: string; answer: string }>;
}

export interface EventDetailStepEight {
  event_id: number;
  step: number;
  reminder_email_before_days?: number;
  city?: string;
  address?: string;
  contact_number?: string;
  /** Map / brochure when returned by API */
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface EventDetailData {
  /** Public event slug when returned by the API (used for preview parity with live event pages). */
  slug?: string;
  /** Venue coordinates when API returns them at root (same as public event detail). */
  lat?: string | number | null;
  long?: string | number | null;
  current_step?: number;
  /** Persisted when step 1 is saved with room system enabled (AI + manual). */
  is_rooms?: boolean | number | string;
  approval_status?: string;
  vendor_location_id?: number;
  /** Parent location hero position (public EventResource / site-essentials event preview). */
  banner_heading_align?: "left" | "center" | "right" | null;
  banner_heading_valign?: "top" | "center" | "bottom" | null;
  logo?: string | null;
  email?: string;
  contact_number?: string;
  stepOne?: EventDetailStepOne;
  stepTwo?: EventDetailStepTwo;
  stepThree?: EventDetailStepThree;
  stepFour?: EventDetailStepFour;
  stepFive?: EventDetailStepFive;
  stepSix?: EventDetailStepSix;
  stepSeven?: EventDetailStepSeven;
  stepEight?: EventDetailStepEight;
}

export type EventDetailResponse = BaseApiResponse<EventDetailData>;

/**
 * Event category definition
 */
export interface EventCategory {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  image: string;
  description: string;
}

/**
 * Event menu category definition
 */
export interface EventMenuCategory {
  id: number;
  name: string;
}

/**
 * Payload for creating event categories
 */
export interface EventCategoryPayload {
  name: string;
}

/**
 * Query params for listing event menu categories
 */
export interface EventMenuCategoryQueryParams {
  /** Vendor event id — required by GET /vendor/event-menus */
  event_id: number;
  /** When multi-room / event spaces are enabled */
  room_id?: number;
}

/**
 * Payload for creating event menu categories
 */
export interface EventMenuCategoryPayload {
  vendor_event_id: number;
  name: string;
  /** Required when the event uses the room system */
  room_id?: number;
}

/**
 * Paginated response data for events list
 */
export interface EventsResponseData {
  data: EventItem[];
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
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

/**
 * Complete response type for events list
 * This matches the actual API response structure where data, links, and meta are at the root level
 */
export interface EventsResponse {
  status: boolean;
  message: string;
  data: EventItem[];
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
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
  errors: string[];
  filter_meta?: EventsListFilterMeta;
  active_events_count?: number;
  past_events_count?: number;
  draft_events_count?: number;
  cancelled_events_count?: number;
}

/**
 * Event Overview Types
 */
export interface EventOverviewQueryParams {
  date_status?: "all" | "available" | "sold_out";
  date_per_page?: number;
  date_page?: number;
  date_filter?: string;
  room_id?: string;
}

export interface EventOverviewFilterMeta {
  date_filter?: string | null;
  date_filter_on?: string;
  available_dates?: string[];
  selected_room_id?: number | null;
  selected_room_name?: string | null;
  has_room_events?: boolean;
  available_rooms?: EventsListRoomOption[];
}

export interface EventOverviewTableConfig {
  size: number;
  count: number;
  price: string;
  sold: number;
  total: number;
}

export interface EventOverviewTicket {
  id: number;
  name: string;
  sold: number;
  total: number;
}

export interface EventOverviewDrink {
  id: number;
  name: string;
  quantity: number;
}

export interface EventOverviewDateEntry {
  id: number;
  eventDate: string;
  category: string;
  submittedOn: string;
  soldOut: boolean;
  tables: EventOverviewTableConfig[];
  totalTables: number;
  tablesBooked: number;
  tablesLeft: number;
  totalPeople: number;
  tickets: EventOverviewTicket[];
  /** Section label from event (e.g. meal package, drink packages) */
  drink_title?: string;
  drinks: EventOverviewDrink[];
}

export interface EventOverviewInfo {
  id: number;
  name: string;
  date: string;
  status: string;
  totalRevenue: string;
  totalBookings: number;
  totalGuests: number;
}

export interface EventOverviewResponse {
  success: boolean;
  event: EventOverviewInfo;
  data: EventOverviewDateEntry[];
  links: {
    first: string | null;
    last: string | null;
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
  filter_meta?: EventOverviewFilterMeta;
}
