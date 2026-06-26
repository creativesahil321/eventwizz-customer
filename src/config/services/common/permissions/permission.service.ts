import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { PermissionsResponse } from "./type";
import axios from "axios";

export const permissionService = {
  getUserPermissions: async (): Promise<string[]> => {
    try {
      const response = await api.get<PermissionsResponse>(
        API_ENDPOINTS.COMMON.PERMISSIONS.GET
      );

      // Return just the permissions array
      return response.data?.permissions || [];
    } catch (error) {
      // Special handling for authentication errors (401)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.log("User not authenticated. Permissions request aborted.");
        // For 401 errors, return empty array without logging a full error
        return [];
      }

      // Log other errors
      console.error("Error fetching permissions:", error);
      return [];
    }
  },
};
