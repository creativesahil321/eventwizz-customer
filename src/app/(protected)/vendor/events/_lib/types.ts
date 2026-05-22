export enum EventStatusEnum {
  Draft = "draft",
  Active = "active",
  Canceled = "canceled",
  Archived = "archived",
  Old = "old",
}

export type EventStatus = keyof typeof EventStatusEnum | string;

// Map the API response to our internal Event type
export interface ApiEvent {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  status: string;
  /** Legacy: single date (older APIs) */
  event_date?: string;
  /** Current: multiple event dates (newer APIs) */
  event_dates?: string[];
}

// Map the API pagination metadata
export interface EventPagination {
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
}

// Interface for our internal use (with additional properties if needed)
export interface Event extends ApiEvent {
  vendor_location_id?: number;
  event_category_id?: number;
  event_name?: string;
  header_banner?: string;
  banner_heading?: string;
  title?: string;
  sub_title?: string;
  description?: string;
  event_schedular?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Interface for filter options
export interface EventFilters {
  vendor_location_id?: number;
  search?: string;
  page?: number;
  per_page?: number;
  status?: string;
}

// Event package type kept for backward compatibility
export interface EventPackage {
  id: string | number;
  slug?: string;
  event_id: number;
  package_image?: string;
  package_title?: string;
  package_description?: string;
  package_button_name: string;
  package_button_link: string;
  package_details: string;
  created_at?: Date;
  updated_at?: Date;
}
