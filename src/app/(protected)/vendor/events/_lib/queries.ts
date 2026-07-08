import {
  UseQueryOptions,
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { eventsService } from "@/services/vendor/events/events.service";
import {
  EventItem,
  EventsQueryParams,
  EventsResponse,
  EventsListFilterMeta,
} from "@/services/vendor/events/type";
import { EventSchemaType } from "../_components/tab-event-form/schema";
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: EventsQueryParams) =>
    [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

type EventsResult = {
  items: EventItem[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    [key: string]: unknown;
  };
  filter_meta?: EventsListFilterMeta;
};

/**
 * Hook to fetch events list with TanStack Query
 */
export const useEvents = (
  params: EventsQueryParams,
  initialData?: EventItem[],
  options?: Omit<
    UseQueryOptions<
      EventsResponse,
      Error,
      EventsResult,
      ReturnType<typeof eventKeys.list>
    >,
    "queryKey" | "queryFn" | "select" | "initialData"
  >
) => {
  return useQuery<
    EventsResponse,
    Error,
    EventsResult,
    ReturnType<typeof eventKeys.list>
  >({
    queryKey: eventKeys.list(params),
    queryFn: async () => {
      try {
        const response = await eventsService.getEvents(params);
        return response;
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    },
    select: (data) => {
      if (!data) {
        console.warn("No data received from API");
        return {
          items: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
          filter_meta: undefined,
        };
      }

      // Check if data is valid and has required properties
      if (!data.status || !data.data) {
        console.warn("API response missing required fields:", data);
        return {
          items: [],
          meta: { current_page: 1, last_page: 1, total: 0 },
          filter_meta: undefined,
        };
      }

      // Your API response structure: { status: true, message: "Success", data: [...], links: {...}, meta: {...}, errors: [] }
      return {
        items: Array.isArray(data.data) ? data.data : [],
        meta: data.meta || { current_page: 1, last_page: 1, total: 0 },
        filter_meta: data.filter_meta,
      };
    },
    placeholderData: keepPreviousData,
    initialData:
      initialData && initialData.length > 0
        ? {
            status: true,
            message: "Initial data",
            data: initialData,
            links: { first: "", last: "", prev: null, next: null },
            meta: {
              current_page: 1,
              from: 1,
              last_page: 1,
              links: [],
              path: "",
              per_page: 30,
              to: initialData.length,
              total: initialData.length,
            },
            errors: [],
          }
        : undefined,
    ...options,
  });
};

/**
 * Hook to fetch a single event by ID
 */
export const useEvent = (id: number) => {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const response = await eventsService.getEvent(id);
      if (!response || !response.data) {
        throw new Error("Failed to fetch event");
      }
      return response.data;
    },
    enabled: !!id,
  });
};

/**
 * Hook to create a new event
 */
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EventSchemaType) => {
      return eventsService.createEvent(data);
    },
    onSuccess: () => {
      // Toast is now handled by the axios interceptor
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error creating event:", error);
      // Toast is now handled by the axios interceptor
    },
  });
};

/**
 * Hook to update an existing event
 */
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EventSchemaType }) => {
      return eventsService.updateEvent(id, data);
    },
    onSuccess: (_, variables) => {
      // Toast is now handled by the axios interceptor
      queryClient.invalidateQueries({
        queryKey: eventKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error updating event:", error);
      // Toast is now handled by the axios interceptor
    },
  });
};

/**
 * Hook to delete an event
 */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => {
      return eventsService.deleteEvent(id);
    },
    onSuccess: () => {
      // Toast is now handled by the axios interceptor
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error deleting event:", error);
      // Toast is now handled by the axios interceptor
    },
  });
};

/**
 * Hook to bulk update event statuses
 */
export const useBulkUpdateEventStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      event_ids: number[];
      action: "active" | "draft" | "cancelled";
    }) => {
      return eventsService.bulkUpdateStatus(data);
    },
    onSuccess: () => {
      // Invalidate queries to refetch events
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk updating event statuses:", error);
      // Toast is handled by axios interceptor
    },
  });
};

/**
 * Bulk delete draft events (vendor)
 */
export const useBulkDeleteEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { event_ids: number[] }) =>
      eventsService.bulkDeleteEvents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: Error) => {
      console.error("Error bulk deleting events:", error);
    },
  });
};
