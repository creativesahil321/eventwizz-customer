"use client";

import CommonHeader from "@/components/shared/common-header";
import HeroBanner from "../../vendor/_components/EventListPage/hero-banner";
import ExperienceSection from "../../vendor/_components/EventListPage/experience";
import ContactFormSection from "../../vendor/_components/EventListPage/contact-form-section";
import FooterSection from "../../vendor/_components/EventListPage/footer";
import { LocationMarketingBody } from "@/components/public/location-marketing-sections";
import { LocationData } from "@/services/common/events/type";
import { useLocationData } from "../_lib/hooks";

interface LocationPageClientProps {
  location: LocationData; // Initial data from SSR
  locationSlug: string;
  host: string;
  subdomain?: string | null;
}

export default function LocationPageClient({
  location: initialLocation,
  locationSlug,
  host,
}: LocationPageClientProps) {
  // Use the simplified query hook to get data from the hydrated cache
  const { data } = useLocationData(locationSlug, host);

  // Get the most up-to-date location data, falling back to initial SSR data if needed
  const locationData = data?.data || initialLocation;

  // Extract events from the response
  const latestEvents = locationData.latest_events || [];
  const upcomingEvents = locationData.upcoming_events || [];
  return (
    <>
      <CommonHeader variant="default" />
      <HeroBanner
        locationName={locationData.city || ""}
        coverImage={locationData.cover_image}
        coverVideo={locationData.cover_video}
        bannerHeading={locationData.banner_heading}
        bannerSubHeading={locationData.banner_sub_heading}
      />
      {/* One surface for page background so gradients are not restarted per section */}
      <LocationMarketingBody
        className="bg-[var(--color-background)] text-[var(--color-text)]"
        experience={
          <ExperienceSection
            aboutTitle={locationData.about_title}
            aboutDescription={locationData.about_description}
          />
        }
        latestEvents={latestEvents}
        upcomingEvents={upcomingEvents}
        popularSectionTitle={locationData.event_title_1 || "Popular Events"}
        upcomingSectionTitle={locationData.event_title_2 || "Upcoming Events"}
        galleryTitle={
          locationData.event_gallery_title || "Recent Events Glimpse"
        }
        galleryImages={locationData.event_gallery || []}
        locationSlug={locationSlug}
        locationLabel={locationData.city ?? null}
      />
      <ContactFormSection />
      <FooterSection />
    </>
  );
}
