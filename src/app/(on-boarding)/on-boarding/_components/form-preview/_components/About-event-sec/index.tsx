"use client";

import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

interface AboutEventSecProps {
  about_event_heading?: string;
  about_event_sub_heading?: string;
  about_event_description?: string;
  /** Same as vendor theme `typography.headingEmphasis` (e.g. accent_tail) — matches hero banner */
  headingEmphasis?: HeadingEmphasis | null;
  /** Same idea as `event_banner_heading_accent` / `banner_heading_accent`; optional substring of the about title */
  aboutHeadingAccentHint?: string | null;
}

/**
 * About copy is always centered in a narrow column — independent of Site Essentials
 * `banner_heading_align`, which only controls the hero heading.
 */
const ABOUT_SECTION_ALIGN = "center" as const;

export default function AboutEventSec({
  about_event_heading,
  about_event_description,
  about_event_sub_heading,
  headingEmphasis,
  aboutHeadingAccentHint,
}: AboutEventSecProps) {
  const defaultDescription =
    "<p>If you are looking for a great ladies fun night out, with all the entertainment, Cosmopolitan reception drink, prosecco, three-course dinner and dancing till 1am, then you need look no further! Stock Brook Country Club has the perfect answer for a great night out with the girls.</p><p>Check out the latest dates to be released, but get in quick as these dates will soon go!!</p>";

  return (
    <section className="w-full bg-[color:var(--color-background)] py-16">
      <div className="mx-auto w-full max-w-3xl px-4 text-center">
        <div className="space-y-4 md:space-y-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
            About the event
          </p>
          {about_event_sub_heading ? (
            <p className="text-sm font-medium italic text-[var(--color-text-dimmed)] md:text-base">
              {about_event_sub_heading}
            </p>
          ) : null}
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
            className="!text-3xl !font-bold !tracking-tight !leading-[1.15] md:!text-4xl"
          />
        </div>
        <div
          className="prose prose-sm mx-auto mt-6 max-w-none text-[var(--color-text)] prose-headings:text-[var(--color-text)] prose-p:text-center prose-p:text-[var(--color-text)] prose-strong:text-[var(--color-text)] prose-p:leading-relaxed md:prose-base"
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          dangerouslySetInnerHTML={{
            __html: about_event_description || defaultDescription,
          }}
        />
      </div>
    </section>
  );
}
