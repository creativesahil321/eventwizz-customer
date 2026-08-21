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
};

const PREVIEW_EDIT_SKIP = "a, [data-preview-no-edit]";

export const PREVIEW_SECTION_EDITOR: Record<string, PreviewEditorTarget> = {
  [EVENT_SECTION_IDS.about]: { step: 3, field: "about_event_heading" },
  [EVENT_SECTION_IDS.rooms]: { step: 4, field: "event_schedular_title" },
  [EVENT_SECTION_IDS.schedule]: { step: 4, field: "event_schedular" },
  [EVENT_SECTION_IDS.dates]: { step: 5, field: "dates" },
  [EVENT_SECTION_IDS.gallery]: { step: 4, field: "gallery" },
  [EVENT_SECTION_IDS.menu]: { step: 6, field: "menu_title" },
  [EVENT_SECTION_IDS.faqs]: { step: 9, field: "question" },
};

export function shouldIgnorePreviewEditClick(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(PREVIEW_EDIT_SKIP));
}

type PreviewEditHitProps = {
  step: number;
  field: string;
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
  label,
  onEdit,
  children,
  className,
  skipButtons = false,
}: PreviewEditHitProps) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("[data-preview-edit-hit]")
    ) {
      onEdit({ step, field });
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
    onEdit({ step, field });
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
