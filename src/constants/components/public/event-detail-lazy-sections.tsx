"use client";

import dynamic from "next/dynamic";

function EventSectionChunkFallback() {
  return (
    <div
      className="my-8 min-h-[10rem] w-full animate-pulse rounded-xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[color:color-mix(in_srgb,var(--color-text)_4%,var(--color-surface))]"
      aria-busy="true"
      aria-label="Loading section"
    />
  );
}

const loading = () => <EventSectionChunkFallback />;

/**
 * Code-split only heavier / lower sections so hero + gallery + dates stay in the main chunk
 * and image requests start as soon as the page loads.
 */
export const LazyMenuSection = dynamic(
  () =>
    import(
      "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/menu-section"
    ),
  { loading },
);

export const LazyDrinkSection = dynamic(
  () =>
    import(
      "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/drink-section"
    ),
  { loading },
);

export const LazyBrochureSection = dynamic(
  () =>
    import(
      "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/brochure-section"
    ),
  { loading },
);

export const LazyFaqSection = dynamic(
  () =>
    import(
      "@/app/(on-boarding)/on-boarding/_components/form-preview/_components/faq-section"
    ),
  { loading },
);
