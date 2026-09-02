import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  normalizeThemePresetsCatalog,
  type ThemePresetsCatalog,
  type ThemePresetsCatalogResponse,
} from "./theme-presets.type";

/**
 * Public theme preset catalog (no auth). Used by Try theme / preview.
 */
export async function getThemePresetsCatalog(): Promise<ThemePresetsCatalog> {
  const response = await api.get<ThemePresetsCatalogResponse>(
    API_ENDPOINTS.COMMON.THEME.PRESETS,
    { returnFullResponse: true },
  );
  const catalog = normalizeThemePresetsCatalog(response.data);
  if (!catalog) {
    throw new Error("Theme preset catalog was empty or invalid.");
  }
  return catalog;
}

export const themePresetsService = {
  getThemePresetsCatalog,
};
