"use client";

import { useQuery } from "@tanstack/react-query";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";
import { useIsPreviewMode } from "@/contexts/preview-context";

export function useEventDetail(slug: string, domain: string) {
  const isPreviewMode = useIsPreviewMode();

  return useQuery({
    queryKey: eventKeys.eventDetail(slug, domain),
    queryFn: () => eventsService.getEventDetail(slug, domain),
    enabled: !isPreviewMode && Boolean(slug) && Boolean(domain),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
