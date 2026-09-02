/**
 * Events Service Type Definitions
 *
 * Contains service-specific types needed for the events service.
 */

import { ApiResponse as BaseApiResponse } from "../../core/api-client";
import { DatesSectionType } from "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/Dates-section";
import type { CouponStripSource } from "@/lib/coupon-strip-props";
import type { PublicEventDateDiscount } from "@/components/public/date-card-offer";

/**
 * Public listing card category (`latest_events` / `upcoming_events` / search).
 */
export type PublicEventCardCategory = {
  id: number;
  name: string;
  slug: string;
};

/**
 * Event row on location listings (`latest_events` / `upcoming_events`).
 * Live API: name, slug, banner_image, lowest_price, category, next_available_date,
 * start_time, end_time. Extra date/time aliases are preview / older payloads only.
 */
export interface Event {
  name: string;
  slug: string;
  banner_image: string;
  lowest_price: number;
  category?: PublicEventCardCategory | null;
  next_available_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  /**
   * Booking options for listing chips when the public list API sends it.
   * Omitted / invalid → no booking-type icons on the card.
   */
  booking_type?: "tickets" | "tables" | "both" | null;
  /** @deprecated Live listings send `category.name` */
  event_category_name?: string | null;
  event_category?: string | { name?: string | null } | null;
  /** @deprecated Live listings send `next_available_date` */
  event_date?: string | null;
  next_event_date?: string | null;
  formatted_date?: string | null;
  date?: string | null;
  start_date?: string | null;
  event_time?: string | null;
  formatted_time?: string | null;
  time?: string | null;
}

/**
 * Gallery image definition
 */
export interface GalleryImage {
  id: number;
  url: string;
}

/**
 * Location data with events definition
 */
export interface LocationData {
  latitude: string;
  longitude: string;
  address: string;
  email?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  slug: string;
  city?: string;
  cover_image: string | null;
  cover_video: string | null;
  banner_heading: string | null;
  banner_sub_heading: string | null;
  /** Per-location hero position from Site Essentials (`LocationResource`). */
  banner_heading_align?: "left" | "center" | "right" | null;
  banner_heading_valign?: "top" | "center" | "bottom" | null;
  about_title: string | null;
  about_cta_link: string | null;
  about_description: string | null;
  /** Global footer blurb; location GET should still echo it (same as copyright). */
  footer_brand_description?: string | null;
  about_link_title: string | null;
  event_title_1: string | null;
  latest_events: Event[];
  event_title_2: string | null;
  upcoming_events: Event[];
  event_gallery_title: string | null;
  event_gallery: GalleryImage[];
}

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
  current_step: number;
  event_id: number;
  id: number;
  name: string;
  slug: string;
  image: string;
  status: string;
}

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
 */
export type EventsResponse = BaseApiResponse<EventsResponseData>;

/**
 * Per-room payload on the public event detail API when `is_rooms` is enabled.
 */
export interface EventDetailRoom {
  /** May be omitted on empty room shells (`{}`) returned when a named room has no content yet. */
  room_id?: number;
  event_schedular_title: string;
  event_schedular_background_image: string | null;
  event_schedular: Array<{
    time: string;
    title: string;
  }>;
  package_title: string;
  package_description?: string | null;
  package_image: string;
  package_details: Array<{
    title: string;
  }>;
  dates: DatesSectionType | undefined;
  event_galley: Array<{
    url: string;
  }>;
  menu_title: string;
  menu_background_image: string | null;
  menu_description: string;
  menus: Array<{
    name: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  }>;
  drink_title: string;
  drink_description: string;
  packages: Array<{
    id: number;
    title: string;
    description: string;
    price: string;
    available_quantity?: number;
  }>;
  event_address?: string | null;
  lat?: string | number | null;
  long?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  brochure_pdf: string | null;
  brochure_pdf_2: string | null;
}

/** Re-export for callers typing date-level discounts from the domain event API. */
export type { PublicEventDateDiscount };

/**
 * Event detail type definition for single event page
 */
export interface EventDetail {
  /** When true, room-specific sections live under `rooms` keyed by room name. */
  is_rooms?: boolean | number | string;
  /** Room-keyed payloads returned by the public event detail API. */
  rooms?: Record<string, EventDetailRoom>;
  /**
   * Event-level coupon for the public banner strip
   * (`show_on_event_page` controls visibility).
   */
  coupon?: CouponStripSource | null;
  /** Present on single-room events; room-mode payloads use `rooms` instead. */
  event_schedular_background_image?: string | null;
  menu_background_image?: string | null;
  address: string;
  phone: string;
  email: string;
  package_title?: string;
  /** Legacy / alternate API key; prefer `package_description` (matches vendor + onboarding). */
  package_sub_title?: string;
  package_description?: string | null;
  dates?: DatesSectionType | undefined;
  logo: string | File | null | undefined;
  event_name: string;
  slug: string;
  category?: PublicEventCardCategory | string | null;
  category_name?: string | null;
  event_category_name?: string | null;
  event_banner_image: string;
  event_banner_video: string | null;
  event_banner_heading: string;
  /** Optional substring of the hero line: accent tail (heading font + primary) when theme uses accent_tail */
  event_banner_heading_accent?: string | null;
  event_banner_sub_heading: string;
  /** Parent location hero position (`EventResource` copies `vendor_locations`). */
  banner_heading_align?: "left" | "center" | "right" | null;
  banner_heading_valign?: "top" | "center" | "bottom" | null;
  about_event_heading: string;
  about_event_sub_heading: string;
  about_event_description: string;
  event_schedular_title?: string;
  event_schedular?: Array<{
    time: string;
    title: string;
  }>;
  package_image?: string;
  package_details?: Array<{
    title: string;
  }>;
  package_button_name?: string;
  event_galley?: Array<{
    url: string;
  }>;
  menu_title?: string;
  menu_description?: string;
  menus?: Array<{
    name: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  }>;
  drink_title?: string;
  drink_description?: string;
  packages?: Array<{
    id: number;
    title: string;
    description: string;
    price: string;
    available_quantity?: number;
  }>;
  brochure_pdf?: string | null;
  brochure_pdf_2?: string | null;
  faq_pdf: string | null;
  event_address?: string | null;
  lat?: string | number | null;
  long?: string | number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  // Theme-related fields
  detected_theme?: string;
  theme_animations?: {
    enabled: boolean;
    decorations: string[];
    effects: string[];
  };
}

/**
 * Event detail response type
 */
export type EventDetailResponse = BaseApiResponse<EventDetail>;
