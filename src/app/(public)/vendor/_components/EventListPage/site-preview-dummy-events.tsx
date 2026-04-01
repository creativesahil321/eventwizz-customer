"use client";

import { useMemo } from "react";
import { addCacheBusting } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

const PREVIEW_IMAGES = [
  "/assets/images/events/dummyEvents/concert-event.jpg",
  "/assets/images/events/dummyEvents/theater-event.jpg",
  "/assets/images/events/dummyEvents/music-event.jpg",
] as const;

const DUMMY_EVENT_META = [
  { title: "Sample: Evening Gala", fromAmount: 45, image: PREVIEW_IMAGES[0] },
  { title: "Sample: Live Music Night", fromAmount: 28, image: PREVIEW_IMAGES[1] },
  {
    title: "Sample: Weekend Brunch Club",
    fromAmount: 35,
    image: PREVIEW_IMAGES[2],
  },
] as const;

type Band = "secondary" | "background";

interface SitePreviewDummyEventSectionProps {
  sectionTitle: string;
  band: Band;
}

/**
 * Shown only in Site Essentials /preview/site when there are no events.
 * Realistic cards so vendors see layout + theme; clearly labeled as sample data.
 */
export function SitePreviewDummyEventSection({
  sectionTitle,
  band,
}: SitePreviewDummyEventSectionProps) {
  const { formatCompact } = useCurrencyFormat();
  const dummyEvents = useMemo(
    () =>
      DUMMY_EVENT_META.map((e) => ({
        title: e.title,
        image: e.image,
        price: `From ${formatCompact(e.fromAmount)} (demo pricing)`,
      })),
    [formatCompact],
  );
  const isSecondary = band === "secondary";

  const sectionClass = isSecondary
    ? "w-full py-16 bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] border-t border-[var(--color-secondary-foreground)]/15"
    : "w-full py-20 bg-[var(--color-background)] border-y border-[var(--color-on-background)]/10 shadow-inner text-[var(--color-text)]";

  const headingClass = isSecondary
    ? "text-[var(--color-secondary-foreground)]"
    : "text-[var(--color-text)]";

  const noteClass = isSecondary
    ? "text-[var(--color-secondary-foreground)]/85"
    : "text-[var(--color-text-dimmed)]";

  const badgeBorder = isSecondary
    ? "border-[var(--color-secondary-foreground)]/25"
    : "border-[var(--color-on-background)]/20";

  return (
    <section className={sectionClass}>
      <div className="container mx-auto px-4">
        <div className="w-full text-center mb-6">
          {isSecondary ? (
            <span className="inline-block mb-2 text-xs font-semibold tracking-[0.18em] uppercase text-[var(--color-secondary-foreground)]/75">
              Featured right now
            </span>
          ) : null}
          <h2 className={`text-3xl md:text-4xl font-bold ${headingClass}`}>
            {sectionTitle}
          </h2>
          <p
            className={`mt-4 max-w-2xl mx-auto text-sm md:text-base leading-relaxed ${noteClass}`}
          >
            <span className="font-semibold text-[var(--color-primary)]">
              Preview only — sample events.
            </span>{" "}
            These cards show how your site will look with real listings. They
            are not live events and are not shown to guests this way once you
            publish your own.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-2">
          {dummyEvents.map((event, index) => (
            <div key={index} className="relative p-1">
              <span
                className="absolute top-4 right-4 z-20 rounded-md bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-md ring-2 ring-white/90"
                title="Dummy data for preview"
              >
                Sample
              </span>
              <div
                className={`overflow-hidden bg-[var(--color-surface)] text-[var(--color-on-surface)] rounded-xl border shadow-sm h-full flex flex-col ${badgeBorder}`}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden flex-shrink-0">
                  <img
                    src={addCacheBusting(event.image)}
                    alt={`${event.title} — sample image for site preview only`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col text-[var(--color-on-surface)]">
                  <h3 className="pb-2 text-base font-bold line-clamp-2 min-h-[2.5rem]">
                    {event.title}
                  </h3>
                  <p className="font-medium mb-3 text-sm text-[var(--color-on-surface)]/80 min-h-[1.25rem]">
                    {event.price}
                  </p>
                  <div className="mt-auto">
                    <Button
                      type="button"
                      variant="event-outline"
                      className="w-full pointer-events-none opacity-95"
                      disabled
                      aria-disabled
                    >
                      Dummy card — not bookable
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
