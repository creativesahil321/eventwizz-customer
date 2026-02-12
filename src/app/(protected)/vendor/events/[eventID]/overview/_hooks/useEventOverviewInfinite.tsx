"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";
import { useSession } from "next-auth/react";

// Query keys for infinite event overview
export const eventOverviewInfiniteKeys = {
  all: ["event-overview-infinite"] as const,
  byId: (eventId: string, status: string, dateFilter?: string) =>
    [
      ...eventOverviewInfiniteKeys.all,
      eventId,
      status,
      dateFilter || "",
    ] as const,
};

interface UseEventOverviewInfiniteParams {
  eventId: string;
  dateStatus: "all" | "available" | "sold_out";
  perPage?: number;
  dateFilter?: string; // Date filter in YYYY-MM-DD format
  /** When false, the query is disabled. Use to avoid duplicate fetch when "all" data is loaded elsewhere. */
  enabled?: boolean;
}

// Types matching the actual API response
type TableConfig = {
  size: number;
  count: number;
  price: string;
  sold: number;
  total: number;
};

type TicketInfo = {
  id: number;
  name: string;
  sold: number;
  total: number;
};

type DrinkInfo = {
  id: number;
  name: string;
  quantity: number;
};

type TableEntry = {
  id: number;
  eventDate: string;
  tables: TableConfig[];
  totalTables: number;
  category: string;
  tablesLeft: number;
  tablesBooked: number;
  totalPeople: number;
  submittedOn: string;
  soldOut: boolean;
  tickets?: TicketInfo[];
  drinks?: DrinkInfo[];
};

type EventInfo = {
  id: number;
  name: string;
  date: string;
  status: string;
  totalRevenue: string;
  totalBookings: number;
  totalGuests: number;
};

type PaginationLink = {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
};

type PaginationMeta = {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
  links: PaginationLink[];
  path: string;
};

export type EventOverviewResponse = {
  success: boolean;
  event: EventInfo;
  data: TableEntry[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: PaginationMeta;
};

export function useEventOverviewInfinite({
  eventId,
  dateStatus,
  perPage = 10,
  dateFilter,
  enabled: enabledProp = true,
}: UseEventOverviewInfiniteParams) {
  const { data: session } = useSession();

  return useInfiniteQuery<EventOverviewResponse>({
    queryKey: eventOverviewInfiniteKeys.byId(eventId, dateStatus, dateFilter),
    queryFn: async ({ pageParam = 1 }) => {
      if (!session?.user?.token || !eventId) {
        throw new Error("Missing authentication or event ID");
      }

      const response = await eventsService.getEventOverview(eventId, {
        date_status: dateStatus,
        date_per_page: perPage,
        date_page: pageParam as number,
        date_filter: dateFilter,
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
    enabled: enabledProp !== false && !!session?.user?.token && !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
