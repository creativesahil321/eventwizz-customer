"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
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
        <div className="mb-6 w-full text-left">
          {isSecondary ? (
            <span className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Featured right now
            </span>
          ) : null}
          <h2 className={`text-2xl font-black tracking-tight md:text-3xl ${headingClass}`}>
            {sectionTitle}
          </h2>
          <p
            className={`mt-3 max-w-2xl text-left text-sm leading-relaxed md:text-base ${noteClass}`}
          >
            <span className="font-semibold text-[var(--color-primary)]">
              Preview only — sample events.
            </span>{" "}
            These cards show how your site will look with real listings. They
            are not live events and are not shown to guests this way once you
            publish your own.
          </p>
        </div>

        <div className="grid max-w-7xl grid-cols-1 gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {dummyEvents.map((event, index) => (
            <div key={index} className="relative">
              <span
                className="absolute right-3 top-3 z-20 rounded-md bg-amber-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md ring-2 ring-white/90"
                title="Dummy data for preview"
              >
                Sample
              </span>
              <article
                className={`pointer-events-none relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950 opacity-95 ${badgeBorder}`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                  <img
                    src={addCacheBusting(event.image)}
                    alt={`${event.title} — sample image for site preview only`}
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute right-2.5 top-2.5 z-[1] rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[11px] font-bold leading-none text-[var(--color-primary-foreground)] shadow-md">
                    {event.price}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 z-[1] flex items-center gap-1 text-[11px] font-semibold text-white">
                    <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                    Jun 20
                  </div>
                </div>
                <div className="border-t border-white/[0.06] bg-zinc-950 px-3 py-2.5">
                  <h3 className="line-clamp-2 text-left text-sm font-bold text-white">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-[10px] font-medium text-white/45">
                    Preview only — not bookable
                  </p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
