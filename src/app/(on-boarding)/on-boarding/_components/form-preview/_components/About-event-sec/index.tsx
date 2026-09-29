"use client";

import { SECTION_EYEBROW_CLASS } from "@/lib/section-type";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { PUBLIC_SECTION_PY_CLASS } from "@/lib/public-rhythm";
import {
  previewPhonePx4,
  previewUndoLgSplit,
} from "@/lib/preview-container-layout";
import { PreviewEditRegion } from "@/components/preview/preview-edit-hint";
import type {
  EventAboutHighlight,
  EventAboutHighlightKey,
} from "@/lib/event-about-highlights";

interface AboutEventSecProps {
  about_event_heading?: string;
  about_event_sub_heading?: string;
  about_event_description?: string;
  eventImage?: string | null;
  imageAlt?: string;
  highlights?: EventAboutHighlight[];
  onEditHighlight?: (key: EventAboutHighlightKey) => void;
  /** Same as vendor theme `typography.headingEmphasis` (e.g. accent_tail) — matches hero banner */
  headingEmphasis?: HeadingEmphasis | null;
  /** Same idea as `event_banner_heading_accent` / `banner_heading_accent`; optional substring of the about title */
  aboutHeadingAccentHint?: string | null;
}

/**
 * About copy is left-aligned to match the clean, editorial Lovable layout.
 */
const ABOUT_SECTION_ALIGN = "left" as const;

export default function AboutEventSec({
  about_event_heading,
  about_event_description,
  about_event_sub_heading,
  eventImage,
  imageAlt,
  highlights = [],
  onEditHighlight,
  headingEmphasis,
  aboutHeadingAccentHint,
}: AboutEventSecProps) {
  const defaultDescription =
    "<p>Tell guests what makes this event special — the atmosphere, what’s included, and why they should book.</p><p>Add the latest dates, then keep this section short so people can scan it quickly.</p>";

  return (
    <section className={cn("w-full bg-[color:var(--color-background)]", PUBLIC_SECTION_PY_CLASS, "@max-md/preview:!py-12")}>
      <div
        className={cn(
          "mx-auto grid w-full max-w-7xl items-start gap-8 px-4 md:px-6 sm:gap-10",
          "lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-center lg:gap-14",
          previewPhonePx4,
          "@max-md/preview:!gap-8",
          previewUndoLgSplit,
        )}
      >
        <div className="min-w-0 text-left">
          <div className="max-w-3xl">
            <p className={SECTION_EYEBROW_CLASS}>
              {about_event_sub_heading || "About the Event"}
            </p>
            <SiteHeading
              level={2}
              title={about_event_heading?.trim() || "\u00a0"}
              accentHint={aboutHeadingAccentHint}
              emphasis={headingEmphasis ?? undefined}
              variant="onSurface"
              align={ABOUT_SECTION_ALIGN}
              className="!mt-3"
            />
          </div>
          <div
            // Paragraph type is pinned with `[&_p]:` (beats prose's zero-specificity
            // :where rules) instead of prose-sm / sm:prose-base, so the live page and
            // the preview frame render the same 16px/relaxed body at every width.
            className="prose mt-6 max-w-[64ch] text-[var(--color-text)] prose-headings:text-[var(--color-text)] prose-p:text-left prose-p:text-[var(--color-text-dimmed)] prose-strong:text-[var(--color-text)] [&_p]:text-base [&_p]:leading-relaxed @max-md/preview:!mt-6"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            dangerouslySetInnerHTML={{
              __html: about_event_description || defaultDescription,
            }}
          />

          {highlights.length > 0 && (
            <div className="mt-8 border-t border-[color:color-mix(in_srgb,var(--color-primary)_24%,transparent)] pt-5 sm:mt-9 sm:pt-6">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--color-text)]">
                At a glance
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-b border-[color:color-mix(in_srgb,var(--color-primary)_24%,transparent)] pb-4 sm:mt-5 sm:gap-x-8 sm:gap-y-5 sm:pb-5">
                {highlights.map((highlight) => {
                  const body = (
                    <div className="min-w-0 border-t border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] pt-2.5 sm:pt-3">
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-dimmed)] sm:tracking-[0.16em]">
                        {highlight.label}
                      </dt>
                      <dd className="mt-1 break-words text-sm font-semibold leading-snug text-[var(--color-text)] sm:mt-1.5 sm:text-base @max-md/preview:!text-sm">
                        {highlight.value}
                      </dd>
                    </div>
                  );

                  if (!onEditHighlight) {
                    return (
                      <div key={`${highlight.key}-${highlight.value}`}>
                        {body}
                      </div>
                    );
                  }

                  return (
                    <PreviewEditRegion
                      key={`${highlight.key}-${highlight.value}`}
                      label={highlight.label}
                      onEdit={() => onEditHighlight(highlight.key)}
                      hoverFrameClassName="rounded-md"
                    >
                      {body}
                    </PreviewEditRegion>
                  );
                })}
              </dl>
            </div>
          )}
        </div>

        {eventImage ? (
          <div
            className={cn(
              "mx-auto w-full max-w-[18rem] overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] bg-[color:var(--color-surface)] shadow-[0_18px_50px_-30px_rgba(0,0,0,0.45)]",
              "lg:mx-0 lg:max-w-none lg:sticky lg:top-28",
              "@max-5xl/preview:!mx-auto @max-5xl/preview:!max-w-[18rem] @max-5xl/preview:!static",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- tenant event media may be an external API URL */}
            <img
              src={addCacheBusting(eventImage)}
              alt={imageAlt || "Event"}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover lg:aspect-[5/4] @max-5xl/preview:!aspect-[4/3]"
            />
          </div>
        ) : null}
      </div>
      <div className="mx-auto mt-10 h-px w-full max-w-7xl bg-[color:color-mix(in_srgb,var(--color-primary)_24%,transparent)] px-4 md:mt-12 md:px-6" />
    </section>
  );
}
