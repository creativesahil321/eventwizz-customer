import { useMutation, useQueryClient } from "@tanstack/react-query";
import { locationService } from "@/services/vendor/locations/locations.service";
import { useSession } from "next-auth/react";
import { useLocationStore } from "@/store/location.store";
import { useAuthStore } from "@/store/auth.store";
import { AuthUser } from "@/types/auth.types";

/**
 * Hook for switching the current location
 * Updates both NextAuth session and Zustand stores
 */
export function useSwitchLocation() {
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();
  const setSelectedLocation = useLocationStore(
    (state) => state.setSelectedLocation
  );
  const setLocations = useLocationStore((state) => state.setLocations);
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (locationId: number | string) => {
      // Call the location service to switch locations
      const response = await locationService.switchLocation(locationId);
      return response.data;
    },
    onSuccess: async (data) => {
      // Extract location data from response
      const { default_venue_location, venue_locations } = data;

      // Ensure is_default is boolean in default location and preserve all fields
      const normalizedDefaultLocation = default_venue_location
        ? {
            ...default_venue_location,
            is_default: Boolean(default_venue_location.is_default),
          }
        : null;

      // Ensure is_default is boolean in all locations and preserve all fields
      const normalizedLocations =
        venue_locations && Array.isArray(venue_locations)
          ? venue_locations.map((loc) => ({
              ...loc,
              is_default: Boolean(loc.is_default),
            }))
          : [];

      // Update Zustand location store
      if (normalizedDefaultLocation) {
        setSelectedLocation(normalizedDefaultLocation);
      }

      if (normalizedLocations.length > 0) {
        setLocations(normalizedLocations);
      }

      // Update auth store with the new location ID
      if (normalizedDefaultLocation?.id) {
        // Create update data with vendor_location_id as a custom property
        const updateData = {
          // Include any standard AuthUser properties you need to update
        } as Partial<AuthUser> & { vendor_location_id: string };

        // Set the vendor_location_id
        updateData.vendor_location_id = String(normalizedDefaultLocation.id);

        // Update the user data
        updateUser(updateData);
      }

      // Update NextAuth session with only the vendor_location_id
      try {
        await updateSession({
          vendor_location_id: normalizedDefaultLocation?.id?.toString(),
        });
      } catch (error) {
        console.error("Failed to update session with new location:", error);
      }

      // Invalidate ALL location-dependent queries to refresh data throughout the app
      // Core data
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["venue-locations"] });

      // Users and customers
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });

      // Orders and payments
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-history"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      // Menu and products
      queryClient.invalidateQueries({ queryKey: ["menu-choices"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["pricing"] });

      // Marketing and communications
      queryClient.invalidateQueries({ queryKey: ["marketing"] });
      queryClient.invalidateQueries({ queryKey: ["newsletter"] });
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });

      // Notifications
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });

      // Settings and configurations
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
      queryClient.invalidateQueries({ queryKey: ["site-essentials"] });

      // Support and misc
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
    onError: (error: unknown) => {
      console.error("Failed to switch location:", error);
    },
  });
}
