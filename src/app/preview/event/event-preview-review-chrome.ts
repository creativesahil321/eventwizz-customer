/**
 * Reserved editor bar above a public-site preview (Back / Save / Try theme).
 * Always occupies layout space so it never merges with the guest header.
 */
export const PREVIEW_REVIEW_TOP_CHROME_BAR_CLASSNAME =
  "isolate z-[100] flex flex-wrap items-center justify-between gap-2 relative shrink-0 bg-white/95 px-3 py-2 text-black shadow-sm ring-1 ring-black/5 backdrop-blur-md sm:px-4";

/** `/preview/event` uses the same reserved bar as Site Essentials preview. */
export const EVENT_PREVIEW_REVIEW_CHROME_CLASSNAME =
  PREVIEW_REVIEW_TOP_CHROME_BAR_CLASSNAME;
