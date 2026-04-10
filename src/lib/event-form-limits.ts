/**
 * Shared limits for event flows: vendor editor, onboarding, and AI review.
 * Keep Zod schemas and UI (maxLength / counters) aligned with these values.
 */
export { RICH_DESCRIPTION_MAX_CHARS } from "./plain-text-length";

/** Main package block heading (vendor step 2 / onboarding step 4). */
export const EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS = 40;
/** Sub-heading under the package block. */
export const EVENT_PACKAGE_SUB_HEADING_MAX_CHARS = 160;
/** CTA button under package image. */
export const PACKAGE_BUTTON_NAME_MAX_CHARS = 18;
/** One bullet line in package details. */
export const PACKAGE_DETAIL_LINE_MAX_CHARS = 40;

/** "Other packages" / drinks section title. */
export const DRINK_SECTION_TITLE_MAX_CHARS = 40;
export const DRINK_SECTION_DESCRIPTION_MAX_CHARS = 160;
/** Single add-on package row heading (stricter than section title). */
export const DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS = 25;

export const DRINK_PACKAGE_PRICE_MIN = 1;
export const DRINK_PACKAGE_PRICE_MAX = 999999;
export const DRINK_PACKAGE_QTY_MIN = 1;
export const DRINK_PACKAGE_QTY_MAX = 500;

export function clampDrinkPackageQuantity(raw: number): number {
  if (!Number.isFinite(raw)) return DRINK_PACKAGE_QTY_MIN;
  return Math.min(
    DRINK_PACKAGE_QTY_MAX,
    Math.max(DRINK_PACKAGE_QTY_MIN, Math.trunc(raw))
  );
}

export function clampDrinkPackagePrice(raw: number): number {
  if (!Number.isFinite(raw)) return DRINK_PACKAGE_PRICE_MIN;
  const rounded = Math.round(raw * 100) / 100;
  return Math.min(
    DRINK_PACKAGE_PRICE_MAX,
    Math.max(DRINK_PACKAGE_PRICE_MIN, rounded)
  );
}
