"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { eventsService } from "@/services/vendor/events/events.service";
import { EventOverviewResponse } from "@/services/vendor/events/type";

// Define query key for event overview
export const eventOverviewKeys = {
  all: ["event-overview"] as const,
  detail: (eventId?: string, status?: string, page?: number) =>
    [eventOverviewKeys.all, eventId, status, page] as const,
};

interface UseEventOverviewParams {
  eventId: string;
  dateStatus?: "all" | "available" | "sold_out";
  datePerPage?: number;
  datePage?: number;
}

export function useEventOverview({
  eventId,
  dateStatus = "all",
  datePerPage = 10,
  datePage = 1,
}: UseEventOverviewParams) {
  const { data: session } = useSession();
  const token = session?.user?.token;

  // Validate eventId before making the query
  const isValidEventId =
    eventId &&
    eventId !== "null" &&
    eventId !== "undefined" &&
    eventId !== "" &&
    eventId !== "{eventId}" &&
    !isNaN(parseInt(eventId));

  const {
    data: overviewData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EventOverviewResponse>({
    queryKey: eventOverviewKeys.detail(eventId, dateStatus, datePage),
    queryFn: () =>
      eventsService.getEventOverview(eventId, {
        date_status: dateStatus,
        date_per_page: datePerPage,
        date_page: datePage,
      }),
    enabled: !!token && !!isValidEventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    overviewData,
    isLoading,
    isError,
    error,
    refetch,
  };
}
