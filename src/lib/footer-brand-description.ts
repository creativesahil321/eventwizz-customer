import {
  clipPlainTextToLimits,
  hasPlainText,
} from "@/lib/plain-text-length";

/** Visible cap for the footer blurb under the logo (matches live snippet). */
export const FOOTER_BRAND_DESCRIPTION_MAX_CHARS = 180;
export const FOOTER_BRAND_DESCRIPTION_MAX_WORDS = 35;

/** First non-empty rich/plain value — used so About copy is only a fallback. */
export function firstFooterBrandDescription(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (hasPlainText(value)) return value as string;
  }
  return null;
}

export function clipFooterBrandDescription(value: string): string {
  return clipPlainTextToLimits(
    value,
    FOOTER_BRAND_DESCRIPTION_MAX_CHARS,
    FOOTER_BRAND_DESCRIPTION_MAX_WORDS,
  );
}
