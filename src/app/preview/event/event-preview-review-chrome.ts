/**
 * `/preview/event` review actions (Back to Editor, Publish).
 *
 * Below `2xl` the controls occupy layout space so they cannot sit under the
 * guest header (`z-[80]`) or hamburger (`z-[90]`). At `2xl+` they float over
 * the hero again, at `z-[100]`, so hit-testing beats the header.
 */
export const EVENT_PREVIEW_REVIEW_CHROME_CLASSNAME =
  "isolate z-[100] flex flex-wrap items-center justify-between gap-2 relative shrink-0 bg-white/95 px-3 py-2 text-black shadow-sm ring-1 ring-black/5 backdrop-blur-md sm:px-4 2xl:pointer-events-none 2xl:absolute 2xl:inset-x-0 2xl:top-0 2xl:bg-transparent 2xl:px-6 2xl:pt-4 2xl:shadow-none 2xl:ring-0 2xl:backdrop-blur-none";
