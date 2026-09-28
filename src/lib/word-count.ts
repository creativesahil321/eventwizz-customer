/** Hero limits live in `hero-copy-limits`; re-exported for existing importers. */
export { BANNER_HEADING_MAX_WORDS } from "./hero-copy-limits";

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

/**
 * Keeps user-typed spacing while enforcing a max word count in live inputs.
 * Use this in onChange handlers so pressing space is not stripped immediately.
 */
export function truncateToMaxWordsForInput(
  input: string,
  maxWords: number
): string {
  if (!input) return "";
  const words = input.match(/\S+/g);
  if (!words || words.length <= maxWords) return input;

  const wordPattern = /\S+/g;
  let wordCount = 0;
  let endIndex = input.length;
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(input)) !== null) {
    wordCount += 1;
    if (wordCount === maxWords) {
      endIndex = wordPattern.lastIndex;
      break;
    }
  }

  return input.slice(0, endIndex).replace(/\s+$/, "");
}
