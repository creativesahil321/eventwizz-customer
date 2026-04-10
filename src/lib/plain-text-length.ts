/**
 * Plain-text length after stripping HTML and trimming — used for rich-text fields
 * where max length applies to visible text (onboarding + vendor event schemas).
 */
export function plainTextCharCount(value: string): number {
  return value.replace(/<[^>]*>/g, "").trim().length;
}

/** Shared cap for menu item and drink-package descriptions (HTML allowed in UI). */
export const RICH_DESCRIPTION_MAX_CHARS = 160;
