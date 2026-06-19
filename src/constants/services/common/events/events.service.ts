import { ApiResponse, api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import {
  EventsQueryParams,
  EventsResponse,
  LocationData,
  EventDetailResponse,
} from "./type";

// Define type alias for LocationResponse
export type LocationResponse = ApiResponse<LocationData>;

// Define query keys for TanStack Query
export const eventKeys = {
  all: ["events"] as const,
  locations: () => [...eventKeys.all, "locations"] as const,
  location: (slug: string, domain: string) =>
    [...eventKeys.locations(), slug, domain] as const,
  event: (eventSlug: string, domain: string) =>
    [...eventKeys.all, "event", eventSlug, domain] as const,
  eventDetail: (slug: string, domain: string) =>
    [...eventKeys.all, "eventDetail", slug, domain] as const,
};

export const eventsService = {
  /**
   * Get location data with events for SSR
   */
  getLocationWithEvents: async (
    slug: string,
    domain: string
  ): Promise<LocationResponse> => {
    return api.get<LocationResponse>(
      API_ENDPOINTS.COMMON.LOCATION.GET_EVENTS_AND_LOCATION_DATA.replace(
        "{slug}",
        slug
      ).replace("{domain}", domain),
      {
        returnFullResponse: true,
      }
    );
  },

  /**
   * Get a list of events for the customer
   */
  getEvents: async (params: EventsQueryParams): Promise<EventsResponse> => {
    return api.get<EventsResponse>(
      API_ENDPOINTS.COMMON.LOCATION.GET_EVENTS_AND_LOCATION_DATA,
      {
        params,
        returnFullResponse: true,
      }
    );
  },

  /**
   * Get detailed event data for event detail page
   */
  getEventDetail: async (
    slug: string,
    domain: string
  ): Promise<EventDetailResponse> => {
    return api.get<EventDetailResponse>(
      API_ENDPOINTS.COMMON.LOCATION.GET_EVENT_BY_SLUG.replace(
        "{slug}",
        slug
      ).replace("{domain}", domain),
      {
        returnFullResponse: true,
      }
    );
  },
};
