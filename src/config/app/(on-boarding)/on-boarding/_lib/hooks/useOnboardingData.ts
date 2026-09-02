"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { request } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import {
  ApiResponse,
  OnboardingApiResponse,
} from "@/services/vendor/onboarding/type";
import { OnboardingFormData } from "../../_components/form-provider/schema";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useLocationStore } from "@/store/location.store";
import { VenueLocation } from "@/types/api.types";
import { recoverFromOnboardingAlreadyCompleted } from "@/lib/onboarding-completion";

// Define query key for onboarding data
export const onboardingKeys = {
  all: ["onboarding"] as const,
  data: (isRooms: boolean | "unknown") =>
    [...onboardingKeys.all, "data", isRooms] as const,
};

const ONBOARDING_IS_ROOMS_STORAGE_KEY = "onboarding_is_rooms";
const ONBOARDING_DATA_CHANGED = "onboarding-data-changed";

/** Prevents duplicate NextAuth csrf/session when sync effect re-runs with a stale session snapshot. */
let lastSessionSyncKey: string | null = null;

/**
 * One listener for the whole app — avoids N refetches when N components
 * call `useOnboardingData` (e.g. client + form provider).
 * `invalidateQueries` alone refetches active observers; do not also call `refetch()`.
 */
let onboardingDataChangedSubscribers = 0;
let onboardingDataChangedHandler: (() => void) | null = null;

function attachOnboardingDataChangedListener(qc: QueryClient) {
  onboardingDataChangedSubscribers++;
  if (onboardingDataChangedSubscribers !== 1) return;

  // Coalesce rapid notify + any leftover invalidate into one refetch.
  let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
  onboardingDataChangedHandler = () => {
    if (invalidateTimer) clearTimeout(invalidateTimer);
    invalidateTimer = setTimeout(() => {
      invalidateTimer = null;
      void qc.invalidateQueries({ queryKey: onboardingKeys.all });
    }, 50);
  };
  window.addEventListener(ONBOARDING_DATA_CHANGED, onboardingDataChangedHandler);
}

function detachOnboardingDataChangedListener() {
  onboardingDataChangedSubscribers = Math.max(
    0,
    onboardingDataChangedSubscribers - 1,
  );
  if (onboardingDataChangedSubscribers !== 0 || !onboardingDataChangedHandler) {
    return;
  }

  window.removeEventListener(
    ONBOARDING_DATA_CHANGED,
    onboardingDataChangedHandler,
  );
  onboardingDataChangedHandler = null;
}

function readIsRoomsFlag(): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = sessionStorage.getItem(ONBOARDING_IS_ROOMS_STORAGE_KEY);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function coerceIsRoomsFlag(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

// Function to fetch onboarding data
async function fetchOnboardingData(
  token: string,
  locationId: string,
  isRooms?: boolean,
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
    const fetchByMode = async (roomsMode: boolean) =>
      request<ApiResponse>({
        url: API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
          "{location_id}",
          locationId,
        ).replace("{is_rooms}", roomsMode ? "true" : "false"),
        method: "GET",
        headers,
        returnFullResponse: true,
      });

    const response =
      typeof isRooms === "boolean"
        ? await fetchByMode(isRooms)
        : await (() => {
            // Unknown mode: probe rooms first, then fallback.
            return fetchByMode(true).then((roomsRes) =>
              roomsRes?.status ? roomsRes : fetchByMode(false),
            );
          })();

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
  const [isRoomsFlag, setIsRoomsFlag] = useState<boolean | undefined>(() =>
    readIsRoomsFlag(),
  );

  // Get locationId from session
  const locationId = session?.user?.vendor_location_id?.toString();

  // Validate locationId before making the query
  const isValidLocationId =
    locationId &&
    locationId !== "null" &&
    locationId !== "undefined" &&
    locationId !== "";

  const syncIsRoomsFlagFromStorage = useCallback(() => {
    setIsRoomsFlag(readIsRoomsFlag());
  }, []);

  const {
    data: onboardingData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: onboardingKeys.data(isRoomsFlag ?? "unknown"),
    queryFn: () =>
      fetchOnboardingData(token as string, locationId as string, isRoomsFlag),
    enabled: !!token && !!isValidLocationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Sync location data from persistence API to Zustand store and session
  useEffect(() => {
    if (!onboardingData?.data) return;

    const payload = onboardingData.data as unknown as Record<string, unknown>;
    const persistedIsRooms = coerceIsRoomsFlag(payload.is_rooms);
    if (
      typeof persistedIsRooms === "boolean" &&
      persistedIsRooms !== isRoomsFlag
    ) {
      // Reuse current payload under the corrected key — avoids a second GET
      // when flipping from "unknown" → true/false after the first response.
      queryClient.setQueryData(
        onboardingKeys.data(persistedIsRooms),
        onboardingData,
      );
      setIsRoomsFlag(persistedIsRooms);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          ONBOARDING_IS_ROOMS_STORAGE_KEY,
          persistedIsRooms ? "true" : "false",
        );
      }
    }

    const syncData = async () => {
      const persistenceData = onboardingData.data as unknown as {
        venue_locations?: VenueLocation[];
        default_venue_location?: VenueLocation;
        isOnboarded?: boolean;
        vendor_location_id?: number;
      };

      const venueLocations = persistenceData.venue_locations || [];
      const defaultVenueLocation = persistenceData.default_venue_location;
      const isOnboarded = persistenceData.isOnboarded || false;
      const vendorLocationId = persistenceData.vendor_location_id;

      // Persistence says complete but JWT is stale.
      // While still on /on-boarding (normal step-11 finish), go to preview —
      // NOT welcome. Welcome was racing step-11's router.replace("/preview/onboarding").
      if (isOnboarded && !session?.user?.isOnboarded) {
        const locationIdForSession = String(
          vendorLocationId ||
            venueLocations[0]?.id ||
            defaultVenueLocation?.id ||
            "",
        );
        const stillOnOnboarding =
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/on-boarding");

        void recoverFromOnboardingAlreadyCompleted({
          redirectTo: stillOnOnboarding
            ? "/preview/onboarding"
            : undefined,
          session: locationIdForSession
            ? { vendor_location_id: locationIdForSession }
            : undefined,
        });
        return;
      }

      // Only sync if there's location data to sync
      if (venueLocations.length > 0) {
        // Normalize locations to ensure flags are boolean
        const normalizedLocations = venueLocations.map((loc) => ({
          ...loc,
          is_default: Boolean(loc.is_default),
          is_headquarters: Boolean(loc.is_headquarters),
        }));

        setLocations(normalizedLocations);

        // Find default location or use the first one
        const defaultLocation =
          normalizedLocations.find((loc) => loc.is_default === true) ||
          normalizedLocations[0];

        setSelectedLocation(defaultLocation);

        // Update session only when values actually change.
        // Important: `undefined !== false` used to fire updateSession on every refetch
        // (duplicate csrf + session after each step save).
        const currentLocationId = String(
          session?.user?.vendor_location_id ?? "",
        );
        const currentIsOnboarded = Boolean(session?.user?.isOnboarded);
        const nextIsOnboarded = Boolean(isOnboarded);
        const newLocationId = String(vendorLocationId || defaultLocation.id);

        if (
          currentLocationId !== newLocationId ||
          currentIsOnboarded !== nextIsOnboarded
        ) {
          // Avoid overlapping NextAuth updates with the step's own updateSession.
          if (!lastSessionSyncKey || lastSessionSyncKey !== `${newLocationId}:${nextIsOnboarded}`) {
            lastSessionSyncKey = `${newLocationId}:${nextIsOnboarded}`;
            void updateSession({
              isOnboarded: nextIsOnboarded,
              vendor_location_id: newLocationId,
            });
          }
        }
      } else if (defaultVenueLocation) {
        // If only default location is available
        const normalizedDefaultLocation = {
          ...defaultVenueLocation,
          is_default: Boolean(defaultVenueLocation.is_default),
          is_headquarters: Boolean(defaultVenueLocation.is_headquarters),
        };

        setLocations([normalizedDefaultLocation]);
        setSelectedLocation(normalizedDefaultLocation);

        const currentLocationId = String(
          session?.user?.vendor_location_id ?? "",
        );
        const currentIsOnboarded = Boolean(session?.user?.isOnboarded);
        const nextIsOnboarded = Boolean(isOnboarded);
        const newLocationId = String(
          vendorLocationId || normalizedDefaultLocation.id,
        );

        if (
          currentLocationId !== newLocationId ||
          currentIsOnboarded !== nextIsOnboarded
        ) {
          if (!lastSessionSyncKey || lastSessionSyncKey !== `${newLocationId}:${nextIsOnboarded}`) {
            lastSessionSyncKey = `${newLocationId}:${nextIsOnboarded}`;
            void updateSession({
              isOnboarded: nextIsOnboarded,
              vendor_location_id: newLocationId,
            });
          }
        }
      }
    };

    // Call the async function
    syncData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingData, isRoomsFlag]);

  // Mutation for invalidating the cache after form submissions
  const invalidateCache = useMutation({
    mutationFn: async () => {
      // invalidateQueries already refetches active observers — no extra refetch()
      await queryClient.invalidateQueries({
        queryKey: onboardingKeys.all,
      });
    },
  });

  // Single shared listener (same pattern as useEventData)
  useEffect(() => {
    attachOnboardingDataChangedListener(queryClient);
    return () => detachOnboardingDataChangedListener();
  }, [queryClient]);

  // Keep is_rooms flag in sync when another tab/window updates storage
  useEffect(() => {
    window.addEventListener("storage", syncIsRoomsFlagFromStorage);
    return () => {
      window.removeEventListener("storage", syncIsRoomsFlagFromStorage);
    };
  }, [syncIsRoomsFlagFromStorage]);

  // Also sync rooms flag when notify fires (listener only invalidates queries)
  useEffect(() => {
    const handleDataChanged = () => {
      syncIsRoomsFlagFromStorage();
    };
    window.addEventListener(ONBOARDING_DATA_CHANGED, handleDataChanged);
    return () => {
      window.removeEventListener(ONBOARDING_DATA_CHANGED, handleDataChanged);
    };
  }, [syncIsRoomsFlagFromStorage]);

  return {
    onboardingData,
    isLoading,
    isError,
    error,
    refetch,
    invalidateCache: invalidateCache.mutate,
  };
}
