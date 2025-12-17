import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { VenueLocation } from "@/types/api.types";

interface LocationState {
  selectedLocation: VenueLocation | null;
  allLocations: VenueLocation[];
  isLoading: boolean;

  // Actions
  setSelectedLocation: (location: VenueLocation) => void;
  setLocations: (locations: VenueLocation[]) => void;
  reset: () => void;

  // Helper methods
  hasLocation: () => boolean;
  getLocationId: () => number | null;
  getDefaultLocation: () => VenueLocation | null;
}

export const useLocationStore = create<LocationState>()(
  persist(
    immer<LocationState>((set, get) => ({
      // Initial state
      selectedLocation: null,
      allLocations: [],
      isLoading: false,

      // Actions
      setSelectedLocation: (location) =>
        set((state) => {
          // Ensure is_default is boolean and preserve all fields
          const normalizedLocation = {
            ...location,
            is_default: Boolean(location.is_default),
          };

          state.selectedLocation = normalizedLocation;

          // Also update localStorage for backward compatibility
          if (typeof window !== "undefined" && normalizedLocation?.id) {
            localStorage.setItem(
              "vendor_location_id",
              String(normalizedLocation.id)
            );
          }
        }),

      setLocations: (locations) =>
        set((state) => {
          // Ensure is_default is boolean in all locations and preserve all fields
          const normalizedLocations = locations.map((loc) => ({
            ...loc,
            is_default: Boolean(loc.is_default),
          }));

          state.allLocations = normalizedLocations;

          // Set default location if none selected
          if (!state.selectedLocation && normalizedLocations.length > 0) {
            const defaultLocation =
              normalizedLocations.find((loc) => loc.is_default === true) ||
              normalizedLocations[0];
            state.selectedLocation = defaultLocation;

            // Also update localStorage for backward compatibility
            if (typeof window !== "undefined" && defaultLocation?.id) {
              localStorage.setItem(
                "vendor_location_id",
                String(defaultLocation.id)
              );
            }
          }
          state.isLoading = false;
        }),

      reset: () =>
        set({
          selectedLocation: null,
          allLocations: [],
          isLoading: false,
        }),

      // Helper methods
      hasLocation: () => {
        const state = get();
        return !!state.selectedLocation?.id;
      },

      getLocationId: () => {
        const state = get();
        return state.selectedLocation?.id || null;
      },

      getDefaultLocation: () => {
        const state = get();
        if (!state.allLocations || state.allLocations.length === 0) {
          return null;
        }

        return (
          state.allLocations.find((loc) => loc.is_default === true) ||
          state.allLocations[0]
        );
      },
    })),
    {
      name: "location-storage",
      partialize: (state) => ({
        selectedLocation: state.selectedLocation,
        allLocations: state.allLocations,
      }),
    }
  )
);
