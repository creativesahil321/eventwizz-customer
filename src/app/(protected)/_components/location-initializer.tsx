"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LocationInitializerProvider } from "@/providers/location-initializer-provider";
import {
  useLocations,
  type LocationsQueryData,
} from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth.store";

export function LocationInitializer() {
  const { data: session } = useSession();
  const accountType = useAuthStore((state) => state.account_type);
  const userAccountType = session?.user?.account_type || accountType;
  const isVendor = userAccountType === "vendor";
  const queryClient = useQueryClient();

  // Pre-populate React Query from session venue_locations on initial load so the
  // header dropdown is populated instantly (before the API responds on hard reload).
  // We only seed when the cache is empty to avoid overwriting fresher API data.
  useEffect(() => {
    if (!isVendor) return;

    const sessionLocations = session?.user?.venue_locations;
    if (!sessionLocations?.length) return;

    // Only seed when there's no data in the cache yet
    const existing = queryClient.getQueryData<LocationsQueryData>([
      "locations",
      undefined,
      undefined,
      undefined,
    ]);
    if (existing?.data?.length) return;

    queryClient.setQueryData<LocationsQueryData>(
      ["locations", undefined, undefined, undefined],
      { data: sessionLocations },
    );
  }, [isVendor, session?.user?.venue_locations, queryClient]);

  // Fetch locations on mount for vendors only (pure React Query, no store)
  useLocations({}, { enabled: isVendor });

  return <LocationInitializerProvider>{null}</LocationInitializerProvider>;
}
