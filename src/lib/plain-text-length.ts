/**
 * Plain-text length after stripping HTML and trimming — used for rich-text fields
 * where max length applies to visible text (onboarding + vendor event schemas).
 */
export function plainTextCharCount(value: string): number {
  return value.replace(/<[^>]*>/g, "").trim().length;
}

/** True when HTML/rich text has visible characters (TipTap empty is often `<p></p>`). */
export function hasPlainText(value: string | null | undefined): boolean {
  return Boolean(value && plainTextCharCount(value) > 0);
}

/** Visible text from HTML, collapsed whitespace. */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Truncated plain snippet for marketing chrome (footer blurb, etc.). */
export function toPlainSnippet(
  value: string | null | undefined,
  maxChars = 160,
): string | null {
  const text = toPlainText(value);
  if (!text) return null;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1)).trim()}…`;
}

/** Shared cap for menu item and drink-package descriptions (HTML allowed in UI). */
export const RICH_DESCRIPTION_MAX_CHARS = 160;
