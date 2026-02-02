import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationService } from "@/services/vendor/locations/locations.service";
import { useSession } from "next-auth/react";
import { VenueLocation } from "@/types/api.types";
import { LocationsQueryData } from "./queries";

/**
 * Hook for switching the current location
 * Updates NextAuth session and uses optimistic updates for smooth UX
 */
export function useSwitchLocation() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();

  return useMutation({
    mutationFn: async (locationId: number | string) => {
      const response = await locationService.switchLocation(locationId);
      return response.data;
    },
    // Optimistic update - instant UI feedback
    onMutate: async (locationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["locations"] });

      // Get current location data
      const previousLocations = queryClient.getQueriesData({ queryKey: ["locations"] });

      // Optimistically update locations to show new default instantly
      queryClient.setQueriesData<LocationsQueryData>(
        { queryKey: ["locations"], exact: false },
        (old) => {
          if (!old) return old;

          const locations = old.data || [];

          // Update is_default flags
          const updatedLocations = locations.map((loc: VenueLocation) => ({
            ...loc,
            is_default: loc.id === Number(locationId),
          }));

          return { ...old, data: updatedLocations };
        }
      );

      return { previousLocations };
    },
    onSuccess: async (data) => {
      const { default_venue_location } = data;

      // Update NextAuth session with the new location ID
      if (default_venue_location?.id) {
        try {
          await updateSession({
            vendor_location_id: String(default_venue_location.id),
          });
        } catch (error) {
          console.error("Failed to update session with new location:", error);
        }
      }

      // Only invalidate locations query (minimal refetch)
      // Don't invalidate other queries unless actually changing context
      queryClient.invalidateQueries({
        queryKey: ["locations"],
        refetchType: "active" // Only refetch active queries
      });
    },
    onError: (error: unknown, _locationId, context) => {
      // Rollback optimistic update on error
      if (context?.previousLocations) {
        context.previousLocations.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error("Failed to switch location:", error);
    },
  });
}
