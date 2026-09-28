"use client";

import { SECTION_EYEBROW_CLASS } from "@/lib/section-type";
import { SiteHeading } from "@/components/public/site-heading";

type EventSectionHeaderProps = {
  sectionLabel: string;
  sectionTitle: string;
  className?: string;
};

/** Section label + title row shared by event listing blocks. */
export function EventSectionHeader({
  sectionLabel,
  sectionTitle,
  className,
}: EventSectionHeaderProps) {
  return (
    <div className={className ?? "mb-8 w-full space-y-3 text-left"}>
      <p className={SECTION_EYEBROW_CLASS}>
        {sectionLabel}
      </p>
      <SiteHeading
        level={2}
        title={sectionTitle}
        variant="onSurface"
      />
    </div>
  );
}
