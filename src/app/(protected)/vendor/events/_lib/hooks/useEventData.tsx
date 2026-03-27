"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { request } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import { ApiResponse } from "@/services/core/api-client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useIsPreviewMode } from "@/contexts/preview-context";

// Define query key for event data
export const eventKeys = {
  all: ["event"] as const,
  data: (eventId?: string) => [eventKeys.all, "data", eventId] as const,
};

const EVENT_DATA_CHANGED = "event-data-changed";

/** One listener for the whole app — avoids N refetches when N components use `useEventData`. */
let eventDataChangedSubscribers = 0;
let eventDataChangedHandler: (() => void) | null = null;

function attachEventDataChangedListener(qc: QueryClient) {
  eventDataChangedSubscribers++;
  if (eventDataChangedSubscribers !== 1) return;

  eventDataChangedHandler = () => {
    void qc.invalidateQueries({ queryKey: eventKeys.all });
  };
  window.addEventListener(EVENT_DATA_CHANGED, eventDataChangedHandler);
}

function detachEventDataChangedListener() {
  eventDataChangedSubscribers = Math.max(0, eventDataChangedSubscribers - 1);
  if (eventDataChangedSubscribers !== 0 || !eventDataChangedHandler) return;

  window.removeEventListener(EVENT_DATA_CHANGED, eventDataChangedHandler);
  eventDataChangedHandler = null;
}

// Function to fetch event data
async function fetchEventData(
  token: string,
  eventId: string
): Promise<ApiResponse | null> {
  if (!token || !eventId) {
    console.warn("Missing token or eventId for event data fetch:", {
      hasToken: !!token,
      eventId,
    });
    return null;
  }

  // Additional validation to prevent invalid eventId
  if (
    eventId === "null" ||
    eventId === "undefined" ||
    eventId === "" ||
    eventId === "{eventId}"
  ) {
    console.warn("Invalid eventId for event data fetch:", eventId);
    return null;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  try {
    const endpoint = API_ENDPOINTS.VENDOR.EVENT.GET_EVENT.replace(
      "{eventId}",
      eventId
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
          data: null,
          errors: [],
        };
      }

      return {
        status: true,
        message: response.message || "Success",
        data: response.data,
        errors: [],
      };
    }

    return null;
  } catch (err: unknown) {
    console.error("Error fetching event data:", err);

    // Log additional details for debugging
    if (err && typeof err === "object" && "response" in err) {
      console.error("API Error details:", err);
    }

    return null;
  }
}

export function useEventData(eventId?: string) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const token = session?.user?.token;
  const isPreviewMode = useIsPreviewMode();

  // Validate eventId before making the query
  const isValidEventId =
    eventId &&
    eventId !== "null" &&
    eventId !== "undefined" &&
    eventId !== "" &&
    eventId !== "{eventId}" &&
    !isNaN(parseInt(eventId));

  const {
    data: eventData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: eventKeys.data(eventId),
    queryFn: () => fetchEventData(token as string, eventId as string),
    enabled: !!token && !!isValidEventId && !isPreviewMode, // Disable API calls in preview mode
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Mutation for invalidating the cache after form submissions
  const invalidateCache = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({
        queryKey: eventKeys.data(eventId),
      });
    },
  });

  useEffect(() => {
    attachEventDataChangedListener(queryClient);
    return () => detachEventDataChangedListener();
  }, [queryClient]);

  return {
    eventData,
    isLoading,
    isError,
    error,
    refetch,
    invalidateCache: invalidateCache.mutate,
  };
}
