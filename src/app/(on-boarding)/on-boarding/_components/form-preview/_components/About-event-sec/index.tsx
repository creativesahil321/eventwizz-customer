"use client";

import { Button } from "@/components/ui/button";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import type { BannerHeadingAlign } from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";

export interface AboutEventPriceCard {
  fromLabel?: string;
  amount: string;
  suffix?: string;
  ctaLabel?: string;
}

interface AboutEventSecProps {
  about_event_heading?: string;
  about_event_sub_heading?: string;
  about_event_description?: string;
  /** Public event page: Lovable-style floating price card + CTA */
  priceCard?: AboutEventPriceCard | null;
  /** Same as vendor theme `typography.headingEmphasis` (e.g. accent_tail) — matches hero banner */
  headingEmphasis?: HeadingEmphasis | null;
  /** Same idea as `event_banner_heading_accent` / `banner_heading_accent`; optional substring of the about title */
  aboutHeadingAccentHint?: string | null;
  /** Align with Site Essentials `banner_heading_align` */
  aboutHeadingAlign?: BannerHeadingAlign | null;
}

export default function AboutEventSec({
  about_event_heading,
  about_event_description,
  about_event_sub_heading,
  priceCard,
  headingEmphasis,
  aboutHeadingAccentHint,
  aboutHeadingAlign,
}: AboutEventSecProps) {
  const defaultDescription =
    "<p>If you are looking for a great ladies fun night out, with all the entertainment, Cosmopolitan reception drink, prosecco, three-course dinner and dancing till 1am, then you need look no further! Stock Brook Country Club has the perfect answer for a great night out with the girls.</p><p>Check out the latest dates to be released, but get in quick as these dates will soon go!!</p>";

  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const align = aboutHeadingAlign ?? "left";
  const isCentered = align === "center";

  const copyBlock = (
    <div
      className={cn(
        "min-w-0 space-y-4",
        isCentered && "text-center",
        priceCard && "lg:space-y-5",
      )}
    >
      <div className={cn("space-y-2", isCentered && "items-center")}>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
          About the event
        </p>
        {about_event_sub_heading ? (
          <p className="text-sm font-medium italic text-[var(--color-text-dimmed)] md:text-base">
            {about_event_sub_heading}
          </p>
        ) : null}
      </div>
      <SiteHeading
        level={2}
        title={
          (about_event_heading || "Lipstick, Powder & Paint").trim() ||
          "\u00a0"
        }
        accentHint={aboutHeadingAccentHint}
        emphasis={headingEmphasis ?? undefined}
        variant="onSurface"
        align={align}
        className="!mb-0 !text-3xl !font-black !tracking-tight !leading-[1.1] md:!text-4xl lg:!text-[2.75rem] lg:!leading-[1.08]"
      />
      <div
        className={cn(
          "prose prose-sm w-full max-w-none text-[var(--color-text)] prose-headings:text-[var(--color-text)] prose-p:mt-0 prose-p:text-[var(--color-text)] prose-strong:text-[var(--color-text)] prose-p:leading-relaxed first:prose-p:mt-0 md:prose-base",
          priceCard ? "pt-1" : "pt-2",
        )}
        style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
        dangerouslySetInnerHTML={{
          __html: about_event_description || defaultDescription,
        }}
      />
    </div>
  );

  const priceAside = priceCard ? (
    <aside
      className={cn(
        "w-full shrink-0 lg:sticky lg:top-24 lg:self-start",
        isCentered && "flex justify-center lg:justify-center",
      )}
    >
      <div
        className={cn(
          "rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_7%,transparent)] bg-[var(--color-surface)] p-6 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.18)] sm:p-7",
          /* Same readable width as copy on mobile; fills sidebar column on lg */
          "mx-auto w-full max-w-md lg:mx-0 lg:max-w-none",
        )}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-dimmed)]">
          {priceCard.fromLabel ?? "PRICES FROM"}
        </p>
        <p className="mt-3 text-4xl font-black tabular-nums tracking-tight text-[color:var(--color-primary)] sm:text-5xl">
          {priceCard.amount}
        </p>
        {priceCard.suffix ? (
          <p className="mt-1.5 text-xs text-[var(--color-text-dimmed)]">
            {priceCard.suffix}
          </p>
        ) : null}
        <Button
          type="button"
          variant="event-primary"
          size="lg"
          className="mt-7 h-12 w-full rounded-full text-base font-bold shadow-[0_12px_40px_-10px_color-mix(in_srgb,var(--color-primary)_55%,transparent)] transition-[box-shadow,transform,filter] duration-300 hover:shadow-[0_16px_48px_-8px_color-mix(in_srgb,var(--color-primary)_65%,transparent)]"
          onClick={scrollToBooking}
        >
          {priceCard.ctaLabel ?? "Book Now"}
        </Button>
      </div>
    </aside>
  ) : null;

  return (
    <section className="w-full bg-[color:var(--color-background)] py-14 md:py-20">
      <div
        className={cn(
          "mx-auto w-full max-w-6xl px-4 sm:px-6",
          !priceCard && "max-w-3xl",
        )}
      >
        {priceCard ? (
          <div
            className={cn(
              "grid grid-cols-1 items-start gap-y-8 lg:grid-cols-12 lg:gap-x-10 xl:gap-x-14",
              isCentered ? "lg:gap-y-10" : "lg:gap-y-0",
            )}
          >
            <div
              className={cn(
                "min-w-0 lg:col-span-7",
                isCentered && "lg:col-span-12",
              )}
            >
              {copyBlock}
            </div>
            {!isCentered ? (
              <div className="min-w-0 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] pt-8 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0 xl:pl-12">
                {priceAside}
              </div>
            ) : (
              <div className="min-w-0 lg:col-span-12">{priceAside}</div>
            )}
          </div>
        ) : (
          copyBlock
        )}
      </div>
    </section>
  );
}
