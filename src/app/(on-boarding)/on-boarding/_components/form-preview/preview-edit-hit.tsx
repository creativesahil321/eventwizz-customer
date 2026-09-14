"use client";

import type { ReactNode } from "react";
import { EVENT_SECTION_IDS } from "@/components/public/event-section-nav";
import {
  PreviewEditRegion,
  shouldIgnorePreviewEditClick,
} from "@/components/preview/preview-edit-hint";
import type { EventAboutHighlightKey } from "@/lib/event-about-highlights";

export type PreviewEditorTarget = {
  step: number;
  field: string;
  /** Guided onboarding block to unlock when jumping from preview (steps 1–3). */
  guidedSectionId?: string;
};

export const ONBOARDING_PREVIEW_EDITOR_TARGETS = {
  siteLogo: {
    step: 2,
    field: "logo",
    guidedSectionId: "branding",
  },
  siteCover: {
    step: 2,
    field: "cover_image",
    guidedSectionId: "branding",
  },
  siteBanner: {
    step: 2,
    field: "banner_heading",
    guidedSectionId: "banner",
  },
  siteAbout: {
    step: 2,
    field: "about_title",
    guidedSectionId: "about",
  },
  siteFooter: {
    step: 2,
    field: "footer_brand_description",
    guidedSectionId: "branding",
  },
  /** Phone, email, and address in the footer Enquiries column. */
  siteEnquiries: {
    step: 1,
    field: "contact_number",
    guidedSectionId: "contact-details",
  },
  eventBanner: {
    step: 3,
    field: "event_banner_heading",
    guidedSectionId: "banner",
  },
  eventAbout: {
    step: 3,
    field: "about_event_heading",
    guidedSectionId: "about-event",
  },
  eventOccasion: {
    step: 3,
    field: "event_category_id",
    guidedSectionId: "about-event",
  },
  eventLocation: {
    step: 3,
    field: "event_address",
    guidedSectionId: "event-location",
  },
  /** “Prices from” is derived from dates/packages — not the Step 7 PDF form. */
  brochurePrice: {
    step: 5,
    field: "dates",
  },
  dates: { step: 5, field: "dates" },
  rooms: { step: 4, field: "event_schedular_title" },
  schedule: { step: 4, field: "event_schedular" },
  packages: { step: 4, field: "package_title" },
  gallery: { step: 4, field: "gallery" },
  menu: { step: 6, field: "menu_title" },
  drinks: { step: 8, field: "drink_title" },
  faqs: { step: 9, field: "question" },
} as const satisfies Record<string, PreviewEditorTarget>;

export const PREVIEW_SECTION_EDITOR: Record<string, PreviewEditorTarget> = {
  [EVENT_SECTION_IDS.about]: ONBOARDING_PREVIEW_EDITOR_TARGETS.eventAbout,
  [EVENT_SECTION_IDS.rooms]: ONBOARDING_PREVIEW_EDITOR_TARGETS.rooms,
  [EVENT_SECTION_IDS.schedule]: ONBOARDING_PREVIEW_EDITOR_TARGETS.schedule,
  [EVENT_SECTION_IDS.packages]: ONBOARDING_PREVIEW_EDITOR_TARGETS.packages,
  [EVENT_SECTION_IDS.dates]: ONBOARDING_PREVIEW_EDITOR_TARGETS.dates,
  [EVENT_SECTION_IDS.gallery]: ONBOARDING_PREVIEW_EDITOR_TARGETS.gallery,
  [EVENT_SECTION_IDS.menu]: ONBOARDING_PREVIEW_EDITOR_TARGETS.menu,
  [EVENT_SECTION_IDS.drinks]: ONBOARDING_PREVIEW_EDITOR_TARGETS.drinks,
  [EVENT_SECTION_IDS.faqs]: ONBOARDING_PREVIEW_EDITOR_TARGETS.faqs,
};

export function editorTargetForAboutHighlight(
  key: EventAboutHighlightKey,
): PreviewEditorTarget {
  if (key === "occasion") return ONBOARDING_PREVIEW_EDITOR_TARGETS.eventOccasion;
  if (key === "dates" || key === "fromPrice") {
    return ONBOARDING_PREVIEW_EDITOR_TARGETS.dates;
  }
  if (key === "time") return ONBOARDING_PREVIEW_EDITOR_TARGETS.schedule;
  return ONBOARDING_PREVIEW_EDITOR_TARGETS.eventLocation;
}

export { shouldIgnorePreviewEditClick };

type PreviewEditHitProps = {
  step: number;
  field: string;
  guidedSectionId?: string;
  label: string;
  onEdit: (target: PreviewEditorTarget) => void;
  children: ReactNode;
  className?: string;
  /** Room pills / booking controls — keep their own click. */
  skipButtons?: boolean;
};

export function PreviewEditHit({
  step,
  field,
  guidedSectionId,
  label,
  onEdit,
  children,
  className,
  skipButtons = false,
}: PreviewEditHitProps) {
  const target: PreviewEditorTarget = {
    step,
    field,
    ...(guidedSectionId ? { guidedSectionId } : {}),
  };

  return (
    <PreviewEditRegion
      label={label}
      className={className}
      skipButtons={skipButtons}
      onEdit={() => onEdit(target)}
    >
      {children}
    </PreviewEditRegion>
  );
}
