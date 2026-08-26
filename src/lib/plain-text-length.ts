import { truncateToMaxWords } from "@/lib/word-count";

/**
 * Plain-text length after stripping HTML and trimming — used for rich-text fields
 * where max length applies to visible text (onboarding + vendor event schemas).
 */
export function plainTextCharCount(value: string): number {
  return toPlainText(value).length;
}

/** True when HTML/rich text has visible characters (TipTap empty is often `<p></p>`). */
export function hasPlainText(value: string | null | undefined): boolean {
  return Boolean(value && plainTextCharCount(value) > 0);
}

/** Visible text from HTML, collapsed whitespace. */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Clip visible copy to word and character caps (AI / paste safety). */
export function clipPlainTextToLimits(
  value: string,
  maxChars: number,
  maxWords: number,
): string {
  let plain = toPlainText(value);
  if (!plain) return "";
  if (maxWords > 0) {
    plain = truncateToMaxWords(plain, maxWords);
  }
  if (maxChars > 0 && plain.length > maxChars) {
    const sliced = plain.slice(0, maxChars).trim();
    const lastSpace = sliced.lastIndexOf(" ");
    if (lastSpace >= Math.floor(maxChars * 0.5)) {
      return sliced.slice(0, lastSpace).trim();
    }
    return sliced;
  }
  return plain;
}

export function wrapPlainTextAsHtml(plain: string): string {
  if (!plain) return "";
  return `<p>${escapeHtmlText(plain)}</p>`;
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
