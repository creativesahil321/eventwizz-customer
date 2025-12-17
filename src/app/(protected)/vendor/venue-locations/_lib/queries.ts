import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SearchParams } from "./types";
import { LocationFormValues } from "./validations";
import { useLocationStore } from "@/store/location.store";
import { VenueLocation as ApiVenueLocation } from "@/types/api.types";
import { locationService } from "@/services/vendor/locations/locations.service";
import {
  LocationCreatePayload,
  LocationUpdatePayload,
} from "@/services/vendor/locations/type";

// Interface for the actual API response structure
interface LocationApiResponse {
  data: {
    venue_locations?: ApiVenueLocation[];
    default_venue_location?: ApiVenueLocation;
    data?: ApiVenueLocation[];
  };
}

// Type guard to check if response is ApiVenueLocation[]
function isLocationArray(value: unknown): value is ApiVenueLocation[] {
  return (
    Array.isArray(value) && value.length > 0 && typeof value[0]?.id === "number"
  );
}

// Shared function to normalize location data
const normalizeLocation = (location: unknown): ApiVenueLocation => {
  const loc = location as Record<string, unknown>;
  return {
    ...loc,
    is_default: Boolean(loc.is_default),
    deleted_at: loc.deleted_at || undefined,
  } as unknown as ApiVenueLocation;
};

// Shared function to fetch locations from API
const fetchLocationsFromAPI = async (params?: SearchParams) => {
  const serviceParams = params
    ? {
        page: params.page,
        per_page: params.per_page,
        search: params.search,
        status: params.status,
      }
    : undefined;

  const response = (await locationService.getLocations(
    serviceParams
  )) as unknown as LocationApiResponse;

  // Handle the actual API response structure
  if (response && response.data) {
    // Check if it's the new structure with venue_locations array
    if (
      response.data.venue_locations &&
      Array.isArray(response.data.venue_locations)
    ) {
      return response.data.venue_locations;
    }
    // Check if it's the old structure with direct array
    else if (Array.isArray(response.data)) {
      return response.data;
    }
    // Check if it's a paginated response
    else if (response.data.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
  }

  // Fallback: check if response itself is an array
  if (isLocationArray(response)) {
    return response;
  }

  return [];
};

// Function to get all locations with filters
export const useLocations = (
  params: SearchParams,
  options?: { enabled?: boolean; forceRefresh?: boolean }
) => {
  // Get locations from store
  const { allLocations, getLocationId, setLocations, setSelectedLocation } =
    useLocationStore();
  const hasStoreLocations = allLocations && allLocations.length > 0;
  const locationId = getLocationId();

  return useQuery({
    // Use a consistent query key with locationId for proper cache invalidation
    queryKey: ["locations", locationId],
    queryFn: async () => {
      // If we have locations in store and not forcing refresh, return those
      if (hasStoreLocations && !options?.forceRefresh) {
        return allLocations;
      }

      // Fetch from API
      const response = (await locationService.getLocations(
        params
      )) as unknown as LocationApiResponse;
      const locations = await fetchLocationsFromAPI(params);

      // Process the full response to handle default location
      if (response && response.data && response.data.default_venue_location) {
        const defaultLocation = normalizeLocation(
          response.data.default_venue_location
        );

        // Set the default location as selected if no location is currently selected
        const currentStore = useLocationStore.getState();
        if (!currentStore.selectedLocation) {
          setSelectedLocation(defaultLocation);
        }
      }

      // Update the store with all locations
      setLocations(locations);

      return locations;
    },
    // Always return the store data as initialData
    initialData: hasStoreLocations ? allLocations : undefined,
    // Keep data fresh for 10 minutes unless force refreshed
    staleTime: 10 * 60 * 1000,
    // Skip network request completely if we have data and aren't forcing refresh
    enabled:
      options?.enabled !== false &&
      (!hasStoreLocations || options?.forceRefresh === true),
  });
};

// Simple hook to get all locations (for welcome page) - uses the same logic
export const useLocationsQuery = () => {
  return useLocations({}, { enabled: true });
};

// Function to get a single location by ID
export const useLocation = (id: number | string) => {
  const locationId = useLocationStore((state) => state.getLocationId());

  return useQuery({
    // Include the current locationId in the query key for proper cache invalidation
    queryKey: ["location", id, locationId],
    queryFn: () => locationService.getLocationById(id),
    enabled: !!id,
  });
};

// Function to create a new location
export const useCreateLocation = () => {
  const queryClient = useQueryClient();
  const { allLocations, setLocations, getLocationId } = useLocationStore();
  const locationId = getLocationId();

  return useMutation({
    mutationFn: (data: LocationFormValues) => {
      // Use is_default as boolean directly
      const payload: LocationCreatePayload = {
        name: data.name || "",
        city: data.city || "",
        address: data.address,
        slug: data.slug,
        email: data.email,
        contact_number: data.contact_number,
        is_default: data.is_default === true, // Ensure it's boolean
      };
      return locationService.createLocation(payload);
    },
    onSuccess: async (response) => {
      // Update the store and cache directly with the new location
      if (response && response.data && allLocations) {
        try {
          // Get the newly created location from response
          const newLocation = response.data;

          // Normalize the location data
          const normalizedLocation = normalizeLocation(newLocation);

          // Update the Zustand store
          const updatedLocations: ApiVenueLocation[] = [
            ...allLocations,
            normalizedLocation,
          ];
          setLocations(updatedLocations);

          // Update the query cache
          queryClient.setQueryData<ApiVenueLocation[]>(
            ["locations", locationId],
            updatedLocations
          );
        } catch (err) {
          console.error("Error processing location data:", err);
          // Fallback
          queryClient.invalidateQueries({
            queryKey: ["locations", locationId],
          });
        }
      } else {
        // Fallback: invalidate queries if we can't update directly
        queryClient.invalidateQueries({ queryKey: ["locations", locationId] });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to create location: " + error.message);
    },
  });
};

// Function to update a location
export const useUpdateLocation = (id: number | string) => {
  const queryClient = useQueryClient();
  const {
    allLocations,
    setLocations,
    getLocationId,
    selectedLocation,
    setSelectedLocation,
  } = useLocationStore();
  const locationId = getLocationId();

  return useMutation({
    mutationFn: (data: LocationFormValues) => {
      // Use is_default as boolean directly
      const payload: LocationUpdatePayload = {
        name: data.name,
        city: data.city,
        address: data.address,
        slug: data.slug,
        is_default: data.is_default === true, // Ensure it's boolean
        contact_number: data.contact_number,
        email: data.email,
      };
      return locationService.updateLocation(id, payload);
    },
    onSuccess: async (response) => {
      // Update the store and cache directly with the updated location
      if (response && response.data && allLocations) {
        try {
          // Get the updated location from response
          const updatedLocation = response.data;

          // Normalize the location data
          const normalizedLocation = normalizeLocation(updatedLocation);

          // Update in the array
          const updatedLocations: ApiVenueLocation[] = allLocations.map(
            (location) =>
              location.id === normalizedLocation.id
                ? normalizedLocation
                : location
          );

          // If this was the selected location, update it
          if (selectedLocation?.id === normalizedLocation.id) {
            setSelectedLocation(normalizedLocation);
          }

          // If this location was set as default, make sure other locations are not default
          if (normalizedLocation.is_default === true) {
            updatedLocations.forEach((loc) => {
              if (loc.id !== normalizedLocation.id) {
                loc.is_default = false;
              }
            });
          }

          // Update the Zustand store
          setLocations(updatedLocations);

          // Update the query cache
          queryClient.setQueryData<ApiVenueLocation[]>(
            ["locations", locationId],
            updatedLocations
          );
          queryClient.setQueryData<ApiVenueLocation>(
            ["location", id, locationId],
            normalizedLocation
          );
        } catch (err) {
          console.error("Error processing updated location:", err);
          // Fallback
          queryClient.invalidateQueries({
            queryKey: ["locations", locationId],
          });
          queryClient.invalidateQueries({
            queryKey: ["location", id, locationId],
          });
        }
      } else {
        // Fallback: invalidate queries if we can't update directly
        queryClient.invalidateQueries({ queryKey: ["locations", locationId] });
        queryClient.invalidateQueries({
          queryKey: ["location", id, locationId],
        });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to update location: " + error.message);
    },
  });
};

// Function to delete a location
export const useDeleteLocation = () => {
  const queryClient = useQueryClient();
  const {
    allLocations,
    setLocations,
    selectedLocation,
    setSelectedLocation,
    getDefaultLocation,
  } = useLocationStore();
  const locationId = useLocationStore((state) => state.getLocationId());

  return useMutation({
    mutationFn: (id: number | string) => locationService.deleteLocation(id),
    onSuccess: async (response, deletedId) => {
      if (!allLocations || allLocations.length === 0) {
        return;
      }

      try {
        // Convert ID to numeric for consistency
        const numericId =
          typeof deletedId === "string" ? parseInt(deletedId) : deletedId;

        // Remove from array
        const updatedLocations: ApiVenueLocation[] = allLocations.filter(
          (location) => location.id !== numericId
        );

        // Check if we deleted the currently selected location
        const wasSelectedLocationDeleted = selectedLocation?.id === numericId;

        // If we deleted the selected location, select a new one
        if (wasSelectedLocationDeleted && updatedLocations.length > 0) {
          // Find a new location to select (default or first available)
          const newSelectedLocation =
            getDefaultLocation() || updatedLocations[0];

          // Update selected location in store
          setSelectedLocation(newSelectedLocation);

          // Also update localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "vendor_location_id",
              String(newSelectedLocation.id)
            );
          }

          // Location data is now handled by Zustand store and TanStack Query
          // No need to update NextAuth session
        }

        // Update the Zustand store
        setLocations(updatedLocations);

        // Update the query cache
        queryClient.setQueryData<ApiVenueLocation[]>(
          ["locations", locationId],
          updatedLocations
        );

        // Remove the individual location data
        queryClient.removeQueries({
          queryKey: ["location", deletedId, locationId],
        });

        // Invalidate any queries that might depend on location data
        queryClient.invalidateQueries({ queryKey: ["events"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      } catch (err) {
        console.error("Error processing location deletion:", err);
        // Fallback: invalidate all location-related queries
        queryClient.invalidateQueries({ queryKey: ["locations"] });
        queryClient.invalidateQueries({ queryKey: ["location"] });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to delete location: " + error.message);
    },
  });
};
