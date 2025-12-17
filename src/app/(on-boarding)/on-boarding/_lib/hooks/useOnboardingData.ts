"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  ApiResponse,
  OnboardingApiResponse,
} from "@/services/vendor/onboarding/type";
import { OnboardingFormData } from "../../_components/form-provider/schema";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useLocationStore } from "@/store/location.store";
import { VenueLocation } from "@/types/api.types";

// Define query key for onboarding data
export const onboardingKeys = {
  all: ["onboarding"] as const,
  data: () => [...onboardingKeys.all, "data"] as const,
};

// Function to fetch onboarding data
async function fetchOnboardingData(
  token: string,
  locationId: string
): Promise<ApiResponse | null> {
  if (!token || !locationId) {
    console.warn("Missing token or locationId for onboarding data fetch:", {
      hasToken: !!token,
      locationId,
    });
    return null;
  }

  // Additional validation to prevent null/undefined locationId
  if (
    locationId === "null" ||
    locationId === "undefined" ||
    locationId === ""
  ) {
    console.warn("Invalid locationId for onboarding data fetch:", locationId);
    return null;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Venue-Location-Id": locationId,
  };

  try {
    const endpoint = API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
      "{location_id}",
      locationId
    );

    const response = await request<ApiResponse>({
      url: endpoint,
      method: "GET",
      headers,
      returnFullResponse: true,
    });

    if (response.status) {
      if (!response.data) {
        return {
          status: true,
          message: "Success but no data",
          data: {} as OnboardingApiResponse,
        };
      }
      const data = response.data as unknown as OnboardingFormData;

      return {
        status: true,
        message: response.message || "Success",
        data: data as unknown as OnboardingApiResponse,
      };
    }

    return null;
  } catch (err: unknown) {
    console.error("Error fetching onboarding data:", err);

    // Log additional details for debugging
    if (err && typeof err === "object" && "response" in err) {
      console.error("API Error details:", err);
    }

    return null;
  }
}

export function useOnboardingData() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const token = session?.user?.token;
  const { setLocations, setSelectedLocation } = useLocationStore();

  // Get locationId from session
  const locationId = session?.user?.vendor_location_id?.toString();

  // Validate locationId before making the query
  const isValidLocationId =
    locationId &&
    locationId !== "null" &&
    locationId !== "undefined" &&
    locationId !== "";

  const {
    data: onboardingData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: onboardingKeys.data(),
    queryFn: () => fetchOnboardingData(token as string, locationId as string),
    enabled: !!token && !!isValidLocationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Sync location data from persistence API to Zustand store and session
  useEffect(() => {
    if (!onboardingData?.data) return;

    const syncData = async () => {
      const persistenceData = onboardingData.data as unknown as {
        venue_locations?: VenueLocation[];
        default_venue_location?: VenueLocation;
        isOnboarded?: boolean;
        vendor_location_id?: number;
      };

      // Extract location data from persistence API
      const venueLocations = persistenceData.venue_locations || [];
      const defaultVenueLocation = persistenceData.default_venue_location;
      const isOnboarded = persistenceData.isOnboarded || false;
      const vendorLocationId = persistenceData.vendor_location_id;

      // Check if user just completed onboarding
      const currentIsOnboarded = session?.user?.isOnboarded;
      if (isOnboarded && !currentIsOnboarded) {
        // Update session before redirecting
        await updateSession({
          isOnboarded: true,
          vendor_location_id: String(
            vendorLocationId ||
              venueLocations[0]?.id ||
              defaultVenueLocation?.id
          ),
        });

        // Redirect to welcome page after session update
        setTimeout(() => {
          window.location.href = "/welcome/select-location?onboarded=true";
        }, 500);
        return;
      }

      // Only sync if there's location data to sync
      if (venueLocations.length > 0) {
        // Normalize locations to ensure is_default is boolean
        const normalizedLocations = venueLocations.map((loc) => ({
          ...loc,
          is_default: Boolean(loc.is_default),
        }));

        setLocations(normalizedLocations);

        // Find default location or use the first one
        const defaultLocation =
          normalizedLocations.find((loc) => loc.is_default === true) ||
          normalizedLocations[0];

        setSelectedLocation(defaultLocation);

        // Update session if location or onboarding status changed
        const currentLocationId = session?.user?.vendor_location_id;
        const currentIsOnboardedStatus = session?.user?.isOnboarded;
        const newLocationId = String(vendorLocationId || defaultLocation.id);

        if (
          currentLocationId !== newLocationId ||
          currentIsOnboardedStatus !== isOnboarded
        ) {
          updateSession({
            isOnboarded,
            vendor_location_id: newLocationId,
          });
        }
      } else if (defaultVenueLocation) {
        // If only default location is available
        const normalizedDefaultLocation = {
          ...defaultVenueLocation,
          is_default: Boolean(defaultVenueLocation.is_default),
        };

        setLocations([normalizedDefaultLocation]);
        setSelectedLocation(normalizedDefaultLocation);

        // Update session if location or onboarding status changed
        const currentLocationId = session?.user?.vendor_location_id;
        const currentIsOnboardedStatus = session?.user?.isOnboarded;
        const newLocationId = String(
          vendorLocationId || normalizedDefaultLocation.id
        );

        if (
          currentLocationId !== newLocationId ||
          currentIsOnboardedStatus !== isOnboarded
        ) {
          updateSession({
            isOnboarded,
            vendor_location_id: newLocationId,
          });
        }
      }
    };

    // Call the async function
    syncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingData]);

  // Mutation for invalidating the cache after form submissions
  const invalidateCache = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.data() });
      return await refetch();
    },
  });

  // Listen for the custom event from onboardingService.notifyDataChanged
  useEffect(() => {
    const handleDataChanged = () => {
      console.log("Data changed event received, refetching...");
      refetch();
    };

    window.addEventListener("onboarding-data-changed", handleDataChanged);

    return () => {
      window.removeEventListener("onboarding-data-changed", handleDataChanged);
    };
  }, [refetch]);

  return {
    onboardingData,
    isLoading,
    isError,
    error,
    refetch,
    invalidateCache: invalidateCache.mutate,
  };
}
