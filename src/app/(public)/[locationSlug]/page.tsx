import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import LocationPageClient from "./_components/location-page-client";
import { Hydrate } from "./_components/hydration-provider";
import { getRequestHost, getSubdomainFromDomain } from "@/lib/server-theme";
import {
  eventsService,
  eventKeys,
} from "@/services/common/events/events.service";
import { locationDisplayName } from "@/lib/slug-short-label";
import { resolveLocationCoverHeroSrc } from "@/lib/resolve-hero-cover-image";
import { preloadHeroImage } from "@/lib/preload-hero-image";

/** Paths that must never be treated as venue location slugs. */
const RESERVED_LOCATION_SLUGS = new Set([
  "checkout",
  "payment",
  "auth",
  "customer",
  "vendor",
  "admin",
  "on-boarding",
  "api",
  "contact",
  "about",
  "blog",
  "policies",
  "terms",
  "privacy",
]);

export async function generateMetadata(props: {
  params: { locationSlug: string };
}): Promise<Metadata> {
  const params = await props.params;
  const locationSlug = params.locationSlug;
  if (RESERVED_LOCATION_SLUGS.has(locationSlug.toLowerCase())) {
    return { title: locationSlug.toLowerCase() === "checkout" ? "Checkout" : "Not Found" };
  }
  const { locationData } = await fetchLocationData(locationSlug);

  if (!locationData) return { title: "Location Not Found" };

  const cityName = locationDisplayName(locationData.city, locationSlug);

  return {
    title: `${cityName} Events`,
    description: `Discover amazing events in ${cityName}`,
    openGraph: {
      title: `${cityName} Events`,
      description: `Find exciting events in ${cityName} that match your interests.`,
      images: locationData.cover_image
        ? [{ url: locationData.cover_image }]
        : undefined,
    },
  };
}

// Fetch location data for SSR
async function fetchLocationData(slug: string) {
  // Get host using the project's proper utility
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  try {
    // Fetch location and events data from the API
    const response = await eventsService.getLocationWithEvents(slug, host);

    if (!response.status || !response.data) {
      return {
        locationData: null,
        host,
        subdomain,
      };
    }

    return {
      locationData: response.data,
      host,
      subdomain,
    };
  } catch (error) {
    console.error("Error fetching location data:", error);
    return {
      locationData: null,
      host,
      subdomain,
    };
  }
}

export default async function LocationPage(props: {
  params: { locationSlug: string };
}) {
  // ✅ Wait for the params object to be resolved
  const params = await props.params;
  const locationSlug = params.locationSlug;

  if (RESERVED_LOCATION_SLUGS.has(locationSlug.toLowerCase())) {
    if (locationSlug.toLowerCase() === "checkout") {
      redirect("/checkout");
    }
    notFound();
  }

  // Create a new QueryClient for SSR
  const queryClient = new QueryClient();

  const { locationData, host, subdomain } =
    await fetchLocationData(locationSlug);

  if (!locationData) {
    notFound();
  }

  preloadHeroImage(resolveLocationCoverHeroSrc(locationData.cover_image));

  // Prefetch the query to populate the cache - only need to do this once
  await queryClient.prefetchQuery({
    queryKey: eventKeys.location(locationSlug, host),
    queryFn: () => eventsService.getLocationWithEvents(locationSlug, host),
  });

  // Dehydrate the query cache to pass to the client
  const dehydratedState = dehydrate(queryClient);

  return (
    <Hydrate state={dehydratedState}>
      <LocationPageClient
        location={locationData}
        locationSlug={locationSlug}
        host={host}
        subdomain={subdomain}
      />
    </Hydrate>
  );
}
