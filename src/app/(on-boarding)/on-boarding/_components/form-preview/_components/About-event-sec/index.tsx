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
 * About copy is left-aligned to match the clean, editorial Lovable layout.
 */
const ABOUT_SECTION_ALIGN = "left" as const;

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
    <section className="w-full bg-[color:var(--color-background)] py-20 md:py-28">
      <div className="mx-auto w-full max-w-4xl px-4 text-left">
        <div className="space-y-3 md:space-y-4">
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
            className="!text-3xl !font-black !tracking-tight !leading-[1.15] md:!text-4xl"
          />
        </div>
        <div
          className="prose prose-sm mt-6 max-w-none text-[var(--color-text)] prose-headings:text-[var(--color-text)] prose-p:text-left prose-p:text-[var(--color-text)] prose-strong:text-[var(--color-text)] prose-p:leading-relaxed md:prose-base"
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          dangerouslySetInnerHTML={{
            __html: about_event_description || defaultDescription,
          }}
        />
      </div>
    </section>
  );
}
