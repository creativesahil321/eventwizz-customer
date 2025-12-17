"use client";

import { useQuery } from "@tanstack/react-query";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";

/**
 * Hook for fetching location data with events
 * This single hook handles all data needed for the location page
 */
export function useLocationData(slug: string, domain: string) {
  return useQuery({
    queryKey: eventKeys.location(slug, domain),
    queryFn: () => eventsService.getLocationWithEvents(slug, domain),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
