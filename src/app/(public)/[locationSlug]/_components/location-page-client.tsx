"use client";

import CommonHeader from "@/components/shared/common-header";
import SearchBanner from "../../vendor/_components/EventListPage/hero-banner";
import PopularEvents from "../../vendor/_components/EventListPage/popular-event";
import ExperienceSection from "../../vendor/_components/EventListPage/experience";
import RecentEventsGlimpse from "../../vendor/_components/EventListPage/recent-event";
import ContactFormSection from "../../vendor/_components/EventListPage/contact-form-section";
import UpcomingEvents from "../../vendor/_components/EventListPage/upcoming-event";
import FooterSection from "../../vendor/_components/EventListPage/footer";
import { ThemeSchema } from "@/types/theme.types";
import { LocationData } from "@/services/common/events/type";
import { useLocationData } from "../_lib/hooks";

interface LocationPageClientProps {
  location: LocationData; // Initial data from SSR
  themeData: ThemeSchema | null;
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
      <SearchBanner
        locationName={locationData.city || ""}
        coverImage={locationData.cover_image}
        coverVideo={locationData.cover_video}
        bannerHeading={locationData.banner_heading}
        bannerSubHeading={locationData.banner_sub_heading}
      />
      <ExperienceSection
        aboutTitle={locationData.about_title}
        aboutDescription={locationData.about_description}
        aboutLinkTitle={locationData.about_link_title}
        aboutCtaLink={locationData.about_cta_link}
      />
      <PopularEvents
        events={latestEvents}
        sectionTitle={locationData.event_title_1 || "Popular Events"}
        locationSlug={locationSlug}
      />
      <UpcomingEvents
        events={upcomingEvents}
        sectionTitle={locationData.event_title_2 || "Upcoming Events"}
        locationSlug={locationSlug}
      />
      <RecentEventsGlimpse
        galleryImages={locationData.event_gallery || []}
        galleryTitle={
          locationData.event_gallery_title || "Recent Events Glimpse"
        }
      />
      <ContactFormSection
        locationAddress={locationData.address || ""}
        longitude={Number(locationData.longitude) || 0}
        latitude={Number(locationData.latitude) || 0}
      />
      <FooterSection />
    </>
  );
}
