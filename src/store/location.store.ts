import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { VenueLocation } from "@/types/api.types";
import { resolveVenueLocationCoords } from "@/lib/venue-location-address";

// Version for data migration - increment when VenueLocation structure changes
const LOCATION_STORAGE_VERSION = 3;

function withNormalizedCoords(location: VenueLocation): VenueLocation {
  const coords = resolveVenueLocationCoords(
    location as VenueLocation & Record<string, unknown>,
  );
  if (!coords) return location;
  return {
    ...location,
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

interface LocationState {
  selectedLocation: VenueLocation | null;
  allLocations: VenueLocation[];
  isLoading: boolean;
  _version?: number; // Internal version tracking

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
      _version: LOCATION_STORAGE_VERSION,

      // Actions
      setSelectedLocation: (location) =>
        set((state) => {
          // Ensure is_default and status are boolean and preserve all fields
          const normalizedLocation = {
            ...withNormalizedCoords(location),
            is_default: Boolean(location.is_default),
            status: location.status !== undefined ? Boolean(location.status) : true,
          };

          state.selectedLocation = normalizedLocation;
          state._version = LOCATION_STORAGE_VERSION;

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
          // Ensure is_default and status are boolean in all locations and preserve all fields
          const normalizedLocations = locations.map((loc) => ({
            ...withNormalizedCoords(loc),
            is_default: Boolean(loc.is_default),
            status: loc.status !== undefined ? Boolean(loc.status) : true,
          }));

          state.allLocations = normalizedLocations;
          state._version = LOCATION_STORAGE_VERSION;

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
          } else if (state.selectedLocation?.id) {
            // Refresh selected location from latest list (picks up new lat/lng).
            const refreshed = normalizedLocations.find(
              (loc) => loc.id === state.selectedLocation?.id,
            );
            if (refreshed) {
              state.selectedLocation = refreshed;
            }
          }
          state.isLoading = false;
        }),

      reset: () =>
        set({
          selectedLocation: null,
          allLocations: [],
          isLoading: false,
          _version: LOCATION_STORAGE_VERSION,
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
      version: LOCATION_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedLocation: state.selectedLocation,
        allLocations: state.allLocations,
        _version: state._version,
      }),
      // Migration function - clears old data if version doesn't match
      migrate: (persistedState: unknown, version: number) => {
        if (version !== LOCATION_STORAGE_VERSION) {
          // Version mismatch - return fresh state to force re-fetch
          console.log(
            `Location storage version mismatch (stored: ${version}, current: ${LOCATION_STORAGE_VERSION}). Clearing cached data.`
          );
          return {
            selectedLocation: null,
            allLocations: [],
            isLoading: false,
            _version: LOCATION_STORAGE_VERSION,
          };
        }
        return persistedState as LocationState;
      },
    }
  )
);
