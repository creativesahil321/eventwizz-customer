import { api } from "@/services/core/api-client";
import { SiteEssentials, SiteEssentialsResponse } from "./type";
import { getEndpointsByRole } from "@/lib/utils/api-endpoints";
import { normalizeThemePayload } from "@/lib/normalize-theme-payload";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";

/**
 * Type definition for site essentials endpoints
 * This makes the code more generic and avoids hardcoding a specific role's endpoint type
 */
type SiteEssentialsEndpoints = {
  GET: string;
  UPDATE: string;
  RESET_THEME_DEFAULT: string;
  THEME_PRESETS: string;
  APPLY_THEME_PRESET: string;
};

export type GetSiteEssentialsOptions = {
  /** Venue location slug — API returns site essentials scoped to that location. */
  slug?: string;
  /** When true, returns onboarding-enriched data (theme, locations, events). */
  is_onboarding?: boolean;
  /** Event slug — returns event detail within site essentials response. */
  event_slug?: string;
};

/**
 * Get site essentials settings
 * @returns Promise with site essentials data
 */
export const getSiteEssentials = async (
  options?: GetSiteEssentialsOptions,
): Promise<SiteEssentials> => {
  try {
    const endpoints =
      getEndpointsByRole<SiteEssentialsEndpoints>("SITES_ESSENTIALS");
    const params: Record<string, string> = {};
    if (options?.slug) params.slug = options.slug;
    if (options?.is_onboarding) params.is_onboarding = "true";
    if (options?.event_slug) params.event_slug = options.event_slug;

    const response = await api.get<SiteEssentialsResponse>(endpoints.GET, {
      returnFullResponse: true,
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return normalizeThemePayload(response.data);
  } catch (error) {
    console.error("Error fetching site essentials:", error);
    throw error;
  }
};

/**
 * Reset colors + typography to platform defaults; logo, copy, and media unchanged.
 * @see docs/backend-contracts/site-essentials-reset-theme.md
 */
export const resetSiteEssentialsThemeToDefault = async (): Promise<SiteEssentials> => {
  try {
    const endpoints =
      getEndpointsByRole<SiteEssentialsEndpoints>("SITES_ESSENTIALS");
    const response = await api.post<SiteEssentialsResponse>(
      endpoints.RESET_THEME_DEFAULT,
      {},
      {
        returnFullResponse: true,
      },
    );
    return normalizeThemePayload(response.data);
  } catch (error) {
    console.error("Error resetting site essentials theme:", error);
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
      // Laravel expects nested objects as PHP array fields
      // (colors[primary], typography[fontFamily][heading], …) — not JSON strings.
      const formData = new FormData();
      appendToFormData(formData, data as Record<string, unknown>);

      if (!formData.has("_method")) {
        formData.append("_method", "PATCH");
      }

      const response = await api.post<SiteEssentialsResponse>(
        endpoints.UPDATE,
        formData,
        {
          returnFullResponse: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return normalizeThemePayload(response.data);
    } else {
      // Strip unsaved blob/data URLs — they are not valid server media paths
      const sanitized = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => {
          if (typeof value !== "string") return true;
          const v = value.trim();
          return !(v.startsWith("blob:") || v.startsWith("data:"));
        }),
      ) as Partial<SiteEssentialsFormValues>;

      const response = await api.patch<SiteEssentialsResponse>(
        endpoints.UPDATE,
        sanitized as unknown as SiteEssentialsFormValues,
        { returnFullResponse: true },
      );
      return normalizeThemePayload(response.data);
    }
  } catch (error) {
    console.error("Error updating site essentials:", error);
    throw error;
  }
};

/**
 * Append nested objects/arrays using PHP/Laravel bracket notation so validators
 * receive arrays (e.g. colors[primary]), not a JSON string.
 */
function appendToFormData(
  formData: FormData,
  value: unknown,
  path = "",
): void {
  if (value === undefined) return;
  if (value === null) {
    // Laravel JSON PATCH needs an explicit null for theme_preset_id (custom theme).
    // FormData cannot send JSON null — empty string is treated as clear.
    if (path === "theme_preset_id") {
      formData.append(path, "");
    }
    return;
  }

  if (value instanceof File || value instanceof Blob) {
    if (path) formData.append(path, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      appendToFormData(formData, item, `${path}[${index}]`);
    });
    return;
  }

  if (typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      const nextPath = path ? `${path}[${key}]` : key;
      appendToFormData(formData, nested, nextPath);
    });
    return;
  }

  if (!path) return;
  if (typeof value === "boolean") {
    formData.append(path, value ? "1" : "0");
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Never send preview-only blob/data URLs to the API
    if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return;
    formData.append(path, value);
    return;
  }
  formData.append(path, String(value));
}

/**
 * Apply a catalog recipe: writes catalog colors/typography and theme_preset_id.
 * Does not change logo, copy, or media.
 */
export const applySiteEssentialsThemePreset = async (
  themePresetId: string,
): Promise<SiteEssentials> => {
  try {
    const endpoints =
      getEndpointsByRole<SiteEssentialsEndpoints>("SITES_ESSENTIALS");
    const response = await api.post<SiteEssentialsResponse>(
      endpoints.APPLY_THEME_PRESET,
      { theme_preset_id: themePresetId },
      { returnFullResponse: true },
    );
    return normalizeThemePayload(response.data);
  } catch (error) {
    console.error("Error applying site essentials theme preset:", error);
    throw error;
  }
};

const siteEssentialsService = {
  getSiteEssentials,
  updateSiteEssentials,
  resetSiteEssentialsThemeToDefault,
  applySiteEssentialsThemePreset,
};

export default siteEssentialsService;
