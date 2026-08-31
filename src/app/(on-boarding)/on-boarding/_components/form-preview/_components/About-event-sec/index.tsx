"use client";

import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { addCacheBusting } from "@/lib/image-utils";

interface AboutEventSecProps {
  about_event_heading?: string;
  about_event_sub_heading?: string;
  about_event_description?: string;
  eventImage?: string | null;
  imageAlt?: string;
  highlights?: Array<{
    label: string;
    value: string;
  }>;
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
  headingEmphasis,
  aboutHeadingAccentHint,
}: AboutEventSecProps) {
  const defaultDescription =
    "<p>Tell guests what makes this event special — the atmosphere, what’s included, and why they should book.</p><p>Add the latest dates, then keep this section short so people can scan it quickly.</p>";

  return (
    <section className="w-full bg-[color:var(--color-background)] py-14 sm:py-18 md:py-24">
      <div className="mx-auto grid w-full max-w-7xl items-start gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:gap-14">
        <div className="min-w-0 text-left">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              {about_event_sub_heading || "About the Event"}
            </p>
            <SiteHeading
              level={2}
              title={
                (about_event_heading || "Lipstick, Powder & Paint").trim() ||
                "\u00a0"
              }
              accentHint={aboutHeadingAccentHint}
              emphasis={headingEmphasis ?? undefined}
              variant="onSurface"
              align={ABOUT_SECTION_ALIGN}
              className="!mt-3 !text-3xl !font-black !tracking-tight !leading-[1.12] sm:!text-4xl md:!text-5xl"
            />
          </div>
          <div
            className="prose prose-sm mt-6 max-w-[64ch] text-[var(--color-text)] prose-headings:text-[var(--color-text)] prose-p:text-left prose-p:text-[var(--color-text-dimmed)] prose-strong:text-[var(--color-text)] prose-p:leading-relaxed sm:prose-base"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            dangerouslySetInnerHTML={{
              __html: about_event_description || defaultDescription,
            }}
          />

          {highlights.length > 0 && (
            <div className="mt-9 border-t border-[color:color-mix(in_srgb,var(--color-primary)_24%,transparent)] pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dimmed)]">
                At a glance
              </p>
              <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {highlights.map((highlight) => (
                  <div
                    key={`${highlight.label}-${highlight.value}`}
                    className="min-w-0 border-t border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] pt-3"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]">
                      {highlight.label}
                    </dt>
                    <dd className="mt-1.5 break-words text-base font-semibold leading-snug text-[var(--color-text)]">
                      {highlight.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {eventImage ? (
          <div className="overflow-hidden rounded-2xl border border-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] bg-[color:var(--color-surface)] shadow-[0_18px_50px_-30px_rgba(0,0,0,0.45)] lg:sticky lg:top-28">
            {/* eslint-disable-next-line @next/next/no-img-element -- tenant event media may be an external API URL */}
            <img
              src={addCacheBusting(eventImage)}
              alt={imageAlt || "Event"}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover lg:aspect-[4/5]"
            />
          </div>
        ) : null}
      </div>
      <div className="mx-auto mt-12 h-px w-full max-w-7xl bg-[color:color-mix(in_srgb,var(--color-primary)_24%,transparent)] px-4 sm:px-8" />
    </section>
  );
}
