/**
 * Events Service Type Definitions
 *
 * Contains service-specific types needed for the events service.
 */

// Import the schema type from the component
import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";

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
