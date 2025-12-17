import { useSession } from "next-auth/react";
import { VenueLocation } from "@/types/api.types";

/**
 * React hook to update session with location data
 * @returns Function to update session with location data
 */
export function useUpdateSessionWithLocation() {
  const { data: session, update } = useSession();

  return async (locationData: {
    vendor_location_id?: number;
    default_venue_location?: VenueLocation;
    venue_locations?: VenueLocation[];
  }): Promise<boolean> => {
    if (!session) {
      throw new Error("No active session found");
    }

    // Format the data for the session update
    const payload: Record<string, unknown> = {};

    if (locationData.vendor_location_id !== undefined) {
      payload.vendor_location_id = String(locationData.vendor_location_id);
    }

    if (locationData.default_venue_location) {
      payload.default_venue_location = locationData.default_venue_location;
    }

    if (locationData.venue_locations) {
      payload.venue_locations = locationData.venue_locations;
    }

    // Use the update function from useSession
    await update(payload);

    return true;
  };
}
