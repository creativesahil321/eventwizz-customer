"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { request } from "@/services/core/api-client";
import { ApiResponse } from "@/services/core/api-client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useIsPreviewModeFromProvider } from "@/contexts/preview-context";
import { buildVendorEventGetUrl } from "@/services/vendor/events/build-vendor-event-get-url";
import { parseEventIsRoomsFlag } from "@/lib/event-form-limits";
import { eventKeys as vendorEventsListKeys } from "../queries";

// Define query key for event data
export const eventKeys = {
  all: ["event"] as const,
  data: (eventId?: string) => [eventKeys.all, "data", eventId] as const,
};

const EVENT_DATA_CHANGED = "event-data-changed";

function parseIsRoomsFromEventApiPayload(data: unknown): 0 | 1 {
  if (!data || typeof data !== "object") return 0;
  const root = data as {
    is_rooms?: boolean | number | string;
    stepOne?: { is_rooms?: boolean | number | string };
    stepTwo?: { is_rooms?: boolean | number | string };
  };
  return parseEventIsRoomsFlag(
    root.is_rooms ?? root.stepTwo?.is_rooms ?? root.stepOne?.is_rooms,
  );
}

/** One listener for the whole app — avoids N refetches when N components use `useEventData`. */
let eventDataChangedSubscribers = 0;
let eventDataChangedHandler: (() => void) | null = null;

function attachEventDataChangedListener(qc: QueryClient) {
  eventDataChangedSubscribers++;
  if (eventDataChangedSubscribers !== 1) return;

  eventDataChangedHandler = () => {
    void qc.invalidateQueries({ queryKey: eventKeys.all });
    void qc.invalidateQueries({ queryKey: vendorEventsListKeys.lists() });
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
  eventId: string,
  isRooms?: boolean,
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
    const fetchByMode = async (roomsMode: boolean) =>
      request<ApiResponse>({
        url: buildVendorEventGetUrl(eventId, roomsMode),
        method: "GET",
        headers,
        returnFullResponse: true,
      });

    const response =
      typeof isRooms === "boolean"
        ? await fetchByMode(isRooms)
        : await fetchByMode(false).then(async (flatRes) => {
            if (!flatRes?.status) return fetchByMode(true);
            if (parseIsRoomsFromEventApiPayload(flatRes.data) === 1) {
              const roomsRes = await fetchByMode(true);
              return roomsRes?.status ? roomsRes : flatRes;
            }
            return flatRes;
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

export function useEventData(
  eventId?: string,
  /** `true` → `.../true`; `false` → `.../false`; omit/`undefined` probes true then false. */
  isRooms?: boolean,
  options?: {
    enabled?: boolean;
    /** Allow fetch on `/preview/event` inside PreviewProvider */ allowFetchInPreview?: boolean;
    /** Skip TanStack stale cache — refetch persistence GET every time (preview sync). */
    alwaysFresh?: boolean;
  },
) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const token = session?.user?.token;
  const isPreviewFromProvider = useIsPreviewModeFromProvider();
  const alwaysFresh = options?.alwaysFresh === true;

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
    queryKey: [
      ...eventKeys.data(eventId),
      isRooms === true ? "rooms" : isRooms === false ? "base" : "probe",
    ],
    queryFn: () => fetchEventData(token as string, eventId as string, isRooms),
    // Do not use URL `/preview/…` here — that blocked `/preview/event?id=` from loading.
    // Only skip when an ancestor PreviewProvider opts in (none today for useEventData call sites).
    enabled:
      options?.enabled !== false &&
      !!token &&
      !!isValidEventId &&
      (!isPreviewFromProvider || options?.allowFetchInPreview === true),
    staleTime: alwaysFresh ? 0 : 1000 * 60 * 5,
    gcTime: alwaysFresh ? 1000 * 60 : 1000 * 60 * 10,
    refetchOnMount: alwaysFresh ? "always" : true,
    refetchOnWindowFocus: false,
  });

  // Mutation for invalidating the cache after form submissions
  const invalidateCache = useMutation({
    mutationFn: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: eventKeys.data(eventId),
        }),
        queryClient.invalidateQueries({
          queryKey: vendorEventsListKeys.lists(),
        }),
      ]);
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
    invalidateCache: invalidateCache.mutateAsync,
  };
}
