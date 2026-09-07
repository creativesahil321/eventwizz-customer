/**
 * Resolve a named event from chat (e.g. “Christmas event”, “Diwali bookings”)
 * via GET /vendor/events?search=… then GET /vendor/events/{id}/overview.
 */

import { formatMoneyLocale, parseFormattedMoney } from "@/lib/currency-format";
import { getTenantCurrencySymbol } from "@/lib/tenant-currency";
import { eventsService } from "@/services/vendor/events/events.service";
import type {
  EventItem,
  EventOverviewDateEntry,
  EventOverviewResponse,
} from "@/services/vendor/events/type";
import { useAuthStore } from "@/store/auth.store";
import { useLocationStore } from "@/store/location.store";

const GENERIC_EVENT_WORDS =
  /^(this|that|your|an|a|the|total|active|past|draft|our|my|new|all|next|last|event|events|today|todays|today\s*s|yesterday|yesterdays|yesterday\s*s|tomorrow|tomorrows|tonight|tonights|morning|evening|week|this\s*week|last\s*week|month|this\s*month|last\s*month|year|this\s*year|last\s*year|recent|latest|pending|confirmed|cancelled|partial|paid|customer|customers|booking|bookings)$/i;

const EVENT_NAME_NOISE =
  /\b(bbooking|booking|bookings|revenue|list|pdf|csv|export|earn(ings?|ed)?|income|sales|profit|ben[ei]fit|turnover|money|made|guests?|tickets?|tables?|sold|left|available|overview|stats?|status|performance|how|much|many|we|you|i|did|have|has|was|were|done|get|give|tell|show|me|can|please|what|is|are|in|for|from|on|of|to|a|an|the|our|my|so|far)\b/gi;

const EVENT_METRIC_ASK =
  /\b(bookings?|bbookings?|revenue|earn(ings?|ed)?|income|sales|profit|ben[ei]fits?|turnover|money|guests?|tickets?|tables?|sold|how\s+much|how\s+many|list|pdf|csv|export|overview|stats?|status|performance|done|made)\b/i;

function cleanEventName(raw: string): string {
  return raw
    .replace(EVENT_NAME_NOISE, " ")
    .replace(/[?!.,"']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableEventName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || GENERIC_EVENT_WORDS.test(trimmed)) return false;
  if (
    /^(today|todays|yesterday|yesterdays|tomorrow|tomorrows|tonight|morning|evening|week|month|year|recent|latest|pending|confirmed|partial|partial-payment|partial\s+payment|paid|unpaid|cancelled)(\s+s)?$/i.test(
      trimmed
    )
  ) {
    return false;
  }
  if (trimmed.split(/\s+/).length > 5) return false;
  if (trimmed.length < 2) return false;
  return true;
}

/**
 * Pull a likely event name from natural language.
 * Supports: “Diwali event”, “in our Christmas event”, “Diwali bookings”, “earn from Halloween”.
 */
export function extractEventNameFromChat(text: string): string | null {
  const t = text.trim().replace(/\s+/g, " ");

  // General booking list inquiries (e.g. "give me a list of today's booking", "show all bookings", "list of bookings")
  // should never treat temporal words as event names.
  if (
    /\b(give\s+me\s+(a\s+)?list|list\s+of|show\s+me\s+(the\s+|all\s+)?bookings?|all\s+bookings?|today'?s?\s+bookings?|recent\s+bookings?|pending\s+bookings?)\b/i.test(
      t
    )
  ) {
    // Only extract if an explicit event preposition exists (e.g. "list of bookings for Diwali Party")
    const explicitEvent = t.match(
      /\b(?:for|in|about)\s+(?:the|our|my)?\s*([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,3})(?:\s+events?)?\b/i
    );
    if (explicitEvent?.[1]) {
      const name = cleanEventName(explicitEvent[1]);
      if (isUsableEventName(name)) return name;
    }
    return null;
  }

  // “earn/bookings in/for/from Diwali event”
  const prepEvent = t.match(
    /\b(?:in|for|from|on|about|of)\s+(?:our|my|the)?\s*([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,3})\s+events?\b/i,
  );
  if (prepEvent?.[1]) {
    const name = cleanEventName(prepEvent[1]);
    if (isUsableEventName(name)) return name;
  }

  // “our/my/the Diwali event”
  const ourEvent = t.match(
    /\b(?:our|my|the)\s+([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,3})\s+events?\b/i,
  );
  if (ourEvent?.[1]) {
    const name = cleanEventName(ourEvent[1]);
    if (isUsableEventName(name)) return name;
  }

  // “event called/named Diwali”
  const named = t.match(
    /\bevents?\s+(?:called|named)\s+([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,3})\b/i,
  );
  if (named?.[1]) {
    const name = cleanEventName(named[1]);
    if (isUsableEventName(name)) return name;
  }

  // “… Diwali Event” (1–3 tokens before event)
  const beforeEvent = t.match(
    /\b([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,2})\s+events?\b/i,
  );
  if (beforeEvent?.[1]) {
    const name = cleanEventName(beforeEvent[1]);
    if (isUsableEventName(name)) return name;
  }

  // “Diwali bookings / Halloween revenue / Christmas guests”
  const nameThenMetric = t.match(
    /\b([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,2})\s+(?:bookings?|bbookings?|revenue|earn(ings?|ed)?|income|sales|guests?|tickets?|tables?|stats?|overview|performance)\b/i,
  );
  if (nameThenMetric?.[1]) {
    const name = cleanEventName(nameThenMetric[1]);
    if (isUsableEventName(name)) return name;
  }

  // “bookings/revenue for/of Diwali” (no “event” word)
  const metricThenName = t.match(
    /\b(?:bookings?|bbookings?|revenue|earnings?|earned|earn|income|sales|guests?|tickets?|tables?|stats?|made)\s+(?:for|of|on|in|from)\s+(?:our|my|the)?\s*([a-z0-9][\w'’-]*(?:\s+[a-z0-9][\w'’-]*){0,3})\b/i,
  );
  if (metricThenName?.[1]) {
    const name = cleanEventName(metricThenName[1]);
    if (isUsableEventName(name)) return name;
  }

  // Quoted name: “Diwali Event” or 'Halloween'
  const quoted = t.match(/["“']([^"'”]{2,60})["”']/);
  if (quoted?.[1]) {
    const name = cleanEventName(quoted[1].replace(/\bevents?\b/gi, " "));
    if (isUsableEventName(name)) return name;
  }

  return null;
}

/** True when the vendor asks about a specific event’s performance. */
export function isVendorEventOverviewIntent(text: string): boolean {
  const name = extractEventNameFromChat(text);
  if (!name) return false;
  return EVENT_METRIC_ASK.test(text);
}

function money(value: unknown): string {
  const symbol = getTenantCurrencySymbol();
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatMoneyLocale(value, symbol);
  }
  const parsed = parseFormattedMoney(String(value ?? ""), symbol);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  return formatMoneyLocale(amount, symbol);
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function sumTicketsSold(dates: EventOverviewDateEntry[]): number {
  return dates.reduce(
    (sum, d) =>
      sum + (d.tickets?.reduce((s, t) => s + (t.sold ?? 0), 0) ?? 0),
    0,
  );
}

function sumTablesBooked(dates: EventOverviewDateEntry[]): number {
  return dates.reduce((sum, d) => sum + (d.tablesBooked ?? 0), 0);
}

function readOverviewTotals(overview: EventOverviewResponse | null) {
  const info = overview?.event as
    | (EventOverviewResponse["event"] & {
        total_revenue?: string | number;
        total_bookings?: number;
        total_guests?: number;
      })
    | undefined;

  const dates = overview?.data ?? [];
  return {
    name: info?.name,
    status: info?.status,
    bookings: info?.totalBookings ?? info?.total_bookings ?? 0,
    guests: info?.totalGuests ?? info?.total_guests ?? 0,
    revenue: money(info?.totalRevenue ?? info?.total_revenue ?? 0),
    ticketsSold: sumTicketsSold(dates),
    tablesBooked: sumTablesBooked(dates),
    dates,
  };
}

function pickBestEvent(
  events: EventItem[],
  search: string,
): { event: EventItem | null; ambiguous: EventItem[] } {
  const q = search.toLowerCase().trim();
  if (!q || events.length === 0) return { event: null, ambiguous: [] };

  const scored = events
    .map((e) => {
      const name = e.name.toLowerCase().trim();
      let score = 0;
      if (name === q) score = 100;
      else if (name.includes(q)) score = 80;
      else if (q.includes(name) && name.length >= 3) score = 60;
      else if (
        name
          .split(/\s+/)
          .some((w) => w === q || (q.length >= 4 && w.includes(q)))
      )
        score = 50;
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    if (events.length === 1) return { event: events[0], ambiguous: [] };
    return { event: null, ambiguous: events.slice(0, 5) };
  }

  const top = scored[0];
  const ties = scored.filter((x) => x.score === top.score);
  if (ties.length === 1) return { event: top.e, ambiguous: [] };
  return { event: null, ambiguous: ties.map((x) => x.e).slice(0, 5) };
}

function buildMetricFocusedReply(params: {
  greet: string;
  eventName: string;
  userText: string;
  totals: ReturnType<typeof readOverviewTotals>;
}): string {
  const { greet, eventName, userText, totals } = params;
  const t = userText.toLowerCase();
  const bookingLabel = plural(totals.bookings, "booking", "bookings");
  const guestLabel = plural(totals.guests, "guest", "guests");
  const dateCount = totals.dates.length;
  const dateBit =
    dateCount > 0
      ? ` Across **${dateCount}** event ${plural(dateCount, "date", "dates")}.`
      : "";

  if (/\b(tickets?)\b/.test(t)) {
    return `${greet}**${eventName}** has **${totals.ticketsSold}** tickets sold so far (${totals.bookings} ${bookingLabel}, revenue **${totals.revenue}**).${dateBit}`;
  }

  if (/\b(tables?)\b/.test(t) && !/\b(timetable)\b/.test(t)) {
    return `${greet}**${eventName}** has **${totals.tablesBooked}** tables booked so far (${totals.bookings} ${bookingLabel}, revenue **${totals.revenue}**).${dateBit}`;
  }

  if (/\b(guests?|attendees?|people)\b/.test(t)) {
    return `${greet}**${eventName}** has **${totals.guests}** ${guestLabel} expected (${totals.bookings} ${bookingLabel}, revenue **${totals.revenue}**).${dateBit}`;
  }

  if (/\b(status)\b/.test(t)) {
    return `${greet}**${eventName}** is **${totals.status ?? "unknown"}**, with **${totals.bookings}** ${bookingLabel} and **${totals.revenue}** revenue.${dateBit}`;
  }

  if (
    /\b(earn(ings?|ed)?|revenue|income|sales|profit|ben[ei]fits?|turnover|money|how\s+much|made)\b/.test(
      t,
    )
  ) {
    return `${greet}**${eventName}** has earned **${totals.revenue}** so far from **${totals.bookings}** ${bookingLabel} (**${totals.guests}** ${guestLabel}).${dateBit}`;
  }

  if (/\b(bookings?|bbookings?|how\s+many)\b/.test(t)) {
    return `${greet}**${eventName}** currently has **${totals.bookings}** ${bookingLabel}, **${totals.guests}** ${guestLabel}, and **${totals.revenue}** total revenue.${dateBit}`;
  }

  // Default overview snapshot
  return `${greet}**${eventName}**: **${totals.bookings}** ${bookingLabel}, **${totals.guests}** ${guestLabel}, **${totals.ticketsSold}** tickets sold, **${totals.tablesBooked}** tables booked, revenue **${totals.revenue}**.${dateBit}`;
}

export type VendorEventOverviewChatResult = {
  reply: string;
  overviewHref?: string;
  bookingsHref?: string;
};

export async function fetchVendorEventOverviewChatReply(params: {
  userText: string;
  userName?: string | null;
  /** Current venue location — required by GET /vendor/events */
  vendorLocationId?: number | string | null;
}): Promise<VendorEventOverviewChatResult | null> {
  const search = extractEventNameFromChat(params.userText);
  if (!search) return null;

  const greet = params.userName?.trim()
    ? `Hello, ${params.userName.trim()}. `
    : "";

  const vendorLocationId =
    params.vendorLocationId ??
    useLocationStore.getState().getLocationId() ??
    useAuthStore.getState().vendor_location_id ??
    null;

  if (vendorLocationId == null || vendorLocationId === "") {
    return {
      reply: `${greet}I need your current venue location to look up events. Select a location in the header, then ask again.`,
      overviewHref: "/vendor/events",
    };
  }

  let list: EventItem[] = [];
  try {
    const res = await eventsService.getEvents({
      search,
      per_page: 20,
      page: 1,
      vendor_location_id: vendorLocationId,
    });
    list = res?.data ?? [];
  } catch (error) {
    console.error("Chat event search failed:", error);
    return {
      reply: `${greet}I couldn’t look up events matching “${search}” just now. Please try again in a moment.`,
    };
  }

  if (list.length === 0) {
    return {
      reply: `${greet}I couldn’t find an event matching **${search}** at this location. Check the name on [Open Events](/vendor/events) and ask again.`,
      overviewHref: "/vendor/events",
    };
  }

  const { event, ambiguous } = pickBestEvent(list, search);
  if (!event) {
    const names = ambiguous.map((e) => `**${e.name}**`).join(", ");
    return {
      reply: `${greet}I found several events for “${search}”: ${names}. Which one did you mean?`,
      overviewHref: "/vendor/events",
    };
  }

  let overview: EventOverviewResponse | null = null;
  try {
    overview = (await eventsService.getEventOverview(String(event.id), {
      date_status: "all",
      date_per_page: 1000,
      date_page: 1,
    })) as EventOverviewResponse;
  } catch (error) {
    console.error("Chat event overview failed:", error);
    return {
      reply: `${greet}I found **${event.name}**, but couldn’t load its overview. Open [Event overview](/vendor/events/${event.id}/overview) to see bookings.`,
      overviewHref: `/vendor/events/${event.id}/overview`,
    };
  }

  const totals = readOverviewTotals(overview);
  const eventName = totals.name ?? event.name;
  const wantsExport = /\b(pdf|csv|export|list|download)\b/i.test(
    params.userText,
  );

  const overviewHref = `/vendor/events/${event.id}/overview`;
  const bookingsHref = "/vendor/booking-history";

  let reply = buildMetricFocusedReply({
    greet,
    eventName,
    userText: params.userText,
    totals,
  });

  if (wantsExport) {
    reply += ` I can’t attach a PDF or CSV here — export from [Open Bookings](${bookingsHref}), or open [Event overview](${overviewHref}) for the full breakdown.`;
  } else {
    reply += ` Open [Event overview](${overviewHref}) for the full breakdown.`;
  }

  return { reply, overviewHref, bookingsHref };
}
