import {
  EmailVerificationRequest,
  EmailVerificationResponse,
  OTPResponse,
  RegistrationResponse,
  LoginResponse,
  ApiResponse,
  VenueLocation,
} from "@/types/api.types";
import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import { signIn, signOut, getSession } from "next-auth/react";
import { safeLocalStorage } from "@/lib/utils";
import { env } from "@/env";

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  domain?: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface CompleteRegistrationRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  account_type: string;
  domain_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  user_agent?: string;
  os?: string;
  ip_address?: string;
  domain_name?: string;
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

export interface SocialAuthRequest {
  provider: "google" | "facebook" | string;
  email: string;
  name: string;
  provider_id: string;
  domain: string;
  account_type: string;
  parent_domain: string;
}

export const authService = {
  // Send OTP for email verification
  verifyEmail: (data: EmailVerificationRequest) =>
    api.post<EmailVerificationResponse>(API_ENDPOINTS.AUTH.SEND_OTP, data, {
      returnFullResponse: true,
    }),

  // Verify OTP - return full response
  verifyOTP: (data: VerifyOTPRequest) =>
    api.post<OTPResponse>(API_ENDPOINTS.AUTH.VERIFY_OTP, data, {
      returnFullResponse: true,
    }),

  // Resend OTP
  resendOTP: (data: ResendOTPRequest) =>
    api.post<EmailVerificationResponse>(API_ENDPOINTS.AUTH.RESEND_OTP, data),

  // Complete registration with user details
  completeRegistration: (data: CompleteRegistrationRequest) =>
    api.post<RegistrationResponse>(API_ENDPOINTS.AUTH.CREATE_ACCOUNT, data, {
      returnFullResponse: true,
    }),

  // Login user
  login: (data: LoginRequest) =>
    api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data, {
      returnFullResponse: true,
    }),

  // Social authentication (handles both login and registration)
  socialAuth: (data: SocialAuthRequest) =>
    api.post<LoginResponse>(API_ENDPOINTS.AUTH.SOCIAL_AUTH, data, {
      returnFullResponse: true,
    }),

  // Send forgot password email
  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<ApiResponse>(API_ENDPOINTS.AUTH.FORGET_PASSWORD, data, {
      returnFullResponse: true,
    }),

  // Reset password with token
  resetPassword: (data: ResetPasswordRequest) =>
    api.post<ApiResponse>(API_ENDPOINTS.AUTH.RESET_PASSWORD, data, {
      returnFullResponse: true,
    }),

  // Save authentication data and create NextAuth session
  saveAuthData: async (
    userData: {
      user: { id: number; uuid?: string };
      active_role: string;
      account_type?: string;
      event_id?: number;
      vendor_location_id?: number;
      default_venue_location?: VenueLocation;
      venue_locations?: VenueLocation[];
    },
    token: string
  ) => {
    // Store event_id if available
    if (userData.event_id) {
      const eventIdString = String(userData.event_id);
      safeLocalStorage.setItem("event_id", eventIdString);
    }

    // Create credentials object for NextAuth
    const credentials: Record<string, string | boolean | null> = {
      redirect: false,
      token,
      active_role: userData.active_role,
      account_type: userData.account_type || userData.active_role,
      userId: userData.user.id.toString(),
      uuid: userData.user.uuid || null,
      isOnboarded: "false", // Default to false, update later if needed
    };

    // Only add vendor_location_id if it exists and is valid
    if (userData.vendor_location_id) {
      credentials.vendor_location_id = String(userData.vendor_location_id);
    }

    // Only add event_id if it exists and is valid
    if (userData.event_id) {
      credentials.event_id = String(userData.event_id);
    }

    // Add location data if available
    if (userData.default_venue_location) {
      credentials.default_venue_location = JSON.stringify(
        userData.default_venue_location
      );
    }

    if (userData.venue_locations?.length) {
      credentials.venue_locations = JSON.stringify(userData.venue_locations);
    }

    return signIn("credentials", credentials);
  },

  // Clear auth data
  clearAuthData: async () => {
    // Clear localStorage for backward compatibility
    safeLocalStorage.removeItem("token");
    safeLocalStorage.removeItem("user_id");
    safeLocalStorage.removeItem("uuid");
    safeLocalStorage.removeItem("event_id");

    // Sign out of NextAuth
    return signOut({ redirect: false });
  },

  // Get stored UUID - now using NextAuth session where possible
  getStoredUuid: async () => {
    // Try to get from NextAuth session first
    const session = await getSession();
    if (session?.user?.uuid) {
      return session.user.uuid;
    }

    // Fall back to localStorage during transition
    return safeLocalStorage.getItem("uuid") || "";
  },

  // Get current onboarding step from session
  getCurrentOnboardingStep: async () => {
    const session = await getSession();
    return session?.user?.on_boarding_step || 1;
  },

  // Update session with new data (can be called from components with useSession())
  updateSession: async (updateData: {
    vendor_location_id?: number | string;
    on_boarding_step?: number | string;
    isOnboarded?: boolean;
    event_id?: number | string;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
  }) => {
    // Format the data appropriately
    const formattedData: Record<string, unknown> = {};

    if (updateData.vendor_location_id !== undefined) {
      formattedData.vendor_location_id = String(updateData.vendor_location_id);
    }

    if (updateData.on_boarding_step !== undefined) {
      formattedData.on_boarding_step = Number(updateData.on_boarding_step);
    }

    if (updateData.isOnboarded !== undefined) {
      formattedData.isOnboarded = updateData.isOnboarded;
    }

    if (updateData.event_id !== undefined) {
      formattedData.event_id = Number(updateData.event_id);
    }

    // Handle location data
    if (updateData.default_venue_location !== undefined) {
      formattedData.default_venue_location = updateData.default_venue_location;
    }

    if (updateData.venue_locations !== undefined) {
      formattedData.venue_locations = updateData.venue_locations;
    }

    // Return the formatted data to be used with the session.update() function
    // This needs to be called from a component using useSession()
    return formattedData;
  },

  // Update user profile data in the session
  updateProfileInSession: async (profileData: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    avatar?: string;
    phone?: string;
    address?: string;
    city?: string;
    post_code?: string;
  }) => {
    // Format the data appropriately for the session update
    const formattedData: Record<string, string> = {};

    if (profileData.first_name !== undefined) {
      formattedData.first_name = profileData.first_name;
    }

    if (profileData.last_name !== undefined) {
      formattedData.last_name = profileData.last_name;
    }

    if (profileData.full_name !== undefined) {
      formattedData.full_name = profileData.full_name;
    }

    if (profileData.avatar !== undefined) {
      formattedData.avatar = profileData.avatar;
    }

    return formattedData;
  },

  // Multi-tenant OAuth sign-in utility
  signInWithOAuth: async (
    provider: "google" | "facebook" | string,
    options: {
      callbackUrl?: string;
      tenant?: string;
      website_role?: string;
      account_type?: string;
      parentDomain?: string;
    } = {}
  ) => {
    const { callbackUrl, tenant, website_role, account_type, parentDomain } =
      options;

    // Detect current domain/subdomain
    const currentDomain =
      typeof window !== "undefined"
        ? window.location.hostname
        : env.NEXT_PUBLIC_WHITE_LABEL_URL;

    const detectedTenant = tenant || currentDomain.split(".")[0];
    const detectedWebsiteRole = website_role || detectedTenant;

    // Create state object with tenant information
    const state = {
      tenant: detectedTenant,
      origin: currentDomain,
      website_role: detectedWebsiteRole,
      account_type: account_type || detectedWebsiteRole,
      parentDomain: parentDomain || env.NEXT_PUBLIC_WHITE_LABEL_URL,
      callbackUrl:
        callbackUrl ||
        `https://${currentDomain}/${detectedWebsiteRole}/dashboard`,
    };

    return signIn(provider, {
      callbackUrl: state.callbackUrl,
      state: JSON.stringify(state),
    });
  },
};
