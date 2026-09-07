"use client";

import LocationMap from "./location-map";
import { cn } from "@/lib/utils";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { PreviewEditHit, type PreviewEditorTarget } from "../../preview-edit-hit";

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
  /** Preview → Step 3 event location fields. */
  onEditLocation?: (target: PreviewEditorTarget) => void;
};

export default function BrochureSection({
  location,
  showMapImmediately = false,
  headingEmphasis,
  onEditLocation,
}: BrochureSectionProps) {
  const narrowPreview = usePreviewNarrowLayout();

  const defaultLocation = {
    description: location?.description?.trim() || "",
    latitude: location?.latitude || null,
    longitude: location?.longitude || null,
  };

  const locationPanel = (
    <section className="w-full overflow-hidden rounded-md">
      <LocationMap
        address={defaultLocation.description}
        latitude={defaultLocation.latitude}
        longitude={defaultLocation.longitude}
        className="h-full w-full min-h-[280px] sm:min-h-[360px]"
        showMapImmediately={showMapImmediately}
      />
    </section>
  );

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
          {onEditLocation ? (
            <PreviewEditHit
              step={3}
              field="event_address"
              guidedSectionId="event-location"
              label="Event location"
              onEdit={onEditLocation}
            >
              {locationPanel}
            </PreviewEditHit>
          ) : (
            locationPanel
          )}
        </section>
      </div>
    </section>
  );
}
