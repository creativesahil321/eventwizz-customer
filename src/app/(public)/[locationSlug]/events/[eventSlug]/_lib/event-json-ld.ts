import type { EventDetail } from "@/services/common/events/type";

/**
 * schema.org/Event JSON-LD for the public event page.
 *
 * Built from the same server-rendered event payload the page shows, so
 * dates, prices and sold-out state match visible content. Conservative on
 * purpose (Google flags mismatched or invalid event markup):
 * - only future dates, at most MAX_DATES entries;
 * - date-only startDate (the detail API has no start time);
 * - no markup at all without an address (location is required);
 * - offers only when the price is numeric and the currency is unambiguous.
 */

const MAX_DATES = 10;

/** Currency symbols that map to exactly one ISO code. "$" is ambiguous (USD/AUD/CAD…). */
const CURRENCY_BY_SYMBOL: Record<string, string> = {
  "£": "GBP",
  "€": "EUR",
};

function stripHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

function isoDateKey(raw: string | null | undefined): string {
  return raw?.trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
}

/** Today's date in the UK, as YYYY-MM-DD (sites are en-GB). */
function todayInLondon(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function absoluteHttpUrl(value: unknown): string | null {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

type DateEntry = { day: string; price: number | null; sold_out: boolean };

/**
 * Event dates from the top-level `dates`, or (room-mode events) from every
 * room's `dates`. Per day: lowest price across rooms; sold out only when
 * every room is sold out on that day.
 */
function collectDates(event: EventDetail): DateEntry[] {
  const sources = [
    ...(Array.isArray(event.dates) ? [event.dates] : []),
    ...Object.values(event.rooms ?? {}).map((room) => room?.dates),
  ].filter(Array.isArray);

  const byDay = new Map<string, DateEntry>();
  for (const list of sources) {
    for (const d of list) {
      const day = isoDateKey(d?.event_date);
      if (!day) continue;
      const price = toNumber(d.price);
      const soldOut = Boolean(d.sold_out);
      const prev = byDay.get(day);
      if (!prev) {
        byDay.set(day, { day, price, sold_out: soldOut });
      } else {
        byDay.set(day, {
          day,
          price:
            prev.price === null ? price : price === null ? prev.price : Math.min(prev.price, price),
          sold_out: prev.sold_out && soldOut,
        });
      }
    }
  }
  return Array.from(byDay.values());
}

export function buildEventJsonLd({
  event,
  url,
  organizerName,
  organizerUrl,
  currencySymbol,
}: {
  event: EventDetail;
  url: string;
  organizerName: string | null;
  organizerUrl: string;
  currencySymbol: string | null;
}): string | null {
  const address = (event.event_address || event.address || "").trim();
  if (!event.event_name || !address) return null;

  const today = todayInLondon();
  const dates = collectDates(event)
    .filter((d) => d.day >= today)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(0, MAX_DATES);
  if (dates.length === 0) return null;

  const description = truncate(
    stripHtml(event.about_event_sub_heading) || stripHtml(event.about_event_description),
    300,
  );
  const images = [
    absoluteHttpUrl(event.event_banner_image),
    ...(event.event_galley ?? []).slice(0, 3).map((g) => absoluteHttpUrl(g?.url)),
  ].filter((u): u is string => Boolean(u));

  const lat = toNumber(event.lat);
  const lng = toNumber(event.long);
  const location = {
    "@type": "Place",
    name: organizerName || address,
    address,
    ...(lat !== null && lng !== null && {
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    }),
  };
  const organizer = organizerName
    ? { "@type": "Organization", name: organizerName, url: organizerUrl }
    : undefined;
  const currency = currencySymbol ? CURRENCY_BY_SYMBOL[currencySymbol.trim()] : undefined;

  const items = dates.map((d) => {
    const price = d.price;
    return {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.event_name,
      ...(description && { description }),
      ...(images.length > 0 && { image: images }),
      startDate: d.day,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location,
      ...(organizer && { organizer }),
      url,
      ...(price !== null &&
        currency && {
          offers: {
            "@type": "Offer",
            price,
            priceCurrency: currency,
            availability: d.sold_out
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
            url,
          },
        }),
    };
  });

  const payload = items.length === 1 ? items[0] : items;
  // Escape "<" so the JSON can never close the surrounding <script> tag.
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}
