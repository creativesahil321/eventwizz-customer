"use client";

import { useMemo } from "react";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { SingleEventShowcase } from "./single-event-showcase";
import {
  buildPreviewSampleEventCard,
  PREVIEW_SAMPLE_EVENT_IMAGES,
} from "./preview-sample-event";

interface SitePreviewDummyEventSectionProps {
  sectionTitle: string;
  sectionLabel?: string;
  /** Kept for API compatibility with callers; layout inherits parent band. */
  band?: "secondary" | "background";
}

/**
 * Empty site preview: one hero event card using the same components as the live
 * single-event layout — no per-card “sample” badges or “not bookable” footers.
 */
export function SitePreviewDummyEventSection({
  sectionTitle,
  sectionLabel = "Upcoming Events",
}: SitePreviewDummyEventSectionProps) {
  const { formatCompact } = useCurrencyFormat();
  const sampleEvent = useMemo(
    () => buildPreviewSampleEventCard(formatCompact),
    [formatCompact],
  );

  return (
    <SingleEventShowcase
      sectionId="preview-sample-events"
      sectionLabel={sectionLabel}
      sectionTitle={sectionTitle}
      event={sampleEvent}
      locationSlug="preview"
      isPending={false}
      onNavigateStart={() => {}}
      imageFallback={PREVIEW_SAMPLE_EVENT_IMAGES[0]}
      footnote="Sample layout only — your published events will replace this on your live site."
    />
  );
}
