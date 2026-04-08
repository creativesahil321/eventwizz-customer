import type { Event } from "@/services/common/events/type";

/**
 * Label for event list cards when the API sends a date (any common key).
 */
export function getEventCardDateLabel(event: Event): string | null {
  const raw =
    event.event_date ??
    event.formatted_date ??
    event.date ??
    event.start_date;
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  if (/^[A-Za-z]{3}\s+\d{1,2}/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
    });
  }
  return s;
}
