import { z } from "zod";

/** Backend default when the field is omitted, null, or empty. */
export const MENU_CHOICES_CLOSE_DEFAULT_DAYS = 14;

export const MENU_CHOICES_CLOSE_MIN_DAYS = 1;

export const MENU_CHOICES_CLOSE_MAX_DAYS = 365;

export const MENU_CHOICES_CLOSE_RANGE_MESSAGE =
  "Enter a whole number from 1 to 365.";
export const MENU_CHOICES_CLOSE_MIN_MESSAGE =
  MENU_CHOICES_CLOSE_RANGE_MESSAGE;

function preprocessMenuChoicesCloseDaysBefore(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

function isValidMenuChoicesCloseDays(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MENU_CHOICES_CLOSE_MIN_DAYS &&
    value <= MENU_CHOICES_CLOSE_MAX_DAYS
  );
}

/** Empty is allowed in the form (save sends 14). Out-of-range integers fail. */
export const menuChoicesCloseDaysBeforeSchema = z
  .number({
    invalid_type_error: MENU_CHOICES_CLOSE_RANGE_MESSAGE,
    required_error: MENU_CHOICES_CLOSE_RANGE_MESSAGE,
  })
  .int({ message: MENU_CHOICES_CLOSE_RANGE_MESSAGE })
  .min(MENU_CHOICES_CLOSE_MIN_DAYS, {
    message: MENU_CHOICES_CLOSE_RANGE_MESSAGE,
  })
  .max(MENU_CHOICES_CLOSE_MAX_DAYS, {
    message: MENU_CHOICES_CLOSE_RANGE_MESSAGE,
  })
  .nullable()
  .optional();

/** Persist an integer from 1 to 365. Blank or invalid values become 14. */
export function serializeMenuChoicesCloseDaysBefore(value: unknown): number {
  const parsed = preprocessMenuChoicesCloseDaysBefore(value);
  if (isValidMenuChoicesCloseDays(parsed)) return parsed;
  return MENU_CHOICES_CLOSE_DEFAULT_DAYS;
}

/** Show / form hydrate: missing, null, or invalid → 14. */
export function hydrateMenuChoicesCloseDaysBefore(value: unknown): number {
  return serializeMenuChoicesCloseDaysBefore(value);
}
