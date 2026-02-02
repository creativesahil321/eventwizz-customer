export interface ApiResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface ApiError {
  status: boolean;
  message: string;
  errors: string[];
}

export interface EmailVerificationRequest {
  email: string;
  domain?: string;
}

export interface EmailVerificationResponse {
  status: boolean;
  message: string;
  data: [];
  errors: string[];
}

export interface OTPResponse {
  status: boolean;
  message: string;
  data: [];
  errors: string[];
}

// Venue location interface - comprehensive definition with all API fields
export interface VenueLocation {
  id: number;
  name: string;
  slug: string;
  city?: string;
  address?: string;
  contact_number?: string;
  email?: string;
  is_default: boolean;
  status?: boolean; // Dynamic status field: true = Active, false = Inactive
  created_at?: string;
  updated_at?: string;
  [key: string]: string | number | boolean | undefined;
}

// Update user interface to include all fields
interface User {
  id: number;
  uuid: string | null;
  name: string | null;
  email: string;
  avatar: string | null;
  last_ip: string | null;
  last_login_date: string | null;
  email_verified_at: string | null;
  status: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

// Update login/registration response interfaces
export interface RegistrationResponse {
  status: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    active_role: string;
    account_type: string;
    on_boarding_step?: number;
    vendor_location_id?: number;
    event_id?: number;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
    permissions?: string[];
  };
  errors: string[];
}

// Define the LoginResponse type for API response
export interface LoginResponse {
  status: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    active_role: string;
    account_type: string;
    on_boarding_step?: number;
    vendor_location_id?: number;
    isOnboarded?: boolean;
    event_id?: number;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
    permissions?: string[];
  };
  errors: string[];
}

// Step 12 response type
export interface StepTwelveResponse {
  status: boolean;
  message: string;
  data: {
    vendor_location_id: number;
    default_venue_location: VenueLocation;
    venue_locations: VenueLocation[];
  };
  errors: string[];
}
