import Image from "next/image";
import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

// Each tile is full-column: 1 col <768, 2 cols <1024, 3 cols in a max-w-7xl
// container above that (≈400px). Keeps the optimizer from shipping 900px files
// to a 400px slot and converts local JPEGs to AVIF/WebP.
const CARD_SIZES = "(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw";

export default function EventTypes({
  content,
}: {
  content: AdminHomeContent["audience"];
}) {
  return (
    <section className="py-20 bg-[color:var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <SiteHeading
            level={2}
            title={content.title}
            variant="onSurface"
            align="center"
            className="mb-3"
          />
          <p className="text-[color:var(--color-text-dimmed)] max-w-2xl mx-auto">
            {content.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.cards.map((card, idx) => (
            <div
              key={`${card.title}-${idx}`}
              className="relative rounded-2xl overflow-hidden group cursor-pointer h-64 shadow-md hover:shadow-xl transition-shadow duration-300"
            >
              {/* Background image. next/image optimizes local + allowlisted
                  hosts; tenant URLs on other hosts fall back to unoptimized. */}
              <Image
                src={card.image}
                alt={card.title}
                fill
                sizes={CARD_SIZES}
                quality={75}
                unoptimized={!shouldUseNextImageOptimization(card.image)}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Gradient overlay — always visible, deepens on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 group-hover:from-black/90 transition-all duration-300" />

              {/* Content pinned to bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3
                  className="font-heading font-bold text-lg leading-snug mb-1.5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {card.title}
                </h3>
                {/* Description slides up on hover */}
                <p className="text-sm text-white/80 leading-snug max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-300">
                  {card.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
