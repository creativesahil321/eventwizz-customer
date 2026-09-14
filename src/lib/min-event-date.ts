const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const EVENT_DATE_MIN_MESSAGE =
  "Event date must be tomorrow or later.";

export function startOfLocalDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toLocalIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDateString(now: Date = new Date()): string {
  return toLocalIsoDateString(startOfLocalDay(now));
}

/** Earliest date a vendor may schedule an event: tomorrow, local calendar. */
export function getMinEventDateString(now: Date = new Date()): string {
  const min = startOfLocalDay(now);
  min.setDate(min.getDate() + 1);
  return toLocalIsoDateString(min);
}

export function isEventDateBeforeMinimum(
  isoDate: string,
  now: Date = new Date(),
): boolean {
  if (!ISO_DATE_RE.test(isoDate)) return false;
  const eventTime = new Date(`${isoDate}T00:00:00`).getTime();
  const minTime = new Date(`${getMinEventDateString(now)}T00:00:00`).getTime();
  return eventTime < minTime;
}
