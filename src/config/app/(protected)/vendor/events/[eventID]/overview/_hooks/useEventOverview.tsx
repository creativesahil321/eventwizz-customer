"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";
import type { EventOverviewResponse } from "@/services/vendor/events/type";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();

  return useQuery<EventOverviewResponse>({
    queryKey: eventOverviewKeys.byId(
      eventId,
      dateStatus,
      page,
      dateFilter,
      roomId,
    ),
    queryFn: async () => {
      if (!session?.user?.token || !eventId) {
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
    enabled: !!session?.user?.token && !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export type { EventOverviewResponse } from "@/services/vendor/events/type";
