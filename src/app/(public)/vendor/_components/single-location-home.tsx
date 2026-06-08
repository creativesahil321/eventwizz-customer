"use client";

import CommonHeader from "@/components/shared/common-header";
import HeroBanner from "./EventListPage/hero-banner";
import ExperienceSection from "./EventListPage/experience";
import ContactFormSection from "./EventListPage/contact-form-section";
import FooterSection from "./EventListPage/footer";
import { LocationMarketingBody } from "@/components/public/location-marketing-sections";
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
        <CommonHeader variant="default" />
        <Skeleton className="mx-auto mt-16 aspect-[21/9] max-w-full" />
        <div className="container mx-auto max-w-7xl space-y-6 px-4 py-12">
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
    <>
      <CommonHeader variant="default" />
      <HeroBanner
        locationName={locationData.city || settings?.name || ""}
        coverImage={locationData.cover_image}
        coverVideo={locationData.cover_video}
        bannerHeading={locationData.banner_heading}
        bannerSubHeading={locationData.banner_sub_heading}
        bannerHeadingAccent={settings?.banner_heading_accent}
        headingEmphasis={settings?.typography?.headingEmphasis}
        bannerHeadingAlign={settings?.banner_heading_align}
        bannerHeadingValign={settings?.banner_heading_valign}
      />
      <LocationMarketingBody
        className="bg-[var(--color-background)] text-[var(--color-text)]"
        experience={
          <ExperienceSection
            aboutTitle={locationData.about_title}
            aboutDescription={locationData.about_description}
          />
        }
        latestEvents={locationData.latest_events || []}
        upcomingEvents={locationData.upcoming_events || []}
        popularSectionTitle={locationData.event_title_1 || "Popular Events"}
        upcomingSectionTitle={locationData.event_title_2 || "Upcoming Events"}
        galleryTitle={
          locationData.event_gallery_title || "Recent Events Glimpse"
        }
        galleryImages={locationData.event_gallery || []}
        locationSlug={slug}
        locationLabel={locationData.city ?? null}
      />
      <ContactFormSection />
      <FooterSection
        copyright={settings?.copyright}
        logo={settings?.logo}
      />
    </>
  );
}
