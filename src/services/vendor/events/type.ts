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
  id: number;
  name: string;
  slug: string;
  image: string | null;
  status: string;
  is_submitted_for_approval: boolean;
  event_date: string;
  // Legacy fields for backward compatibility
  current_step?: number;
  event_id?: number;
}

// Minimal event detail structure required by preview
export interface EventDetailStepOne {
  event_id: number;
  step: number;
  event_name?: string;
  event_category_id?: number;
  event_banner_image?: string | null;
  event_banner_video?: string | null;
  event_banner_heading?: string;
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
  package_button_name?: string;
  package_details?: Array<{ title: string }>;
  gallery?: Array<string | { id: number; url: string }>;
}

export interface EventDetailStepThree {
  event_id: number;
  step: number;
  dates?: Array<{
    event_date: string;
    booking_type: "tickets" | "tables" | "both";
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

export interface EventDetailStepSix {
  event_id: number;
  step: number;
  brochure_pdf?: string | null;
  brochure_pdf_2?: string | null;
  faq_pdf?: string | null;
  event_address?: string;
  price_start_from?: string;
  price_start_from_button_text?: string;
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
}

export interface EventDetailData {
  current_step?: number;
  vendor_location_id?: number;
  logo?: string | null;
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
 * Payload for creating event menu categories
 */
export interface EventMenuCategoryPayload {
  vendor_event_id: number;
  name: string;
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
}
