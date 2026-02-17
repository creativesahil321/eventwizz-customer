import { api } from "@/services/core/api-client";
import { SiteEssentials, SiteEssentialsResponse } from "./type";
import { getEndpointsByRole } from "@/lib/utils/api-endpoints";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";

/**
 * Type definition for site essentials endpoints
 * This makes the code more generic and avoids hardcoding a specific role's endpoint type
 */
type SiteEssentialsEndpoints = {
  GET: string;
  UPDATE: string;
};

/**
 * Get site essentials settings
 * @returns Promise with site essentials data
 */
export const getSiteEssentials = async (): Promise<SiteEssentials> => {
  try {
    const endpoints =
      getEndpointsByRole<SiteEssentialsEndpoints>("SITES_ESSENTIALS");
    const response = await api.get<SiteEssentialsResponse>(endpoints.GET, {
      returnFullResponse: true,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching site essentials:", error);
    throw error;
  }
};

/**
 * Update site essentials settings
 * @param data Site essentials data to update (can be partial)
 * @returns Promise with updated site essentials data
 */
export const updateSiteEssentials = async (
  data: Partial<SiteEssentialsFormValues>
): Promise<SiteEssentials> => {
  try {
    const endpoints =
      getEndpointsByRole<SiteEssentialsEndpoints>("SITES_ESSENTIALS");

    // Check if we have any File or Blob objects that need to be sent as FormData
    const hasFiles = Object.values(data).some(
      (value) => value instanceof File || value instanceof Blob
    );

    if (hasFiles) {
      // Create FormData for multipart request
      const formData = new FormData();
      formData.append("_method", "PATCH");

      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else if (value !== null && value !== undefined) {
          // Handle nested objects (like colors, typography, etc.)
          if (typeof value === "object") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      const response = await api.post<SiteEssentialsResponse>(
        endpoints.UPDATE,
        formData,
        {
          returnFullResponse: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } else {
      // No files, send as regular JSON
      const response = await api.post<SiteEssentialsResponse>(
        endpoints.UPDATE,
        data as unknown as SiteEssentialsFormValues, // Type assertion to bypass strict type checking for mixed data types
        { returnFullResponse: true }
      );
      return response.data;
    }
  } catch (error) {
    console.error("Error updating site essentials:", error);
    throw error;
  }
};

const siteEssentialsService = {
  getSiteEssentials,
  updateSiteEssentials,
};

export default siteEssentialsService;
