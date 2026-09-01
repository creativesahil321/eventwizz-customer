"use client";

import type { ReactNode, MouseEvent } from "react";
import { EVENT_SECTION_IDS } from "@/components/public/event-section-nav";
import {
  PreviewEditHoverBadge,
  PreviewEditHoverFrame,
} from "@/components/preview/preview-edit-hint";
import { cn } from "@/lib/utils";

export type PreviewEditorTarget = {
  step: number;
  field: string;
  /** Guided onboarding block to unlock when jumping from preview (steps 1–3). */
  guidedSectionId?: string;
};

export const ONBOARDING_PREVIEW_EDITOR_TARGETS = {
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

const PREVIEW_EDIT_SKIP = "a, [data-preview-no-edit]";

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

export function shouldIgnorePreviewEditClick(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PREVIEW_EDIT_SKIP));
}

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

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-preview-edit-hit]")
    ) {
      onEdit(target);
      return;
    }
    if (shouldIgnorePreviewEditClick(event.target)) return;
    if (
      skipButtons &&
      event.target instanceof Element &&
      event.target.closest("button")
    ) {
      return;
    }
    onEdit(target);
  };

  return (
    <div
      title={`Click to edit ${label}`}
      onClick={handleClick}
      className={cn(
        "group/preview-edit relative cursor-pointer rounded-sm",
        className,
      )}
    >
      <PreviewEditHoverFrame />
      <div className="pointer-events-none absolute right-3 top-3 z-30">
        <PreviewEditHoverBadge label={label} />
      </div>
      {children}
    </div>
  );
}
