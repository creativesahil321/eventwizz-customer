/**
 * Hero banner copy limits — one source for Site Essentials, onboarding, the
 * vendor event editor, and every AI route that writes hero copy.
 *
 * Sized for the rendered hero: a heading of ≤12 words / ≤80 chars stays within
 * two lines on desktop and three on a phone at the hero type scale; the
 * subheading stays within ~3 lines at body size.
 */

/** Hero heading word cap (live input counter). */
export const BANNER_HEADING_MAX_WORDS = 12;
/** Hero heading hard character cap (guards long single words / pastes). */
export const BANNER_HEADING_MAX_CHARS = 80;
/** Hero subheading / tagline under the heading. */
export const BANNER_SUB_HEADING_MAX_CHARS = 160;

/**
 * Shortens `input` to at most `max` characters without cutting a word in half,
 * dropping trailing punctuation left dangling by the cut. Used for AI output,
 * which the model does not always keep within limits.
 */
export function truncateAtWordBoundary(input: string, max: number): string {
  const text = (input ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;

  const slice = text.slice(0, max + 1);
  const lastSpace = slice.lastIndexOf(" ");
  // A single oversized word: fall back to a hard cut rather than returning "".
  const cut = lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : text.slice(0, max);
  return cut.replace(/[\s,;:–—-]+$/, "").trim();
}

/** Hero heading within both the word and character caps (AI / import output). */
export function clampHeroHeading(input: string | null | undefined): string {
  const words = (input ?? "").trim().split(/\s+/).filter(Boolean);
  return truncateAtWordBoundary(
    words.slice(0, BANNER_HEADING_MAX_WORDS).join(" "),
    BANNER_HEADING_MAX_CHARS,
  );
}
