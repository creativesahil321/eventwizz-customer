import { useQuery } from "@tanstack/react-query";
import { eventsService } from "./events.service";
import { EventCategory, EventMenuCategory, EventDetailResponse } from "./type";
import { ApiResponse } from "@/services/core/api-client";

/**
 * Query keys for event-related queries
 */
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...eventKeys.lists(), filters] as const,
  categories: () => [...eventKeys.all, "categories"] as const,
  menuCategories: (eventId?: number | null, roomId?: number | null) =>
    [
      ...eventKeys.all,
      "menuCategories",
      eventId ?? "none",
      roomId ?? "event",
    ] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: number) => [...eventKeys.details(), id] as const,
};

/**
 * Type for the normalized category response, ensuring consistent shape
 * regardless of the original API response format
 */
export type NormalizedCategoryResponse = ApiResponse<EventCategory[]>;

/**
 * Type for the normalized menu category response
 */
export type NormalizedMenuCategoryResponse = ApiResponse<EventMenuCategory[]>;

/**
 * Hook to fetch event categories with TanStack Query
 */
export const useEventCategories = () => {
  return useQuery<
    EventCategory[] | ApiResponse<EventCategory[]>,
    Error,
    NormalizedCategoryResponse
  >({
    queryKey: eventKeys.categories(),
    queryFn: async () => {
      try {
        const response = await eventsService.getEventCategories();
        return response;
      } catch (error) {
        throw error;
      }
    },
    select: (data) => {
      // Check if data is an array (direct response format)
      if (Array.isArray(data)) {
        return {
          status: true,
          message: "Success",
          data: data,
          errors: [],
        };
      }

      // If no data or status is false, return empty array
      if (!data || !data.status) {
        return {
          status: false,
          message: data?.message || "Failed to load categories",
          data: [],
          errors: data?.errors || [],
        };
      }

      // Return the categories
      return data;
    },
    // Add retry and staleTime options
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export type UseEventMenuCategoriesOptions = {
  /** Vendor event id — required by GET /vendor/event-menus */
  eventId?: number | null;
  /** Pass when multi-room / event spaces are enabled */
  roomId?: number | null;
  enabled?: boolean;
};

/**
 * Hook to fetch event menu categories with TanStack Query
 */
export const useEventMenuCategories = (
  options: UseEventMenuCategoriesOptions = {},
) => {
  const eventId =
    options.eventId != null && options.eventId > 0
      ? options.eventId
      : undefined;
  const roomId =
    options.roomId != null && options.roomId > 0 ? options.roomId : undefined;

  return useQuery<
    EventMenuCategory[] | ApiResponse<EventMenuCategory[]>,
    Error,
    NormalizedMenuCategoryResponse
  >({
    queryKey: eventKeys.menuCategories(eventId, roomId),
    queryFn: async () => {
      try {
        const response = await eventsService.getEventMenuCategories({
          event_id: eventId as number,
          ...(roomId != null ? { room_id: roomId } : {}),
        });
        return response;
      } catch (error) {
        throw error;
      }
    },
    enabled: options.enabled !== false && eventId != null,
    select: (data) => {
      // Check if data is an array (direct response format)
      if (Array.isArray(data)) {
        return {
          status: true,
          message: "Success",
          data: data,
          errors: [],
        };
      }

      // If no data or status is false, return empty array
      if (!data || !data.status) {
        return {
          status: false,
          message: data?.message || "Failed to load menu categories",
          data: [],
          errors: data?.errors || [],
        };
      }

      // Return the menu categories
      return data;
    },
    retry: 1,
    // Per-room lists must refetch when switching tabs (avoid stale cache after "Add New")
    staleTime: roomId != null ? 0 : 10 * 60 * 1000,
    refetchOnMount: roomId != null ? "always" : true,
  });
};

/**
 * Hook to fetch a single event's full details for preview
 */
export const useEventDetails = (eventId: number | string | undefined) => {
  return useQuery<EventDetailResponse, Error, EventDetailResponse>({
    queryKey: eventKeys.detail(Number(eventId)),
    enabled:
      typeof eventId !== "undefined" &&
      eventId !== null &&
      String(eventId) !== "" &&
      !Number.isNaN(Number(eventId)),
    queryFn: async () => {
      const id = Number(eventId);
      const res = await eventsService.getEvent(id);
      // Coerce to EventDetailResponse-like shape; backend already returns the shape you pasted
      return res as unknown as EventDetailResponse;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};
