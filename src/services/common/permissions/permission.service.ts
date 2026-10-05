import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import axios from "axios";

/** Pull the permission strings out of whatever shape the API returns. */
function extractPermissions(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.filter((p): p is string => typeof p === "string");
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    // api-client already unwraps the `{ data }` envelope, so the usual shape
    // here is `{ permissions: [...] }`. Fall back to `data.permissions` in case
    // a caller returns the full envelope.
    if (Array.isArray(obj.permissions)) return extractPermissions(obj.permissions);
    if (obj.data) return extractPermissions(obj.data);
  }
  return [];
}

export const permissionService = {
  getUserPermissions: async (): Promise<string[]> => {
    try {
      const response = await api.get<unknown>(
        API_ENDPOINTS.COMMON.PERMISSIONS.GET
      );
      return extractPermissions(response);
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
