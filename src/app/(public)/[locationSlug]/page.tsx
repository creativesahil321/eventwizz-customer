import { Metadata } from "next";
import { cache } from "react";
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
  "entry",
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
  const description =
    toMetaDescription(locationData.banner_sub_heading) ||
    toMetaDescription(locationData.about_description) ||
    `Discover amazing events in ${cityName}`;
  const canonical = `/${encodeURIComponent(locationSlug)}`;

  return {
    title: `${cityName} Events`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${cityName} Events`,
      description,
      url: canonical,
      images: locationData.cover_image
        ? [{ url: locationData.cover_image }]
        : undefined,
    },
  };
}

/** Plain-text meta description from CMS text/HTML (max ~160 chars). */
function toMetaDescription(value: string | null | undefined): string {
  if (!value) return "";
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

/**
 * One Laravel call per request: generateMetadata, the page and the React
 * Query prefetch all share this memoized result (React cache is per request,
 * so availability data is never reused across requests).
 */
const getLocationWithEventsCached = cache((slug: string, host: string) =>
  eventsService.getLocationWithEvents(slug, host),
);

// Fetch location data for SSR
async function fetchLocationData(slug: string) {
  // Get host using the project's proper utility
  const host = await getRequestHost();
  const subdomain = getSubdomainFromDomain(host);

  try {
    // Fetch location and events data from the API
    const response = await getLocationWithEventsCached(slug, host);

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
    queryFn: () => getLocationWithEventsCached(locationSlug, host),
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
