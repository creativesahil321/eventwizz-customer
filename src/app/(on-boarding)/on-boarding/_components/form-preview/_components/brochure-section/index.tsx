"use client";

import LocationMap from "./location-map";
import { cn } from "@/lib/utils";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

interface LocationData {
  title: string;
  icon?: string;
  description: string;
  location_direction?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/** Kept for callers that still build header download rows from the same shape. */
export interface DownloadItem {
  icon?: string;
  title: string;
  download_link: string[];
}

type BrochureSectionProps = {
  location: LocationData;
  /** When true, the location map mounts and loads immediately (public event pages). */
  showMapImmediately?: boolean;
  /** Site Essentials `typography.headingEmphasis` — required on platform-host previews. */
  headingEmphasis?: HeadingEmphasis | string | null;
};

export default function BrochureSection({
  location,
  showMapImmediately = false,
  headingEmphasis,
}: BrochureSectionProps) {
  const narrowPreview = usePreviewMobileLayout();

  const defaultLocation = {
    description: location?.description?.trim() || "",
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
  };

  return (
    <section className="bg-[color:var(--color-background)] px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Location
          </p>
          <SiteHeading
            level={2}
            title="Check Out The Latest Dates To Be Released — Get In Quick!"
            variant="onSurface"
            align="center"
            emphasis={headingEmphasis as HeadingEmphasis | undefined}
            className="mx-auto !max-w-4xl !text-3xl !font-black tracking-tight md:!text-4xl"
          />
        </div>
        <section
          className={cn("grid grid-cols-1 gap-4", narrowPreview && "gap-3")}
        >
          <section className="w-full overflow-hidden rounded-md">
            <LocationMap
              address={defaultLocation.description}
              latitude={defaultLocation.latitude}
              longitude={defaultLocation.longitude}
              className="w-full"
              showMapImmediately={showMapImmediately}
            />
          </section>
        </section>
      </div>
    </section>
  );
}
