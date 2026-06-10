import { useSession } from "next-auth/react";

/**
 * Updates the session with the active vendor location id only.
 * Full location lists are kept in React Query / Zustand — not in the JWT cookie.
 */
export function useUpdateSessionWithLocation() {
  const { data: session, update } = useSession();

  return async (locationData: {
    vendor_location_id?: number | string;
  }): Promise<boolean> => {
    if (!session) {
      throw new Error("No active session found");
    }

    if (locationData.vendor_location_id === undefined) {
      return true;
    }

    await update({
      vendor_location_id: String(locationData.vendor_location_id),
    });

    return true;
  };
}
