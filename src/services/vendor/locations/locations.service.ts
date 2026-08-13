import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  LocationsResponse,
  LocationResponse,
  LocationCreatePayload,
  LocationUpdatePayload,
  LocationCreateResponse,
  LocationUpdateResponse,
  LocationDeleteResponse,
  LocationDeletePayload,
  LocationSendDeleteOtpResponse,
  LocationVerifyDeleteOtpPayload,
  LocationVerifyDeleteOtpResponse,
  SwitchLocationResponse,
  ToggleLocationStatusPayload,
  ToggleLocationStatusResponse,
} from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

/**
 * Locations Service
 * Handles API calls related to vendor venue locations management
 */
export const locationService = {
  /**
   * Fetch all locations with optional search parameters
   * @param params Search parameters (page, per_page, search, status)
   * @returns Promise with locations data
   */
  getLocations: (params?: {
    search?: string;
    page?: number | string;
    per_page?: number | string;
    status?: string;
  }) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role
    );

    return api.get<LocationsResponse>(endpoints.GET_ALL, {
      params,
      returnFullResponse: true,
    });
  },

  /**
   * Fetch a specific location by ID
   * @param id Location ID
   * @returns Promise with location data
   */
  getLocationById: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role
    );

    const url = endpoints.GET_BY_ID.replace("{id}", id.toString());
    return api.get<LocationResponse>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Create a new location
   * @param data Location data
   * @returns Promise with created location data
   */
  createLocation: (data: LocationCreatePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role
    );

    return api.post<LocationCreateResponse>(endpoints.CREATE, data, {
      returnFullResponse: true,
    });
  },

  /**
   * Update an existing location
   * @param id Location ID
   * @param data Location data to update
   * @returns Promise with updated location data
   */
  updateLocation: (id: number | string, data: LocationUpdatePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role
    );

    const url = endpoints.UPDATE.replace("{id}", id.toString());
    return api.put<LocationUpdateResponse>(url, data, {
      returnFullResponse: true,
    });
  },

  /**
   * Email a delete OTP to the vendor owner account (never staff).
   * POST /vendor/locations/{id}/send-delete-otp
   */
  sendDeleteOtp: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role,
    );
    const url = endpoints.SEND_DELETE_OTP.replace("{id}", id.toString());
    return api.post<LocationSendDeleteOtpResponse>(url, undefined, {
      returnFullResponse: true,
    });
  },

  /**
   * Verify the delete OTP before unlocking the confirmation phrase.
   * POST /vendor/locations/{id}/verify-delete-otp
   */
  verifyDeleteOtp: (
    id: number | string,
    payload: LocationVerifyDeleteOtpPayload,
  ) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role,
    );
    const url = endpoints.VERIFY_DELETE_OTP.replace("{id}", id.toString());
    return api.post<LocationVerifyDeleteOtpResponse>(url, payload, {
      returnFullResponse: true,
    });
  },

  /**
   * Delete a location after OTP + typed confirmation phrase.
   * DELETE /vendor/locations/{id}
   * Body: { otp, confirmation: "delete this location" }
   */
  deleteLocation: (id: number | string, payload: LocationDeletePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role,
    );

    const url = endpoints.DELETE.replace("{id}", id.toString());
    // Let errors reject so the root interceptor owns toast messaging
    // (do not catch + re-toast in the UI).
    return api.delete<LocationDeleteResponse>(url, {
      data: payload,
      returnFullResponse: true,
    });
  },

  /**
   * Switch the current active location
   * @param locationId The ID of the location to switch to
   * @returns Promise with the updated location data
   */
  switchLocation: (locationId: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role
    );

    return api
      .post<SwitchLocationResponse>(
        endpoints.SWITCH_LOCATION,
        { vendor_location_id: locationId },
        { returnFullResponse: true }
      )
      .catch((error) => {
        console.error("API error in switchLocation:", error);

        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to switch location",
          errors: [],
          data: {
            default_venue_location: null,
            venue_locations: [],
          },
        };
      });
  },

  /**
   * Toggle the status of a location (active / inactive)
   * @param payload { location_id, status: "active" | "inactive" }
   * @returns Promise with the API response
   */
  toggleLocationStatus: (payload: ToggleLocationStatusPayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<typeof API_ENDPOINTS.VENDOR.LOCATION>(
      "LOCATION",
      role
    );

    return api.post<ToggleLocationStatusResponse>(
      endpoints.TOGGLE_LOCATION_STATUS,
      payload,
      { returnFullResponse: true }
    );
  },
};
