"use client";

import CommonHeader from "@/components/shared/common-header";
import { useQuery } from "@tanstack/react-query";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";
import { getDomain } from "@/lib/domain";
import type { LocationData as ThemeLocationData } from "@/types/theme.types";
import type { LocationData } from "@/services/common/events/type";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThemeSchema } from "@/types/theme.types";
import { LocationPageView } from "./LocationPage/location-page-view";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";

interface SingleLocationHomeProps {
  location: ThemeLocationData;
  settings: ThemeSchema;
}

/**
 * Renders the location detail page inline for single-location vendors.
 * Fetches full location data (events, gallery) via the slug, same as /{slug}.
 */
export function SingleLocationHome({
  location,
  settings,
}: SingleLocationHomeProps) {
  const slug = location.slug;
  const domain = getDomain() ?? "";

  const { data, isLoading } = useQuery({
    queryKey: eventKeys.location(slug, domain),
    queryFn: () => eventsService.getLocationWithEvents(slug, domain),
    staleTime: 1000 * 60 * 5,
    enabled: Boolean(slug) && Boolean(domain),
  });

  const locationData: LocationData | null = data?.data ?? null;

  if (isLoading || !locationData) {
    return (
      <div className="min-h-screen bg-[var(--color-background)]">
        <CommonHeader variant="default" locationSlug={slug} />
        <Skeleton className="mx-auto mt-16 aspect-[21/9] max-w-full" />
        <div className={`${PUBLIC_CHROME_CONTAINER_CLASS} space-y-6 py-12`}>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <LocationPageView
      locationData={locationData}
      locationSlug={slug}
      settings={settings}
      hasMultipleLocations={false}
      mainLandmark
    />
  );
}
