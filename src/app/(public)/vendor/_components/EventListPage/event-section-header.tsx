"use client";

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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
        {sectionLabel}
      </p>
      <SiteHeading
        level={2}
        title={sectionTitle}
        variant="onSurface"
        className="!text-3xl !font-black tracking-tight md:!text-4xl"
      />
    </div>
  );
}
