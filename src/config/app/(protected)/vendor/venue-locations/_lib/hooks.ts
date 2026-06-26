import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationService } from "@/services/vendor/locations/locations.service";
import { useSession } from "next-auth/react";
import { VenueLocation } from "@/types/api.types";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { useLocationStore } from "@/store/location.store";
import { LocationsQueryData, LOCATION_DEPENDENT_QUERY_KEYS } from "./queries";

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
        useLocationStore.getState().setSelectedLocation(default_venue_location);
        try {
          await updateSession({
            vendor_location_id: String(default_venue_location.id),
          });
        } catch (error) {
          console.error("Failed to update session with new location:", error);
        }
      }

      queryClient.invalidateQueries({
        queryKey: ["locations"],
        refetchType: "active",
      });

      // Refetch location-dependent data so APIs hit with new vendor_location_id
      LOCATION_DEPENDENT_QUERY_KEYS.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey, refetchType: "active" });
      });

      // Clear site essentials preview store so it doesn't show previous location's data
      useSitePreviewStore.getState().clearPreviewData();
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
