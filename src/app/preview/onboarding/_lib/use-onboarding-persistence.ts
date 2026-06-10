"use client";

import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { useSession } from "next-auth/react";

/**
 * Lightweight hook to fetch the onboarding persistence payload
 * for the preview page.  Unlike the full `useOnboardingData` (which
 * syncs Zustand, triggers session updates, and can auto-redirect),
 * this hook only reads the data for display purposes.
 */

interface OnboardingPersistenceResponse {
  status: boolean;
  message: string;
  data: Record<string, unknown>;
}

async function fetchOnboardingPersistence(
  token: string,
  locationId: string,
  isRooms: boolean,
): Promise<Record<string, unknown> | null> {
  if (!token || !locationId) return null;

  try {
    const response = await request<OnboardingPersistenceResponse>({
      url: API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
        "{location_id}",
        locationId,
      ).replace("{is_rooms}", isRooms ? "true" : "false"),
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Venue-Location-Id": locationId,
      },
      returnFullResponse: true,
    });

    if (response?.status && response.data) {
      return response.data as unknown as Record<string, unknown>;
    }

    // Retry with opposite rooms mode if first attempt failed
    if (!response?.status) {
      const retryResponse = await request<OnboardingPersistenceResponse>({
        url: API_ENDPOINTS.VENDOR.ONBOARDING.GET_ALL_STEPS.replace(
          "{location_id}",
          locationId,
        ).replace("{is_rooms}", !isRooms ? "true" : "false"),
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Venue-Location-Id": locationId,
        },
        returnFullResponse: true,
      });

      if (retryResponse?.status && retryResponse.data) {
        return retryResponse.data as unknown as Record<string, unknown>;
      }
    }

    return null;
  } catch (err) {
    console.error("[onboarding-preview] persistence fetch error:", err);
    return null;
  }
}

export function useOnboardingPersistence() {
  const { data: session } = useSession();
  const token = session?.user?.token;
  const locationId = session?.user?.vendor_location_id?.toString();

  const isValidLocationId =
    locationId &&
    locationId !== "null" &&
    locationId !== "undefined" &&
    locationId !== "";

  // Read isRooms from sessionStorage (same key as onboarding)
  const isRooms = (() => {
    if (typeof window === "undefined") return true;
    const raw = sessionStorage.getItem("onboarding_is_rooms");
    if (raw === "false") return false;
    return true; // default to rooms mode
  })();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-preview-persistence", locationId, isRooms],
    queryFn: () =>
      fetchOnboardingPersistence(
        token as string,
        locationId as string,
        isRooms,
      ),
    enabled: !!token && !!isValidLocationId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return {
    persistenceData: data ?? null,
    isLoading,
  };
}
