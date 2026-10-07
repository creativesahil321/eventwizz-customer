"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventOverviewResponse } from "@/services/vendor/events/type";
import { useSession } from "next-auth/react";
import { FRESHNESS } from "@/lib/query-freshness";

// Query keys for event overview
export const eventOverviewKeys = {
  all: ["event-overview"] as const,
  byId: (
    eventId: string,
    status: string,
    page: number,
    dateFilter?: string,
    roomId?: string,
  ) =>
    [
      ...eventOverviewKeys.all,
      eventId,
      status,
      page,
      dateFilter || "",
      roomId || "",
    ] as const,
};

interface UseEventOverviewParams {
  eventId: string;
  dateStatus: "all" | "available" | "sold_out";
  page: number;
  perPage?: number;
  dateFilter?: string;
  roomId?: string;
}

export function useEventOverview({
  eventId,
  dateStatus,
  page,
  perPage = 10,
  dateFilter,
  roomId,
}: UseEventOverviewParams) {
  const { status } = useSession();
  const hasSession = status === "authenticated";

  return useQuery<EventOverviewResponse>({
    queryKey: eventOverviewKeys.byId(
      eventId,
      dateStatus,
      page,
      dateFilter,
      roomId,
    ),
    queryFn: async () => {
      if (!hasSession || !eventId) {
        throw new Error("Missing authentication or event ID");
      }

      const response = await eventsService.getEventOverview(eventId, {
        date_status: dateStatus,
        date_per_page: perPage,
        date_page: page,
        date_filter: dateFilter,
        room_id: roomId,
      });

      return response as EventOverviewResponse;
    },
    enabled: hasSession && !!eventId,
    ...FRESHNESS.operational,
    placeholderData: keepPreviousData,
  });
}

export type { EventOverviewResponse } from "@/services/vendor/events/type";
