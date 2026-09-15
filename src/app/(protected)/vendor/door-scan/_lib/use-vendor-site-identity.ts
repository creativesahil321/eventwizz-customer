"use client";

import { useMemo } from "react";
import { useDomainStore } from "@/store/domain.store";
import {
  useCurrentLocationId,
  useVendorLocationsList,
} from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { pickVendorSiteIdentity } from "./door-entry-token";

/**
 * Brand shown on this vendor host (theme name), then the working venue.
 * Skips EventWizz platform naming so door-scan copy matches the public site.
 */
export function useVendorSiteIdentity(): string {
  const themeName = useDomainStore((state) => state.settings?.name);
  const { locations } = useVendorLocationsList();
  const currentLocationId = useCurrentLocationId();

  const selectedLocation = useMemo(() => {
    if (locations.length === 0) return null;
    if (currentLocationId) {
      return (
        locations.find((location) => location.id === currentLocationId) ||
        locations.find((location) => location.is_default) ||
        locations[0]
      );
    }
    return locations.find((location) => location.is_default) || locations[0];
  }, [currentLocationId, locations]);

  return pickVendorSiteIdentity({
    siteName: themeName,
    venueName: selectedLocation?.name,
    venueCity: selectedLocation?.city,
  });
}
