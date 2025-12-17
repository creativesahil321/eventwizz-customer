import { User } from "@/services/common/auth/type";
import { RegistrationResponse, VenueLocation } from "@/types/api.types";
export type UserType = "admin" | "vendor" | "customer";

// Add staff roles type definition
export type StaffRole = string; // Allow other dynamic roles

export interface LoginCredentials {
  email: string;
  password: string;
  domain_name?: string;
  remember?: boolean;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  referral_code?: string;
  country: string;
  acceptTerms: boolean;
  domain?: string;
  website_role?: string;
  parentDomain?: string;
  account_type?: UserType;
}

export interface LoginResponse {
  status: boolean;
  message?: string;
  data: {
    user: {
      uuid: string;
      first_name: string;
      last_name: string;
      email: string;
      avatar: string;
      status?: string;
    };
    token: string;
    active_role: string;
    account_type: string;
    on_boarding_step?: number;
    vendor_location_id?: number;
    isOnboarded?: boolean;
    event_id?: number;
    permissions?: string[];
  };
}
// Update the AuthUser interface to standardize role and user_type
export interface AuthUser {
  uuid?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string | null;
  status: string;
  active_role?: StaffRole | string; // Renamed from role
  account_type?: UserType; // Renamed from user_type
}

// Update AuthState to use standardized naming
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  account_type: UserType | null; // Renamed from userType
  active_role: StaffRole | string | null; // Renamed from userRole
  loading: boolean;
  error: string | null;
  isSessionChecked: boolean;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<LoginResponse>;
  logout: () => void;
  register: (data: RegisterData) => Promise<RegistrationResponse>;
  updateUser: (userData: Partial<User>) => void;
  setOnboarded: (isOnboarded: boolean) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  domain?: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// Define the API response type for onboarding data
export interface OnboardingApiResponse {
  step: number;
  name: string;
  contact_number: string;
  email: string;
  address: string;
  domain?: string;
  description?: string;
  vendor_location_id?: number;
  vendor_id?: number;
  is_default?: number;
  slug?: string;
  city?: string;
  event_id?: number;
  booking_type?: "both" | "tables" | "tickets";
  event_category_id?: number;
  event_category?: string;
  event_name?: string;
  on_boarding_step?: number;
  venue_locations?: VenueLocation[];
  default_venue_location?: VenueLocation;
  id?: number;
  logo?: File;
  last_completed_step?: number;
  cover_image?: File;
  // Add any additional fields that might be in the API response
}
