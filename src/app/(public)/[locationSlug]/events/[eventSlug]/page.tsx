import { QueryClient, dehydrate } from "@tanstack/react-query";
import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";
import "./event-detail.css";

import { Hydrate } from "./_components/hydration-provider";
import EventDetailClient from "./_components/event-detail-client";
import {
  fetchServerThemeCached,
  getRequestHost,
  getSubdomainFromDomain,
} from "@/lib/server-theme";
import { getRequestOrigin } from "@/lib/seo/request-origin";
import { buildEventJsonLd } from "./_lib/event-json-ld";
import { resolveEventBannerHeroSrc } from "@/lib/resolve-hero-cover-image";
import { preloadHeroImage } from "@/lib/preload-hero-image";

export async function generateMetadata(props: {
  params: { locationSlug: string; eventSlug: string };
}): Promise<Metadata> {
  const params = await props.params;
  const locationSlug = params.locationSlug;
  const eventSlug = params.eventSlug;

  const { eventData } = await fetchEventData(locationSlug, eventSlug);

  if (!eventData) return { title: "Event Not Found" };

  const canonical = eventCanonicalPath(locationSlug, eventSlug);

  return {
    title: eventData.event_name,
    description:
      eventData.about_event_sub_heading ||
      `Details about ${eventData.event_name}`,
    alternates: { canonical },
    openGraph: {
      title: eventData.event_name,
      description:
        eventData.about_event_sub_heading ||
        `Details about ${eventData.event_name}`,
      url: canonical,
      images: eventData.event_banner_image
        ? [{ url: eventData.event_banner_image }]
        : undefined,
    },
  };
}

function eventCanonicalPath(locationSlug: string, eventSlug: string): string {
  return `/${encodeURIComponent(locationSlug)}/events/${encodeURIComponent(eventSlug)}`;
}

/**
 * One Laravel call per request for the event and one for its location:
 * generateMetadata, the page and the React Query prefetches share these
 * memoized results (React cache is per request, so live availability is
 * never reused across requests).
 */
const getEventDetailCached = cache((eventSlug: string, host: string) =>
  eventsService.getEventDetail(eventSlug, host),
);
const getLocationWithEventsCached = cache((locationSlug: string, host: string) =>
  eventsService.getLocationWithEvents(locationSlug, host),
);

// Fetch event data for SSR
async function fetchEventData(locationSlug: string, eventSlug: string) {
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);
  try {
    const response = await getEventDetailCached(eventSlug, host);
    if (!response.status || !response.data) {
      return {
        eventData: null,
        host,
        subdomain,
      };
    }
    return {
      eventData: response.data,
      host,
      subdomain,
    };
  } catch (error) {
    console.error("Error fetching event data:", error);
    return {
      eventData: null,
      host,
      subdomain,
    };
  }
}

// Event detail page server component
export default async function EventDetailPage(props: {
  params: { locationSlug: string; eventSlug: string };
}) {
  const params = await props.params;
  const locationSlug = params.locationSlug;
  const eventSlug = params.eventSlug;

  const queryClient = new QueryClient();
  const { eventData, host } = await fetchEventData(locationSlug, eventSlug);

  if (!eventData) {
    notFound();
  }

  preloadHeroImage(resolveEventBannerHeroSrc(eventData.event_banner_image));

  // Prefetch event + location data for client-side hydration (in parallel;
  // the event detail reuses the memoized response fetched above).
  const [theme, origin] = await Promise.all([
    fetchServerThemeCached(host),
    getRequestOrigin(),
    queryClient.prefetchQuery({
      queryKey: eventKeys.eventDetail(eventSlug, host),
      queryFn: () => getEventDetailCached(eventSlug, host),
      staleTime: 60 * 1000, // Cache for 1 minute to prevent unnecessary refetches during navigation
    }),
    queryClient.prefetchQuery({
      queryKey: eventKeys.location(locationSlug, host),
      queryFn: () => getLocationWithEventsCached(locationSlug, host),
      staleTime: 1000 * 60 * 5,
    }),
  ]);

  const dehydratedState = dehydrate(queryClient);
  const jsonLd = buildEventJsonLd({
    event: eventData,
    url: `${origin}${eventCanonicalPath(locationSlug, eventSlug)}`,
    organizerName: theme?.name ?? null,
    organizerUrl: origin,
    currencySymbol: theme?.currency_symbol ?? null,
  });

  return (
    <Hydrate state={dehydratedState}>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // JSON-LD built from the same server data that renders this page; `<` is escaped.
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      ) : null}
      <EventDetailClient
        event={eventData}
        eventSlug={eventSlug}
        host={host}
        locationSlug={locationSlug}
      />
    </Hydrate>
  );
}
