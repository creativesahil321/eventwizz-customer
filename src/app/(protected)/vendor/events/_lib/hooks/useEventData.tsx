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
import {
  eventFlatPersistenceLikelyMissedRoomPayload,
  eventRoomsPersistenceHasRoomData,
  parseIsRoomsFromEventPersistencePayload,
} from "../vendor-event-is-rooms";
import { eventKeys as vendorEventsListKeys } from "../queries";

// Define query key for event data
export const eventKeys = {
  all: ["event"] as const,
  data: (eventId?: string) => [eventKeys.all, "data", eventId] as const,
};

const EVENT_DATA_CHANGED = "event-data-changed";

/** One listener for the whole app — avoids N refetches when N components use `useEventData`. */
let eventDataChangedSubscribers = 0;
let eventDataChangedHandler: ((event: Event) => void) | null = null;

function attachEventDataChangedListener(qc: QueryClient) {
  eventDataChangedSubscribers++;
  if (eventDataChangedSubscribers !== 1) return;

  eventDataChangedHandler = (event: Event) => {
    const changedEventId = (
      event as CustomEvent<{ eventId?: string } | undefined>
    ).detail?.eventId;

    // Prefer scoped invalidation so editing event A cannot rehydrate/wipe event B
    // (e.g. original vs location-duplicate open in another tab/cache).
    if (changedEventId) {
      void qc.invalidateQueries({
        queryKey: eventKeys.data(changedEventId),
      });
    } else {
      void qc.invalidateQueries({ queryKey: eventKeys.all });
    }
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
  hasSession: boolean,
  eventId: string,
  isRooms?: boolean,
): Promise<ApiResponse | null> {
  if (!hasSession || !eventId) {
    console.warn("Missing session or eventId for event data fetch:", {
      hasSession,
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

  // Auth is attached server-side by the /api/backend proxy (HttpOnly cookie).
  const headers: Record<string, string> = {};

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
            if (parseIsRoomsFromEventPersistencePayload(flatRes.data) === 1) {
              const roomsRes = await fetchByMode(true);
              return roomsRes?.status ? roomsRes : flatRes;
            }
            if (eventFlatPersistenceLikelyMissedRoomPayload(flatRes.data)) {
              const roomsRes = await fetchByMode(true);
              if (
                roomsRes?.status &&
                eventRoomsPersistenceHasRoomData(roomsRes.data)
              ) {
                return roomsRes;
              }
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
  const { status } = useSession();
  const queryClient = useQueryClient();
  const hasSession = status === "authenticated";
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
    queryFn: () => fetchEventData(hasSession, eventId as string, isRooms),
    // Do not use URL `/preview/…` here — that blocked `/preview/event?id=` from loading.
    // Only skip when an ancestor PreviewProvider opts in (none today for useEventData call sites).
    enabled:
      options?.enabled !== false &&
      hasSession &&
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
