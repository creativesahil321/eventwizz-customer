import {
  clipPlainTextToLimits,
  hasPlainText,
  toPlainText,
} from "@/lib/plain-text-length";

/** Visible cap for the footer blurb under the logo (matches live snippet). */
export const FOOTER_BRAND_DESCRIPTION_MAX_CHARS = 180;
export const FOOTER_BRAND_DESCRIPTION_MAX_WORDS = 35;

/** Soft target for AI generation — leaves headroom so copy is not clipped mid-sentence. */
export const FOOTER_BRAND_DESCRIPTION_AI_TARGET_CHARS = 140;
export const FOOTER_BRAND_DESCRIPTION_AI_TARGET_WORDS = 28;

/** First non-empty rich/plain value — used so About copy is only a fallback. */
export function firstFooterBrandDescription(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (hasPlainText(value)) return value as string;
  }
  return null;
}

/**
 * Prefer a finished sentence when clipping. Drops dangling endings like
 * "…warm atmosphere for" that appear when hard caps cut mid-phrase.
 */
export function preferCompleteFooterSentence(value: string): string {
  let plain = toPlainText(value);
  if (!plain) return "";

  if (/[.!?]"?$/.test(plain)) return plain;

  const sentenceMatch = plain.match(/^(.+?[.!?])(?:\s+|$)/);
  if (sentenceMatch?.[1] && sentenceMatch[1].trim().length >= 40) {
    return sentenceMatch[1].trim();
  }

  const danglingTail =
    /\b(for|and|with|to|of|the|a|an|in|at|on|or|our|your|as|by|from|into|over|under|about|that|this|these|those)$/i;
  while (danglingTail.test(plain)) {
    const next = plain.replace(/\s+\S+$/, "").trim();
    if (!next || next === plain) break;
    plain = next;
  }

  return plain;
}

export function clipFooterBrandDescription(value: string): string {
  return preferCompleteFooterSentence(
    clipPlainTextToLimits(
      value,
      FOOTER_BRAND_DESCRIPTION_MAX_CHARS,
      FOOTER_BRAND_DESCRIPTION_MAX_WORDS,
    ),
  );
}
