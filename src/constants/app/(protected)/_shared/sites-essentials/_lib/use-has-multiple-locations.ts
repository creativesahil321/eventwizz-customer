"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useLocationsQuery } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useSiteEssentialsQuery } from "./queries";

/** True when the vendor has 2+ locations (multi-location home + per-location pages). */
export function useHasMultipleLocations(): boolean {
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";
  const { data: siteEssentials } = useSiteEssentialsQuery();
  const { data: locationsResult } = useLocationsQuery(isVendor);

  return useMemo(() => {
    const fromSiteEssentials = siteEssentials?.locations?.length ?? 0;
    if (fromSiteEssentials > 0) {
      return fromSiteEssentials > 1;
    }

    if (!locationsResult) {
      return false;
    }

    const venueList = Array.isArray(locationsResult)
      ? locationsResult
      : locationsResult.data ?? [];

    return venueList.length > 1;
  }, [siteEssentials?.locations, locationsResult]);
}

export function resolveHasMultipleLocations(
  locationsCount: number | undefined,
): boolean {
  return (locationsCount ?? 0) > 1;
}
