// Import the schema type from the component
import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";

/**
 * Locations Service Type Definitions
 *
 * Contains service-specific types needed for the locations service.
 */

// Import the schema type from the component
import { VenueLocation } from "@/types/api.types";

/**
 * Query parameters for locations list requests
 */
export interface LocationsQueryParams {
  search?: string | string[];
  page?: number | string;
  per_page?: number | string;
  status?: string;
}

/**
 * Individual location item in list response
 */
export interface Location {
  id: number;
  name: string;
  city?: string;
  address?: string;
  slug: string;
  is_default: boolean;
  is_headquarters?: boolean;
  /** Live/active events currently tied to this location */
  active_events_count?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Single location item from get/update response
 */
export interface LocationDetail extends Location {
  deleted_at: string | null;
}

/**
 * Payload for creating a new location
 */
export interface LocationCreatePayload {
  name: string;
  city: string;
  address?: string;
  slug?: string;
  email?: string;
  contact_number?: string;
  is_default?: boolean;
}

/**
 * Payload for updating an existing location
 */
export interface LocationUpdatePayload {
  name?: string;
  city?: string;
  address?: string;
  email?: string;
  contact_number?: string;
  slug?: string;
  is_default?: boolean;
}

/**
 * Paginated response data for locations list
 */
export interface LocationsResponseData {
  data: Location[];
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
 * Complete response type for locations list
 */
export type LocationsResponse = BaseApiResponse<LocationsResponseData>;

/**
 * Actual API response structure for locations (what the API actually returns)
 */
export interface LocationsApiResponse {
  default_venue_location: Location;
  venue_locations: Location[];
}

/**
 * Response type for the actual API structure
 */
export type LocationsApiResponseType = BaseApiResponse<LocationsApiResponse>;

/**
 * Response type for a single location
 */
export type LocationResponse = BaseApiResponse<LocationDetail>;

/**
 * Response type for create operation
 */
export type LocationCreateResponse = BaseApiResponse<{
  name: string;
  city: string;
  address?: string;
  slug: string;
  is_default: boolean;
  updated_at: string;
  created_at: string;
  id: number;
}>;

/**
 * Response type for update operation
 */
export type LocationUpdateResponse = BaseApiResponse<LocationDetail>;

/**
 * Response type for delete operation
 */
export type LocationDeleteResponse = BaseApiResponse<null>;

/**
 * Send delete OTP — backend emails the vendor owner (not staff).
 * Contract for backend:
 * POST /vendor/locations/{id}/send-delete-otp
 */
export type LocationSendDeleteOtpResponse = BaseApiResponse<{
  /** Masked owner email, e.g. v***r@example.com */
  masked_email?: string;
  /** Seconds until the OTP expires / resend is allowed */
  expires_in?: number;
  resend_after?: number;
}>;

/**
 * Verify delete OTP before enabling the final confirmation phrase.
 * Contract for backend:
 * POST /vendor/locations/{id}/verify-delete-otp
 * Body: { otp: string }
 */
export interface LocationVerifyDeleteOtpPayload {
  otp: string;
}

export type LocationVerifyDeleteOtpResponse = BaseApiResponse<{
  verified?: boolean;
}>;

/**
 * Final delete after OTP + typed phrase.
 * Contract for backend:
 * DELETE /vendor/locations/{id}
 * Body: { otp: string, confirmation: "delete this location" }
 */
export interface LocationDeletePayload {
  otp: string;
  confirmation: string;
}

/**
 * Response type for switch location operation
 */
export interface SwitchLocationData {
  default_venue_location: VenueLocation;
  venue_locations: VenueLocation[];
}

export type SwitchLocationResponse = BaseApiResponse<SwitchLocationData>;

/**
 * Payload for toggle location status operation
 */
export interface ToggleLocationStatusPayload {
  location_id: number | string;
  status: "active" | "inactive";
}

/**
 * Response type for toggle location status operation
 */
export type ToggleLocationStatusResponse = BaseApiResponse<null>;