import type { Event } from "@/services/common/events/type";
import {
  formatMoneyCompact,
  resolveCurrencySymbol,
} from "@/lib/currency-format";
import type { LocationEventCardModel } from "./location-event-card";
import {
  resolveLocationCardBookingOption,
  type PublicBookingType,
} from "@/components/public/booking-type-icons";
import { formatPublicClock24h, sortScheduleRows } from "@/lib/schedule-clock";

const CLOCK_RE =
  /(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)(?:\s*[-–]\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?))?/;

export type EventCardTimeSource = Pick<
  Event,
  | "start_time"
  | "end_time"
  | "event_time"
  | "formatted_time"
  | "time"
  | "next_available_date"
  | "next_event_date"
  | "event_date"
  | "formatted_date"
  | "date"
  | "start_date"
>;

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    if (value == null) continue;
    const trimmed = String(value).trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function formatClock(raw: string): string | null {
  return formatPublicClock24h(raw);
}

function timeFromDateLike(raw: string): string | null {
  const iso = raw.match(/T(\d{2}:\d{2})(?::\d{2})?/);
  if (iso) return iso[1];

  const match = raw.match(CLOCK_RE);
  if (!match) return null;
  const start = formatClock(match[1]);
  const end = match[2] ? formatClock(match[2]) : null;
  if (start && end) return `${start} – ${end}`;
  return start;
}

function stripTimeFromDateLabel(value: string): string {
  return value
    .replace(
      /[,\s]*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?(?:\s*[-–]\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)?\s*$/,
      "",
    )
    .replace(/T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/, "")
    .trim();
}

function parseCardDate(raw: string): Date | null {
  const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoDay) {
    const parsed = new Date(
      Number(isoDay[1]),
      Number(isoDay[2]) - 1,
      Number(isoDay[3]),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Label for event list cards when the API sends a date (any common key).
 */
export function getEventCardDateLabel(event: EventCardTimeSource): string | null {
  const raw = firstNonEmpty(
    event.next_available_date,
    event.next_event_date,
    event.event_date,
    event.formatted_date,
    event.date,
    event.start_date,
  );
  if (!raw) return null;

  const withoutTime = stripTimeFromDateLabel(raw);
  if (/^[A-Za-z]{3}\s+\d{1,2}/.test(withoutTime)) return withoutTime;

  const parsed = parseCardDate(raw);
  if (parsed) {
    return parsed.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return withoutTime || raw;
}

/** Time range for event list cards when the API sends a start/end (or embeds it in a date). */
export function getEventCardTimeLabel(event: EventCardTimeSource): string | null {
  const start = formatClock(
    firstNonEmpty(
      event.start_time,
      event.event_time,
      event.formatted_time,
      event.time,
    ) ?? "",
  );
  const end = formatClock(firstNonEmpty(event.end_time) ?? "");
  if (start && end) {
    const ordered = sortScheduleRows([{ time: start }, { time: end }]).map(
      (row) => row.time,
    );
    return `${ordered[0]} – ${ordered[ordered.length - 1]}`;
  }
  if (start) return start;

  const dateRaw = firstNonEmpty(
    event.formatted_date,
    event.next_available_date,
    event.next_event_date,
    event.event_date,
    event.date,
    event.start_date,
  );
  return dateRaw ? timeFromDateLike(dateRaw) : null;
}

/** Category label for event list cards (e.g. Christmas, Lipstick). */
export function getEventCardCategoryLabel(event: Event): string | null {
  const fromSearchCategory = event.category?.name?.trim();
  if (fromSearchCategory) return fromSearchCategory;

  const fromName = event.event_category_name?.trim();
  if (fromName) return fromName;

  const raw = event.event_category;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object" && "name" in raw) {
    const nested = raw.name?.trim();
    if (nested) return nested;
  }

  return null;
}

export function formatEventCardFromPrice(price: string | null): string | null {
  if (!price?.trim()) return null;
  const trimmed = price.trim();
  if (/^from\s+/i.test(trimmed)) return trimmed;
  return `from ${trimmed}`;
}

/** Listing cards hide 0 / empty — that means “not priced yet”, not a £0 ticket. */
export function formatEventListingPrice(
  lowestPrice: unknown,
  symbol: string,
): string | null {
  const n = Number(lowestPrice);
  if (!Number.isFinite(n) || n <= 0) return null;
  return formatMoneyCompact(n, resolveCurrencySymbol(symbol));
}

export function toLocationEventCardModel(
  event: Event,
  currencySym: string,
  imageFallback: string,
): LocationEventCardModel {
  const symbol = resolveCurrencySymbol(currencySym);
  const bookingType: PublicBookingType | null =
    resolveLocationCardBookingOption(event.booking_option);
  return {
    title: event.name || "",
    price: formatEventListingPrice(event.lowest_price, symbol),
    dateLabel: getEventCardDateLabel(event),
    timeLabel: getEventCardTimeLabel(event),
    category: getEventCardCategoryLabel(event),
    image: event.banner_image || imageFallback,
    slug: event.slug || "",
    bookingType,
    eventAddress: firstNonEmpty(event.event_address),
  };
}
