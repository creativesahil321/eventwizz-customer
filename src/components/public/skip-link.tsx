const SKIP_TARGET_ID = "main-content";

/**
 * "Skip to content" link (WCAG 2.4.1). Visually hidden until focused, so it is
 * the first thing a keyboard user tabs to and lets them jump past the header
 * nav. Render it immediately before the matching `<main id="main-content">`.
 */
export function SkipLink() {
  return (
    <a
      href={`#${SKIP_TARGET_ID}`}
      className="sr-only rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-lg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
    >
      Skip to content
    </a>
  );
}

export { SKIP_TARGET_ID };
