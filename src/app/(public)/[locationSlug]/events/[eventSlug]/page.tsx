import { QueryClient, dehydrate } from "@tanstack/react-query";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";
import "./event-detail.css";

import { Hydrate } from "./_components/hydration-provider";
import EventDetailClient from "./_components/event-detail-client";
import { getRequestHost, getSubdomainFromDomain } from "@/lib/server-theme";

export async function generateMetadata(props: {
  params: { locationSlug: string; eventSlug: string };
}): Promise<Metadata> {
  const params = await props.params;
  const locationSlug = params.locationSlug;
  const eventSlug = params.eventSlug;

  const { eventData } = await fetchEventData(locationSlug, eventSlug);

  if (!eventData) return { title: "Event Not Found" };

  return {
    title: eventData.event_name,
    description:
      eventData.about_event_sub_heading ||
      `Details about ${eventData.event_name}`,
    openGraph: {
      title: eventData.event_name,
      description:
        eventData.about_event_sub_heading ||
        `Details about ${eventData.event_name}`,
      images: eventData.event_banner_image
        ? [{ url: eventData.event_banner_image }]
        : undefined,
    },
  };
}

// Fetch event data for SSR
async function fetchEventData(locationSlug: string, eventSlug: string) {
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);
  try {
    const response = await eventsService.getEventDetail(eventSlug, host);
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

  // Prefetch event data for client-side hydration
  await queryClient.prefetchQuery({
    queryKey: eventKeys.eventDetail(eventSlug, host),
    queryFn: () => eventsService.getEventDetail(eventSlug, host),
    staleTime: 60 * 1000, // Cache for 1 minute to prevent unnecessary refetches during navigation
  });
  await queryClient.prefetchQuery({
    queryKey: eventKeys.location(locationSlug, host),
    queryFn: () => eventsService.getLocationWithEvents(locationSlug, host),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <Hydrate state={dehydratedState}>
      <EventDetailClient
        event={eventData}
        eventSlug={eventSlug}
        host={host}
        locationSlug={locationSlug}
      />
    </Hydrate>
  );
}
