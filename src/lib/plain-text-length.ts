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

/** Shared cap for menu item and drink-package descriptions (HTML allowed in UI). */
export const RICH_DESCRIPTION_MAX_CHARS = 160;
