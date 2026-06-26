import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ProfileFormValues,
  ProfileResponse,
  PasswordUpdateFormValues,
  PasswordUpdateResponse,
} from "./types";
import { api, ApiResponse } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { env } from "@/env";

/**
 * Helper function to check if application is in development mode
 */
const isDevMode = (): boolean => {
  return env.NEXT_PUBLIC_DEV_MODE;
};

/**
 * Query keys for profile-related queries
 * Used for caching and invalidation
 * Domain parameter enables profile keys to be scoped by user type (admin, vendor, etc.)
 */
export const profileKeys = {
  all: ["profile"] as const,
  details: (domain: string = "default") =>
    [...profileKeys.all, domain] as const,
  account: (domain: string = "default") =>
    [...profileKeys.all, "account", domain] as const,
  password: (domain: string = "default") =>
    [...profileKeys.all, "password", domain] as const,
};

/**
 * Fetches profile data from the API
 * Uses the COMMON profile endpoint which works for all user types (admin, vendor, partner, customer)
 * The backend determines the appropriate profile based on the user's JWT token
 * @returns Promise with profile data
 */
export const fetchProfileData = async (): Promise<
  ApiResponse<ProfileResponse["data"]>
> => {
  try {
    // Use the API client to fetch profile data
    const response = await api.get<ApiResponse<ProfileResponse["data"]>>(
      API_ENDPOINTS.COMMON.PROFILE.GET,
      { returnFullResponse: true }
    );

    // Log response in development mode
    if (isDevMode()) {
      console.log("[API] Profile data:", response);
    }

    return response;
  } catch (error) {
    if (isDevMode()) {
      console.error("[API Error] Failed to fetch profile data:", error);
    }
    throw error;
  }
};

/**
 * Updates profile data via API
 * Handles file uploads for avatar
 * @param data Profile form data
 * @returns Promise with API response
 */
export const updateProfile = async (
  data: ProfileFormValues
): Promise<ApiResponse<ProfileResponse["data"]>> => {
  try {
    // Create FormData for file upload
    const formData = new FormData();

    // Add text fields
    formData.append("first_name", data.firstName);
    formData.append("last_name", data.lastName);

    // Add file if available
    if (data.avatar && data.avatar instanceof File) {
      formData.append("avatar", data.avatar);
    }

    // Log data being sent in development mode
    if (isDevMode()) {
      console.log("[API] Updating profile with:", Object.fromEntries(formData));
    }

    // Use the API client to update profile
    const response = await api.post<ApiResponse<ProfileResponse["data"]>>(
      API_ENDPOINTS.COMMON.PROFILE.UPDATE,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        returnFullResponse: true,
      }
    );

    if (isDevMode()) {
      console.log("[API] Profile update response:", response);
    }

    return response;
  } catch (error) {
    if (isDevMode()) {
      console.error("[API Error] Failed to update profile:", error);
    }
    throw error;
  }
};

/**
 * Updates user password via API
 * @param data Password update form data
 * @returns Promise with API response
 */
export const updatePassword = async (
  data: PasswordUpdateFormValues
): Promise<ApiResponse<PasswordUpdateResponse["data"]>> => {
  try {
    // Log data being sent in development mode (excluding sensitive fields)
    if (isDevMode()) {
      console.log("[API] Updating password for username:", data.username);
    }

    // Prepare payload based on whether password is being created or changed
    const payload: Record<string, string | boolean> = {
      username: data.username,
      password: data.password,
      password_confirmation: data.password_confirmation,
    };

    // Only include currentPassword if password is already set (change password scenario)
    if (data.is_password_set) {
      payload.currentPassword = data.currentPassword || "";
    }

    // Log data being sent in development mode (excluding sensitive fields)
    if (isDevMode()) {
      console.log("[API] Password payload keys:", Object.keys(payload));
    }

    // Use the API client to update password
    const response = await api.post<
      ApiResponse<PasswordUpdateResponse["data"]>
    >(API_ENDPOINTS.COMMON.PROFILE.UPDATE_PASSWORD, payload, {
      returnFullResponse: true,
    });

    if (isDevMode()) {
      console.log("[API] Password update response:", response);
    }

    return response;
  } catch (error) {
    if (isDevMode()) {
      console.error("[API Error] Failed to update password:", error);
    }
    throw error;
  }
};

/**
 * Hook for fetching profile data
 * Uses TanStack Query for data fetching with caching
 * @param options Optional configuration including callbacks
 * @param userType The type of user (admin, vendor, partner, customer) for query key domain
 * @returns Typed query result with profile data
 */
export const useProfileData = (
  options?: {
    onSuccess?: (data: ApiResponse<ProfileResponse["data"]>) => void;
    onError?: (error: Error) => void;
  },
  userType?: string
) => {
  // Get current domain for query key
  // If userType is provided, use it as the domain
  // Otherwise use the hostname or default
  const domain = userType
    ? userType
    : typeof window !== "undefined"
    ? window.location.hostname
    : "default";

  return useQuery<
    ApiResponse<ProfileResponse["data"]>,
    Error,
    ApiResponse<ProfileResponse["data"]>
  >({
    queryKey: profileKeys.details(domain),
    queryFn: fetchProfileData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

/**
 * Hook for updating profile data
 * Uses TanStack Query mutation with queryClient invalidation
 * @param userType Optional user type for domain-specific query invalidation
 */
export const useUpdateProfile = (userType?: string) => {
  const queryClient = useQueryClient();
  const domain = userType || "default";

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Invalidate and refetch profile data after update
      queryClient.invalidateQueries({
        queryKey: profileKeys.details(domain),
      });
    },
  });
};

/**
 * Hook for updating user password
 * Uses TanStack Query mutation with queryClient invalidation
 * @param userType Optional user type for domain-specific query invalidation
 */
export const useUpdatePassword = (userType?: string) => {
  const queryClient = useQueryClient();
  const domain = userType || "default";

  return useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      // Invalidate and refetch profile data after update
      queryClient.invalidateQueries({
        queryKey: profileKeys.details(domain),
      });
    },
  });
};
