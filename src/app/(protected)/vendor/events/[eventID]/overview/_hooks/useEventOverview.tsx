"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";
import { useSession } from "next-auth/react";

// Query keys for event overview
export const eventOverviewKeys = {
  all: ["event-overview"] as const,
  byId: (eventId: string, status: string, page: number, dateFilter?: string) =>
    [
      ...eventOverviewKeys.all,
      eventId,
      status,
      page,
      dateFilter || "",
    ] as const,
};

interface UseEventOverviewParams {
  eventId: string;
  dateStatus: "all" | "available" | "sold_out";
  page: number;
  perPage?: number;
  dateFilter?: string; // Date filter in YYYY-MM-DD format
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

export function useEventOverview({
  eventId,
  dateStatus,
  page,
  perPage = 10,
  dateFilter,
}: UseEventOverviewParams) {
  const { data: session } = useSession();

  return useQuery<EventOverviewResponse>({
    queryKey: eventOverviewKeys.byId(eventId, dateStatus, page, dateFilter),
    queryFn: async () => {
      if (!session?.user?.token || !eventId) {
        throw new Error("Missing authentication or event ID");
      }

      const response = await eventsService.getEventOverview(eventId, {
        date_status: dateStatus,
        date_per_page: perPage,
        date_page: page,
        date_filter: dateFilter,
      });

      return response as EventOverviewResponse;
    },
    enabled: !!session?.user?.token && !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
