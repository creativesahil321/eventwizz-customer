/**
 * Events Service Type Definitions
 *
 * Contains service-specific types needed for the events service.
 */

// Import the schema type from the component
import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";
import type { VendorBookingFilterMeta } from "@/services/vendor/bookings/bookings.service";

/**
 * Menu Choices Service Type Definitions
 *
 * Contains service-specific types needed for the menu choices service.
 */

/**
 * Query parameters for menu choices list requests
 */
export interface MenuChoicesQueryParams {
  search?: string | string[];
  page?: number | string;
  per_page?: number | string;
  event_type?: string;
  menu?: string;
  status?: string;
  event_id?: number;
  event_date?: string;
}

/**
 * Individual menu choice item in list response
 */
export interface MenuChoice {
  id: number;
  event_name: string;
  menu_name: string;
  category: string;
  status: number;
  created_at: string;
}

/**
 * Single menu choice item from get/update response
 */
export interface MenuChoiceDetail {
  id: number;
  event_menu_id: number;
  title: string;
  description?: string;
  status: number;
  vendor_event_id?: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Payload for creating a new menu choice
 */
export interface CreateMenuChoicePayload {
  vendor_event_id: number;
  event_menu_id: number;
  title: string;
  description?: string;
  status: number | boolean;
}

/**
 * Payload for updating an existing menu choice
 */
export interface UpdateMenuChoicePayload {
  vendor_event_id?: number;
  event_menu_id?: number;
  title?: string;
  description?: string;
  status?: number | boolean;
}

/**
 * Paginated response data for menu choices list
 */
export interface MenuChoicesResponseData {
  data: MenuChoice[];
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
 * Complete response type for menu choices list
 */
export type MenuChoicesResponse = BaseApiResponse<{
  data: MenuChoice[];
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
}>;

/**
 * Response type for a single menu choice
 */
export type MenuChoiceResponse = BaseApiResponse<MenuChoiceDetail>;

/**
 * Response type for create operation
 */
export type MenuChoiceCreateResponse = BaseApiResponse<{
  event_menu_id: string;
  title: string;
  status: string;
  updated_at: string;
  created_at: string;
  id: number;
}>;

/**
 * Response type for update operation
 */
export type MenuChoiceUpdateResponse = BaseApiResponse<MenuChoiceDetail>;

/**
 * Response type for delete operation
 */
export type MenuChoiceDeleteResponse = BaseApiResponse<[]>;

/**
 * Customer menu choices list item (vendor booking menu choices API)
 */
export interface CustomerMenuChoiceListItem {
  id: number;
  booking_id: number;
  booking_date_id: number;
  event_id?: number;
  event_name: string;
  event_date: string;
  event_date_raw: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
}

/** Event with its dates (from customer menu choices list response) */
export interface EventWithDates {
  event_id: number;
  event_name: string;
  dates: string[];
}

/**
 * Paginated response for customer menu choices list
 */
export interface CustomerMenuChoicesListResponse {
  status: boolean;
  message: string;
  data: CustomerMenuChoiceListItem[];
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
  errors: string[];
  /** Events that have menu choices, with their date keys for the filter dropdowns */
  events_with_dates?: EventWithDates[];
  filter_meta?: VendorBookingFilterMeta;
}
