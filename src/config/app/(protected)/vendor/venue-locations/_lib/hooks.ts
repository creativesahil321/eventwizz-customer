import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { locationService } from "@/services/vendor/locations/locations.service";
import { useSession } from "next-auth/react";
import { VenueLocation } from "@/types/api.types";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { useLocationStore } from "@/store/location.store";
import { useAuthStore } from "@/store/auth.store";
import { LocationsQueryData, LOCATION_DEPENDENT_QUERY_KEYS } from "./queries";
import { getLocationSwitchRedirectPath } from "./location-switch-redirect";

/**
 * Hook for switching the current location
 * Updates NextAuth session and uses optimistic updates for smooth UX
 */
export function useSwitchLocation() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();
  const router = useRouter();

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
      const previousLocations = queryClient.getQueriesData({
        queryKey: ["locations"],
      });

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
        },
      );

      return { previousLocations };
    },
    onSuccess: async (data) => {
      const { default_venue_location } = data;

      // Update NextAuth session with the new location ID
      if (default_venue_location?.id) {
        const locId = Number(default_venue_location.id);
        useLocationStore.getState().setSelectedLocation(default_venue_location);
        // Sync auth store immediately so profile query key + API headers match
        useAuthStore.setState((state) => {
          state.vendor_location_id = locId;
        });
        try {
          localStorage.setItem("vendor_location_id", String(locId));
        } catch {
          // ignore
        }
        try {
          await updateSession({
            vendor_location_id: String(locId),
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

      // Explicit profile refetch (site_url / payment / notification stats)
      await queryClient.invalidateQueries({
        queryKey: ["profile"],
        refetchType: "active",
      });

      // Do not wipe Site Essentials preview mid-session — preview Edit/Save
      // also call switchLocation and need the snapshot until navigation finishes.
      if (
        typeof window !== "undefined" &&
        window.location.pathname.startsWith("/preview/site")
      ) {
        return;
      }

      // Clear site essentials preview store so it doesn't show previous location's data
      useSitePreviewStore.getState().clearPreviewData();

      // Leave venue-bound detail pages (e.g. event edit) so the previous
      // location's record cannot stay open under the new venue context.
      if (typeof window !== "undefined") {
        const redirectTo = getLocationSwitchRedirectPath(
          window.location.pathname,
        );
        if (redirectTo) {
          // Mark stale without refetching — active edit page is about to unmount.
          queryClient.invalidateQueries({
            queryKey: ["event"],
            refetchType: "none",
          });
          router.replace(redirectTo);
        }
      }
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
