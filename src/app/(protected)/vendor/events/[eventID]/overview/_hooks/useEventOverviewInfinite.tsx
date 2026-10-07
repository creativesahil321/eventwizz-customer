"use client";

import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventOverviewResponse } from "@/services/vendor/events/type";
import { useSession } from "next-auth/react";
import { FRESHNESS } from "@/lib/query-freshness";

// Query keys for infinite event overview
export const eventOverviewInfiniteKeys = {
  all: ["event-overview-infinite"] as const,
  byId: (
    eventId: string,
    status: string,
    dateFilter?: string,
    roomId?: string,
  ) =>
    [
      ...eventOverviewInfiniteKeys.all,
      eventId,
      status,
      dateFilter || "",
      roomId || "",
    ] as const,
};

interface UseEventOverviewInfiniteParams {
  eventId: string;
  dateStatus: "all" | "available" | "sold_out";
  perPage?: number;
  dateFilter?: string;
  roomId?: string;
  /** When false, the query is disabled. Use to avoid duplicate fetch when "all" data is loaded elsewhere. */
  enabled?: boolean;
}

export function useEventOverviewInfinite({
  eventId,
  dateStatus,
  perPage = 10,
  dateFilter,
  roomId,
  enabled: enabledProp = true,
}: UseEventOverviewInfiniteParams) {
  const { status } = useSession();
  const hasSession = status === "authenticated";

  return useInfiniteQuery<EventOverviewResponse>({
    queryKey: eventOverviewInfiniteKeys.byId(
      eventId,
      dateStatus,
      dateFilter,
      roomId,
    ),
    queryFn: async ({ pageParam = 1 }) => {
      if (!hasSession || !eventId) {
        throw new Error("Missing authentication or event ID");
      }

      const response = await eventsService.getEventOverview(eventId, {
        date_status: dateStatus,
        date_per_page: perPage,
        date_page: pageParam as number,
        date_filter: dateFilter,
        room_id: roomId,
      });

      return response as EventOverviewResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // If there's a next page, return the next page number
      if (lastPage.meta.current_page < lastPage.meta.last_page) {
        return lastPage.meta.current_page + 1;
      }
      // No more pages
      return undefined;
    },
    enabled: enabledProp !== false && hasSession && !!eventId,
    ...FRESHNESS.operational,
    placeholderData: keepPreviousData,
  });
}

export type { EventOverviewResponse } from "@/services/vendor/events/type";
