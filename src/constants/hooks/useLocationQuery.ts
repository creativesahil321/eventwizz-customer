import {
  useQuery,
  UseQueryOptions,
  QueryFunction,
  QueryKey,
} from "@tanstack/react-query";
import { useLocationStore } from "@/store/location.store";

/**
 * Custom hook for location-aware queries
 * Automatically includes the selected location ID in the query key
 */
export function useLocationQuery<TData>(
  queryKey: QueryKey,
  queryFn: QueryFunction<TData>,
  options?: UseQueryOptions<TData>
) {
  const { selectedLocation } = useLocationStore();

  // Include location ID in query key
  const locationQueryKey = [
    ...(Array.isArray(queryKey) ? queryKey : [queryKey]),
    selectedLocation?.id || "no-location",
  ];

  return useQuery<TData>(
    locationQueryKey,
    async () => {
      if (!selectedLocation) {
        throw new Error("No location selected");
      }
      return queryFn({ locationId: selectedLocation.id });
    },
    {
      ...options,
      // Disable query if no location is selected
      enabled: !!selectedLocation && options?.enabled !== false,
    }
  );
}
