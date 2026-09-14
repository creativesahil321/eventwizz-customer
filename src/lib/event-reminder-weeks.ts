/** Balance reminder timing: 1–8 weeks before the event (stored as days). */
export const EVENT_REMINDER_WEEK_OPTIONS = Array.from(
  { length: 8 },
  (_, index) => {
    const weeks = index + 1;
    return {
      weeks,
      days: weeks * 7,
      label: weeks === 1 ? "1 week before" : `${weeks} weeks before`,
    };
  },
);

/** Default when the vendor opts into reminders (2 weeks). */
export const EVENT_REMINDER_DEFAULT_DAYS = 14;

export function reminderDaysToSelectValue(
  days: number | null | undefined,
): string {
  const normalized = normalizeReminderDaysToWeeks(days);
  return String(normalized ?? EVENT_REMINDER_DEFAULT_DAYS);
}

/** Snap legacy day values onto the nearest 1–8 week option. */
export function normalizeReminderDaysToWeeks(
  days: number | null | undefined,
): number | undefined {
  if (days == null || !Number.isFinite(days) || days <= 0) return undefined;
  const exact = EVENT_REMINDER_WEEK_OPTIONS.find((option) => option.days === days);
  if (exact) return exact.days;
  const weeks = Math.min(8, Math.max(1, Math.round(days / 7)));
  return weeks * 7;
}
