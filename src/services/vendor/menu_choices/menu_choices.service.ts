import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  CreateMenuChoicePayload,
  UpdateMenuChoicePayload,
  MenuChoicesResponse,
  MenuChoiceResponse,
  MenuChoiceCreateResponse,
  MenuChoiceUpdateResponse,
  MenuChoiceDeleteResponse,
} from "./type";
import {
  getCurrentUserRole,
  getEndpointsByRole,
} from "@/lib/utils/api-endpoints";

/**
 * Menu Choices Service
 * Handles API calls related to vendor menu choices management
 */
export const menuChoicesService = {
  /**
   * Fetch all menu choices with optional search parameters
   * @param params Search parameters (page, per_page, search, status)
   * @returns Promise with menu choices data
   */
  getMenuChoices: (params?: {
    search?: string;
    page?: number | string;
    per_page?: number | string;
    event_type?: string;
    menu?: string;
    status?: string;
  }) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    return api.get<MenuChoicesResponse>(endpoints.GET_ALL, {
      params,
      returnFullResponse: true,
    });
  },

  /**
   * Fetch a specific menu choice by ID
   * @param id Menu choice ID
   * @returns Promise with menu choice data
   */
  getMenuChoiceById: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    const url = endpoints.SHOW.replace("{id}", id.toString());
    return api.get<MenuChoiceResponse>(url, {
      returnFullResponse: true,
    });
  },

  /**
   * Create a new menu choice
   * @param data Menu choice data
   * @returns Promise with created menu choice data
   */
  createMenuChoice: (data: CreateMenuChoicePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    // Convert boolean status to number if needed
    const payload = {
      ...data,
      status:
        typeof data.status === "boolean" ? (data.status ? 1 : 0) : data.status,
    };

    return api.post<MenuChoiceCreateResponse>(endpoints.CREATE, payload, {
      returnFullResponse: true,
    });
  },

  /**
   * Update an existing menu choice
   * @param id Menu choice ID
   * @param data Menu choice data to update
   * @returns Promise with updated menu choice data
   */
  updateMenuChoice: (id: number | string, data: UpdateMenuChoicePayload) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    // Convert boolean status to number if needed
    const payload = {
      ...data,
      status:
        typeof data.status === "boolean" ? (data.status ? 1 : 0) : data.status,
    };

    const url = endpoints.UPDATE.replace("{id}", id.toString());
    return api.post<MenuChoiceUpdateResponse>(url, payload, {
      returnFullResponse: true,
    });
  },

  /**
   * Delete a menu choice
   * @param id Menu choice ID to delete
   * @returns Promise with delete operation result
   */
  deleteMenuChoice: (id: number | string) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    const url = endpoints.DELETE.replace("{id}", id.toString());
    return api
      .delete<MenuChoiceDeleteResponse>(url, {
        returnFullResponse: true,
      })
      .catch((error) => {
        console.error("API error in deleteMenuChoice:", error);

        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to delete menu choice",
          errors: [],
          data: [],
        };
      });
  },

  /**
   * Update a menu choice's status
   * @param id Menu choice ID
   * @param status Boolean indicating desired status (true for active, false for inactive)
   * @returns Promise with status update result
   */
  updateMenuChoiceStatus: (id: number | string, status: boolean = true) => {
    const role = getCurrentUserRole();
    const endpoints = getEndpointsByRole<
      typeof API_ENDPOINTS.VENDOR.MENU_CHOICES
    >("MENU_CHOICES", role);

    const url = endpoints.UPDATE_STATUS.replace("{id}", id.toString());

    // Send the status as a string value as required by the API
    return api
      .post<MenuChoiceUpdateResponse>(
        url,
        {
          status: status ? "active" : "inactive",
        },
        {
          returnFullResponse: true,
        }
      )
      .catch((error) => {
        console.error("API error in updateMenuChoiceStatus:", error);

        if (error.response && error.response.data) {
          return error.response.data;
        }

        return {
          status: false,
          message: error.message || "Failed to update menu choice status",
          errors: [],
          data: null,
        };
      });
  },
};
