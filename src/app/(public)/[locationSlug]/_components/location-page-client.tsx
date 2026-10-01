"use client";

import { LocationData } from "@/services/common/events/type";
import { useLocationData } from "../_lib/hooks";
import { LocationPageView } from "../../vendor/_components/LocationPage/location-page-view";

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
  const { data } = useLocationData(locationSlug, host);
  const locationData = data?.data || initialLocation;

  return (
    <LocationPageView
      locationData={locationData}
      locationSlug={locationSlug}
      mainLandmark
    />
  );
}
