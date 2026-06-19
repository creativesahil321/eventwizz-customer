/**
 * Custom hook to get location slug with fallback strategy
 *
 * Prioritizes:
 * 1. Selected location from store
 * 2. Default location from store
 * 3. Domain settings locations
 *
 * @returns location slug or null if not available
 */

import { useMemo } from "react";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useLocationStore } from "@/store/location.store";

export function useLocationSlug(): string | null {
  const { settings } = useDomain();
  const { getDefaultLocation, selectedLocation } = useLocationStore();

  return useMemo(() => {
    // Priority 1: Selected location from store
    if (selectedLocation?.slug) {
      return selectedLocation.slug;
    }

    // Priority 2: Default location from store
    const defaultLocation = getDefaultLocation();
    if (defaultLocation?.slug) {
      return defaultLocation.slug;
    }

    // Priority 3: Domain settings locations
    if (settings?.locations && settings.locations.length > 0) {
      const defaultLocationFromSettings =
        settings.locations.find((loc) => loc.is_default) ||
        settings.locations[0];
      return defaultLocationFromSettings?.slug || null;
    }

    return null;
  }, [selectedLocation, getDefaultLocation, settings]);
}
