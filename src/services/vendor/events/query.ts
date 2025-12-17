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
  menuCategories: () => [...eventKeys.all, "menuCategories"] as const,
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

/**
 * Hook to fetch event menu categories with TanStack Query
 */
export const useEventMenuCategories = () => {
  return useQuery<
    EventMenuCategory[] | ApiResponse<EventMenuCategory[]>,
    Error,
    NormalizedMenuCategoryResponse
  >({
    queryKey: eventKeys.menuCategories(),
    queryFn: async () => {
      try {
        const response = await eventsService.getEventMenuCategories();
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
          message: data?.message || "Failed to load menu categories",
          data: [],
          errors: data?.errors || [],
        };
      }

      // Return the menu categories
      return data;
    },
    // Add retry and staleTime options
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
