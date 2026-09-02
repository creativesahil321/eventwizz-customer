"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useLocationStore } from "@/store/location.store";

/**
 * Venue id currently selected in the header, falling back to the session.
 *
 * Location-scoped APIs receive this through the `x-venue-location-id` request
 * header, so queries for that data must include it in their query key to stay
 * separated per venue. Returns 0 when no location is resolved yet.
 */
export function useHeaderLocationId(): number {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const { data: session } = useSession();

  return useMemo(() => {
    const fromStore = selectedLocation?.id ? Number(selectedLocation.id) : 0;
    const fromSession = session?.user?.vendor_location_id
      ? Number(session.user.vendor_location_id)
      : 0;
    return fromStore > 0 ? fromStore : fromSession > 0 ? fromSession : 0;
  }, [selectedLocation?.id, session?.user?.vendor_location_id]);
}
