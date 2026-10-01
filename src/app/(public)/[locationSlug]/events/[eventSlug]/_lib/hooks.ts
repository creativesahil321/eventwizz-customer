"use client";

import { useQuery } from "@tanstack/react-query";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";
import { useIsPreviewMode } from "@/contexts/preview-context";

/** Per-observer freshness overrides (e.g. checkout wants live data on mount). */
export type EventDetailQueryOptions = {
  staleTime?: number;
  refetchOnMount?: boolean | "always";
};

export function useEventDetail(
  slug: string,
  domain: string,
  options?: EventDetailQueryOptions,
) {
  const isPreviewMode = useIsPreviewMode();

  return useQuery({
    queryKey: eventKeys.eventDetail(slug, domain),
    queryFn: () => eventsService.getEventDetail(slug, domain),
    enabled: !isPreviewMode && Boolean(slug) && Boolean(domain),
    staleTime: options?.staleTime ?? 1000 * 60 * 5, // 5 minutes
    ...(options?.refetchOnMount !== undefined
      ? { refetchOnMount: options.refetchOnMount }
      : {}),
  });
}
