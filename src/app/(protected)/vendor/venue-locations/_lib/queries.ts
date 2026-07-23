import { useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { SearchParams } from "./types";
import { LocationFormValues } from "./validations";
import { VenueLocation as ApiVenueLocation } from "@/types/api.types";
import { locationService } from "@/services/vendor/locations/locations.service";
import { useSitePreviewStore } from "@/store/site-preview.store";
import {
  LocationCreatePayload,
  LocationUpdatePayload,
} from "@/services/vendor/locations/type";
import { useSession } from "next-auth/react";
import { useLocationStore } from "@/store/location.store";

// Constants
const LOCATIONS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

/** Query key prefixes to invalidate when default location changes (APIs use location from session/header) */
export const LOCATION_DEPENDENT_QUERY_KEYS = [
  ["vendor", "dashboard"],
  ["vendor-booking-history"],
  ["vendor-transactions"],
  ["menu-choices"],
  ["vendor", "email-logs"],
  ["site-essentials"],
  ["events"],
] as const;

// Helper: Get current location ID from session (no localStorage)
export const useCurrentLocationId = (): number | null => {
  const { data: session } = useSession();
  const locationId = session?.user?.vendor_location_id;
  return locationId ? Number(locationId) : null;
};

// API returns meta and links at top level (siblings of data)
export interface LocationsMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}

// Interface for the actual API response structure
interface LocationApiResponse {
  data: {
    venue_locations?: ApiVenueLocation[];
    default_venue_location?: ApiVenueLocation;
    data?: ApiVenueLocation[];
  };
  meta?: LocationsMeta;
  links?: { first: string; last: string; prev: string | null; next: string | null };
}

// Query result shape when we need pagination (data + meta)
export interface LocationsQueryData {
  data: ApiVenueLocation[];
  meta?: LocationsMeta;
}

export interface SyncVendorLocationsResult extends LocationsQueryData {
  default_venue_location?: ApiVenueLocation;
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
    is_headquarters: Boolean(loc.is_headquarters),
    status: loc.status !== undefined ? Boolean(loc.status) : undefined,
    deleted_at: loc.deleted_at || undefined,
  } as unknown as ApiVenueLocation;
};

// Helper: Transform search params to service params
const transformSearchParams = (params?: SearchParams) => {
  return params
    ? {
      page: params.page,
      per_page: params.per_page,
      search: params.search,
      status: params.status,
    }
    : undefined;
};

// Helper: Extract locations array from API response
const extractLocationsFromResponse = (response: LocationApiResponse): ApiVenueLocation[] => {
  if (!response?.data) return [];

  if (response.data.venue_locations && Array.isArray(response.data.venue_locations)) {
    return response.data.venue_locations;
  }
  if (response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  if (isLocationArray(response.data)) {
    return response.data;
  }
  return [];
};

/** Fetch latest locations and push into React Query + Zustand (await before navigating). */
export async function syncVendorLocationsCache(
  queryClient: QueryClient,
  params?: SearchParams,
): Promise<SyncVendorLocationsResult | null> {
  try {
    const serviceParams = transformSearchParams(params);
    const response = (await locationService.getLocations(
      serviceParams,
    )) as unknown as LocationApiResponse;

    const locations = extractLocationsFromResponse(response);
    const normalizedLocations = locations.map((location) =>
      normalizeLocation(location),
    );
    const meta = response?.meta;
    const default_venue_location = response?.data?.default_venue_location
      ? normalizeLocation(response.data.default_venue_location)
      : undefined;

    const queryData: LocationsQueryData = { data: normalizedLocations, meta };

    queryClient.setQueriesData<LocationsQueryData>(
      { queryKey: ["locations"], exact: false },
      queryData,
    );

    if (normalizedLocations.length > 0) {
      useLocationStore.getState().setLocations(normalizedLocations);
    }

    return { ...queryData, default_venue_location };
  } catch (error) {
    console.error("Failed to sync vendor locations cache:", error);
    await queryClient.refetchQueries({ queryKey: ["locations"], type: "all" });
    return null;
  }
}

// Function to get all locations with filters (pure React Query, no Zustand store)
export const useLocations = (
  params: SearchParams,
  options?: { enabled?: boolean }
) => {
  // Include pagination and search in query key so URL-driven refetch works
  const page = params?.page != null ? String(params.page) : undefined;
  const per_page = params?.per_page != null ? String(params.per_page) : undefined;
  const search = typeof params?.search === "string" ? params.search : undefined;

  return useQuery({
    queryKey: ["locations", page, per_page, search],
    queryFn: async (): Promise<LocationsQueryData> => {
      const serviceParams = transformSearchParams(params);
      const response = (await locationService.getLocations(serviceParams)) as unknown as LocationApiResponse;

      const locations = extractLocationsFromResponse(response);
      const normalizedLocations = locations.map((location) => normalizeLocation(location));
      const meta = response?.meta;

      return { data: normalizedLocations, meta };
    },
    staleTime: LOCATIONS_STALE_TIME,
    enabled: options?.enabled !== false,
  });
};

// Simple hook to get all locations (for welcome page and header)
export const useLocationsQuery = (enabled: boolean = true) => {
  return useLocations({}, { enabled });
};

/** Hook for vendor-only UIs (e.g. staff forms, dropdowns). Returns locations list and loading state. Shares cache with header/location page. */
export function useVendorLocationsList(): {
  locations: ApiVenueLocation[];
  isLoading: boolean;
} {
  const { data: session } = useSession();
  const isVendor = session?.user?.account_type === "vendor";
  const { data: locationsResult, isLoading } = useLocationsQuery(isVendor);
  const locations = useMemo(() => {
    if (!locationsResult) return [];
    if (Array.isArray(locationsResult)) return locationsResult;
    return locationsResult.data ?? [];
  }, [locationsResult]);
  return { locations, isLoading };
}

// Function to get a single location by ID
export const useLocation = (id: number | string) => {
  return useQuery({
    queryKey: ["location", id],
    queryFn: () => locationService.getLocationById(id),
    enabled: !!id,
  });
};

// Function to create a new location
export const useCreateLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LocationFormValues) => {
      const payload: LocationCreatePayload = {
        name: data.name || "",
        city: data.city || "",
        address: data.address,
        slug: data.slug,
        email: data.email,
        contact_number: data.contact_number,
        is_default: data.is_default === true,
      };
      return locationService.createLocation(payload);
    },
    onSuccess: async () => {
      await syncVendorLocationsCache(queryClient);
    },
  });
};

// Function to update a location
export const useUpdateLocation = (id: number | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LocationFormValues) => {
      const payload: LocationUpdatePayload = {
        city: data.city,
        address: data.address,
        slug: data.slug,
        is_default: data.is_default === true,
        contact_number: data.contact_number,
        email: data.email,
      };
      return locationService.updateLocation(id, payload);
    },
    onSuccess: async () => {
      // Invalidate all location queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["location", id] });
    },
  });
};

// Payload for toggle location status
type ToggleStatusPayload = {
  location_id: number | string;
  status: "active" | "inactive";
};

// Function to toggle location status (active / inactive)  
export const useToggleLocationStatus = () => {
  const queryClient = useQueryClient();
  const { data: session, update: updateSession } = useSession();

  return useMutation({
    mutationFn: (payload: ToggleStatusPayload) =>
      locationService.toggleLocationStatus(payload),
    // Optimistic update for instant UI feedback
    onMutate: async (payload) => {
      const locationId = typeof payload.location_id === "string"
        ? parseInt(payload.location_id, 10)
        : payload.location_id;
      const newStatus = payload.status === "active";

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["locations"] });

      // Get current data
      const previousLocations = queryClient.getQueriesData({ queryKey: ["locations"] });

      // Optimistically update the status
      queryClient.setQueriesData<ApiVenueLocation[] | { data: ApiVenueLocation[]; meta?: unknown }>(
        { queryKey: ["locations"], exact: false },
        (old) => {
          if (!old) return old;

          const locations = Array.isArray(old) ? old : old?.data || [];

          // Update the status for the matching location
          const updatedLocations = locations.map((loc: ApiVenueLocation) =>
            loc.id === locationId
              ? { ...loc, status: newStatus }
              : loc
          );

          return Array.isArray(old)
            ? updatedLocations
            : { ...old, data: updatedLocations };
        }
      );

      return { previousLocations, locationId, newStatus };
    },
    onSuccess: async (_response, _payload, context) => {
      // Refetch locations to get backend updates (e.g., default switch)
      const refetchPromise = queryClient.refetchQueries({
        queryKey: ["locations"],
        type: "active"
      });

      // If we toggled current location to inactive, wait for refetch then switch to new default
      if (context?.newStatus === false &&
        session?.user?.vendor_location_id &&
        Number(session.user.vendor_location_id) === context.locationId) {

        // Wait for locations to refetch
        await refetchPromise;

        // Get the refreshed locations data
        const locationQueries = queryClient.getQueriesData<LocationsQueryData>({
          queryKey: ["locations"]
        });

        // Find the new default location from refreshed data
        if (locationQueries && locationQueries.length > 0) {
          const [, locationsData] = locationQueries[0];
          if (!locationsData) return;

          const locations = locationsData.data || [];
          const newDefaultLocation = locations.find((loc: ApiVenueLocation) => loc.is_default);

          // Update session to new default if found
          if (newDefaultLocation && newDefaultLocation.id !== context.locationId) {
            try {
              await updateSession({
                vendor_location_id: String(newDefaultLocation.id),
              });
              LOCATION_DEPENDENT_QUERY_KEYS.forEach((queryKey) => {
                queryClient.invalidateQueries({ queryKey, refetchType: "active" });
              });
              useSitePreviewStore.getState().clearPreviewData();
            } catch (error) {
              console.error("Failed to update session with new default location:", error);
            }
          }
        }
      }
    },
    onError: (error: unknown, _payload, context) => {
      // Rollback optimistic update on error
      if (context?.previousLocations) {
        context.previousLocations.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error("Failed to toggle location status:", error);
    },
  });
};

// Function to delete a location
export const useDeleteLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => locationService.deleteLocation(id),
    onSuccess: async (_response, deletedId) => {
      // Invalidate all location queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.removeQueries({ queryKey: ["location", deletedId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
};
