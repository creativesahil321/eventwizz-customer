/** Max words for site / event hero banner headings (onboarding + site essentials). */
export const BANNER_HEADING_MAX_WORDS = 30;

export function countWords(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Trims to at most `maxWords` whitespace-separated tokens (AI / paste safety). */
export function truncateToMaxWords(input: string, maxWords: number): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return trimmed;
  return words.slice(0, maxWords).join(" ");
}
