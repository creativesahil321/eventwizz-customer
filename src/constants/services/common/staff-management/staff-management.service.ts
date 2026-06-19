import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  StaffResponse,
  SingleStaffResponse,
  CreateStaffPayload,
  UpdateStaffPayload,
  StaffActionResponse,
  StaffSearchParams,
} from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

/**
 * Staff Management Service
 * Handles API calls related to staff management
 */
export const staffManagementService = {
  /**
   * Fetch all staff members with optional search parameters
   * @param params Search parameters (page, per_page, search, status)
   * @returns Promise with staff data
   */
  getStaff: (params?: StaffSearchParams) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.STAFF_MANAGEMENT
    >("STAFF_MANAGEMENT", role);

    return api.get<StaffResponse>(
      endpoints.GET_ALL_STAFF || API_ENDPOINTS.ADMIN.STAFF.PAGINATE,
      {
        params,
        returnFullResponse: true,
      }
    );
  },

  /**
   * Fetch a specific staff member by ID
   * @param id Staff member ID
   * @returns Promise with staff member data
   */
  getStaffById: (id: number) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.STAFF_MANAGEMENT
    >("STAFF_MANAGEMENT", role);

    const url = (
      endpoints.GET_UPDATE_STAFF_BY_ID || API_ENDPOINTS.ADMIN.STAFF.SHOW
    ).replace("{id}", id.toString());
    return api.get<SingleStaffResponse>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Create a new staff member
   * @param data Staff member data including name, email, role_id, and password
   * @returns Promise with created staff member data
   */
  createStaff: (data: CreateStaffPayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.STAFF_MANAGEMENT
    >("STAFF_MANAGEMENT", role);

    return api.post<StaffActionResponse>(
      endpoints.ADD_NEW_STAFF || API_ENDPOINTS.ADMIN.STAFF.ADD,
      data,
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Update an existing staff member
   * @param id Staff member ID
   * @param data Staff member data to update
   * @returns Promise with updated staff member data
   */
  updateStaff: (id: number, data: UpdateStaffPayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.STAFF_MANAGEMENT
    >("STAFF_MANAGEMENT", role);

    const url = (
      endpoints.UPDATE_STAFF || API_ENDPOINTS.ADMIN.STAFF.UPDATE
    ).replace("{id}", id.toString());
    return api.patch<StaffActionResponse>(url, data, {
      returnFullResponse: true,
    });
  },

  /**
   * Delete a staff member
   * @param id Staff member ID to delete
   * @returns Promise with delete operation result
   */
  deleteStaff: (id: number) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.STAFF_MANAGEMENT
    >("STAFF_MANAGEMENT", role);

    const url = (
      endpoints.DELETE_STAFF || API_ENDPOINTS.ADMIN.STAFF.DELETE
    ).replace("{id}", id.toString());
    return api
      .delete<StaffActionResponse>(url, {
        returnFullResponse: true,
      })
      .catch((error) => {
        console.error("API error in deleteStaff:", error);

        // Ensure we're returning a properly formatted error response
        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to delete staff member",
          errors: [],
        };
      });
  },

  /**
   * Update a staff member's status
   * @param id Staff member ID
   * @param status New status (active/inactive)
   * @returns Promise with status update result
   */
  updateStaffStatus: (id: number, status: "active" | "inactive") => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.STAFF_MANAGEMENT
    >("STAFF_MANAGEMENT", role);

    const url = (
      endpoints.UPDATE_STAFF_STATUS ||
      `${API_ENDPOINTS.ADMIN.STAFF.UPDATE}/{slug}`
    )
      .replace("{id}", id.toString())
      .replace("{slug}", status);

    return api
      .patch<StaffActionResponse>(
        url,
        {},
        {
          returnFullResponse: true,
        }
      )
      .catch((error) => {
        console.error("API error in updateStaffStatus:", error);

        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to update staff status",
          errors: [],
        };
      });
  },
};
