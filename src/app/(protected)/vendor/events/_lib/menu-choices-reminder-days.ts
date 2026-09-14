import { z } from "zod";

/** Backend default when the field is omitted, null, or 0. */
export const MENU_CHOICES_REMINDER_DEFAULT_DAYS = 7;

/** Laravel `gt:5` — allowed values start at 6. */
export const MENU_CHOICES_REMINDER_MIN_DAYS = 6;

export const MENU_CHOICES_REMINDER_MIN_MESSAGE =
  "Menu choices reminder must be more than 5 days.";

function preprocessMenuChoicesReminderDays(value: unknown): unknown {
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

/** Keep input/output types aligned so `zodResolver` stays compatible with RHF. */
export const menuChoicesReminderDaysSchema = z
  .number({
    invalid_type_error: MENU_CHOICES_REMINDER_MIN_MESSAGE,
    required_error: MENU_CHOICES_REMINDER_MIN_MESSAGE,
  })
  .int({ message: MENU_CHOICES_REMINDER_MIN_MESSAGE })
  .gt(5, { message: MENU_CHOICES_REMINDER_MIN_MESSAGE })
  .nullable()
  .optional();

/** Persist only integers ≥ 6. Empty or invalid values become null (omit / backend default 7). */
export function serializeMenuChoicesReminderDays(
  value: unknown,
): number | null {
  const parsed = preprocessMenuChoicesReminderDays(value);
  if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed <= 5) {
    return null;
  }
  return parsed;
}

/** Show / form hydrate: missing, null, 0, or invalid → 7. */
export function hydrateMenuChoicesReminderDays(value: unknown): number {
  return (
    serializeMenuChoicesReminderDays(value) ??
    MENU_CHOICES_REMINDER_DEFAULT_DAYS
  );
}
