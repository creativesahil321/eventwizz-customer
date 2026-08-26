import { format, isValid, parseISO } from "date-fns";
import { couponToStripProps } from "@/lib/coupon-strip-props";
import { formatDateCardOfferBadge } from "@/components/public/date-card-offer";
import { pickRoomHighlights } from "@/lib/event-room-chooser-item";
import {
  isPublicEventRoomMode,
  listPublicEventRooms,
  resolvePublicEventActiveSlices,
} from "@/lib/resolve-public-event-room-slices";
import type { EventDetail } from "@/services/common/events/type";
import {
  buildEventBookingHandoffHref,
} from "@/lib/checkout-chat-handoff";
import {
  DEFAULT_CURRENCY_SYMBOL,
  formatMoneyCompact,
  resolveCurrencySymbol,
} from "@/lib/currency-format";

export type ChatBookingTable = {
  id?: number;
  minPersons: number;
  maxPersons: number;
  price?: number;
  remaining?: number;
  total?: number;
};

export type ChatBookingTicket = {
  id?: number;
  title: string;
  price?: number;
  remaining?: number;
  capacity?: number;
};

export type ChatBookingDate = {
  date: string;
  label: string;
  soldOut: boolean;
  fromPrice?: number;
  offer?: string;
  bookingType?: "tickets" | "tables" | "both";
  tables: ChatBookingTable[];
  tickets: ChatBookingTicket[];
};

export type ChatBookingDrink = {
  id: number;
  title: string;
  price?: number;
  availableQuantity?: number;
};

export type ChatBookingRoom = {
  name: string;
  roomId: number;
  disabled: boolean;
  dates: ChatBookingDate[];
  drinks: ChatBookingDrink[];
  packageTitle?: string;
  packageSummary?: string;
  highlights: string[];
  fromPrice?: number;
};

export type ChatEventBookingBrief = {
  title: string;
  href: string;
  locationCity: string;
  locationSlug: string;
  eventSlug: string;
  hasRooms: boolean;
  rooms: ChatBookingRoom[];
  dates: ChatBookingDate[];
  drinks: ChatBookingDrink[];
  currencySymbol: string;
  coupon?: {
    code: string;
    badge?: string;
    headline?: string;
    endsAt?: string;
    percentOff?: number;
  };
};

export type ChatQuickActionDraft = {
  id: string;
  label: string;
  href?: string;
  sendText?: string;
};

export const CHAT_PAY_FULL_ID = "pay-full";
export const CHAT_PAY_DEPOSIT_ID = "pay-deposit";

export function formatChatMoney(
  amount: number | null | undefined,
  symbol?: string,
): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return formatMoneyCompact(amount, resolveCurrencySymbol(symbol));
}

/** `/bolton-abbey/events/christmas-party-8` — not vendor/customer/admin paths. */
export function parsePublicEventPath(
  pathname: string | null | undefined,
): { locationSlug: string; eventSlug: string } | null {
  const path = (pathname || "/").split("?")[0] || "/";
  const match = path.match(/^\/([^/]+)\/events\/([^/]+)\/?$/);
  if (!match) return null;
  const locationSlug = match[1];
  const eventSlug = match[2];
  if (
    locationSlug === "vendor" ||
    locationSlug === "customer" ||
    locationSlug === "admin" ||
    locationSlug === "auth"
  ) {
    return null;
  }
  return { locationSlug, eventSlug };
}

export function formatChatEventDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const parsed = /^\d{4}-\d{2}-\d{2}/.test(trimmed)
    ? parseISO(trimmed.slice(0, 10))
    : new Date(trimmed);
  if (!isValid(parsed)) return trimmed;
  return format(parsed, "EEE d MMM yyyy");
}

function mapTables(raw: unknown): ChatBookingTable[] {
  if (!Array.isArray(raw)) return [];
  const tables: ChatBookingTable[] = [];
  for (const row of raw) {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const minPersons = Number(item.min_persons);
    const maxPersons = Number(item.max_persons);
    const price = Number(item.price);
    const total = Number(item.total_tables);
    const sold = Number(item.sold_tables);
    const id = Number(item.id);
    const remaining =
      Number.isFinite(total) && Number.isFinite(sold)
        ? Math.max(0, total - sold)
        : undefined;
    if (!Number.isFinite(minPersons) && !Number.isFinite(maxPersons)) {
      continue;
    }
    tables.push({
      id: Number.isFinite(id) && id > 0 ? id : undefined,
      minPersons: Number.isFinite(minPersons) ? minPersons : 0,
      maxPersons: Number.isFinite(maxPersons) ? maxPersons : minPersons,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
      remaining,
      total: Number.isFinite(total) ? total : undefined,
    });
  }
  return tables;
}

function mapTickets(raw: unknown): ChatBookingTicket[] {
  if (!Array.isArray(raw)) return [];
  const tickets: ChatBookingTicket[] = [];
  for (const row of raw) {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const title = String(item.title ?? "").trim();
    if (!title) continue;
    const price = Number(item.price);
    const capacity = Number(item.total_capacity);
    const sold = Number(item.sold_tickets);
    const id = Number(item.id);
    const remaining =
      Number.isFinite(capacity) && Number.isFinite(sold)
        ? Math.max(0, capacity - sold)
        : undefined;
    tickets.push({
      id: Number.isFinite(id) && id > 0 ? id : undefined,
      title,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
      remaining,
      capacity: Number.isFinite(capacity) ? capacity : undefined,
    });
  }
  return tickets;
}

function mapDates(
  dates:
    | Array<{
      event_date: string;
      price?: number;
      sold_out?: boolean;
      offer?: Parameters<typeof formatDateCardOfferBadge>[0] | null;
      booking_type?: string;
      tables?: unknown;
      tickets?: unknown;
    }>
    | undefined,
): ChatBookingDate[] {
  if (!Array.isArray(dates)) return [];
  return dates.map((row) => {
    const offerBadge = row.offer
      ? formatDateCardOfferBadge(row.offer) || undefined
      : undefined;
    const price = Number(row.price);
    const bookingType =
      row.booking_type === "tickets" ||
        row.booking_type === "tables" ||
        row.booking_type === "both"
        ? row.booking_type
        : undefined;
    return {
      date: row.event_date,
      label: formatChatEventDate(row.event_date),
      soldOut: row.sold_out === true,
      fromPrice: Number.isFinite(price) && price > 0 ? price : undefined,
      offer: offerBadge || undefined,
      bookingType,
      tables: mapTables(row.tables),
      tickets: mapTickets(row.tickets),
    };
  });
}

function clipChatText(
  value: string | null | undefined,
  max = 160,
): string | undefined {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function lowestDateFromPrice(dates: ChatBookingDate[]): number | undefined {
  const prices = dates
    .map((d) => d.fromPrice)
    .filter((n): n is number => n != null && Number.isFinite(n) && n > 0);
  return prices.length > 0 ? Math.min(...prices) : undefined;
}

function mapDrinks(
  packages:
    | Array<{
      id?: number;
      title?: string;
      price?: string | number;
      available_quantity?: number;
    }>
    | undefined,
): ChatBookingDrink[] {
  if (!Array.isArray(packages)) return [];
  const drinks: ChatBookingDrink[] = [];
  for (const pkg of packages) {
    const title = String(pkg.title ?? "").trim();
    if (!title) continue;
    const id = Number(pkg.id);
    const price = Number(pkg.price);
    const qty = Number(pkg.available_quantity);
    drinks.push({
      id: Number.isFinite(id) && id > 0 ? id : 0,
      title,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
      availableQuantity:
        Number.isFinite(qty) && qty >= 0 ? qty : undefined,
    });
  }
  return drinks;
}

export function listChatDrinks(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatBookingDrink[] {
  if (!brief) return [];
  if (brief.hasRooms) {
    if (roomId != null) {
      return brief.rooms.find((item) => item.roomId === roomId)?.drinks ?? [];
    }
    return brief.rooms.flatMap((item) => item.drinks);
  }
  return brief.drinks;
}

export function formatChatDrinkLabel(
  drink: ChatBookingDrink,
  symbol?: string,
): string {
  const price = formatChatMoney(drink.price, symbol);
  return price ? `${drink.title} · ${price}` : drink.title;
}

export function summarizeEventDetailForChat(
  event: EventDetail,
  options: {
    href: string;
    locationCity?: string;
    locationSlug: string;
    eventSlug: string;
    currencySymbol?: string;
  },
): ChatEventBookingBrief {
  const hasRooms = isPublicEventRoomMode(event);
  const rooms = hasRooms
    ? listPublicEventRooms(event).map((room, index) => {
      const slices = resolvePublicEventActiveSlices(event, index);
      const dates = mapDates(slices.dates);
      const inclusionHighlights = pickRoomHighlights(
        (slices.package_details ?? []).map((detail) => detail.title),
        4,
      );
      const highlights =
        inclusionHighlights.length > 0
          ? inclusionHighlights
          : pickRoomHighlights(
            (slices.packages ?? []).map((pkg) => pkg.title),
            4,
          );
      return {
        name: room.name,
        roomId: room.room_id,
        disabled: room.disabled === true,
        dates,
        drinks: mapDrinks(slices.packages),
        packageTitle: slices.package_title?.trim() || undefined,
        packageSummary: clipChatText(slices.package_description),
        highlights,
        fromPrice: lowestDateFromPrice(dates),
      };
    })
    : [];

  const flat = resolvePublicEventActiveSlices(event, 0);
  const couponSource = event.coupon ?? null;
  const couponProps = couponToStripProps(couponSource);
  const couponType = String(
    couponSource?.value_type ?? couponSource?.discount_type ?? "",
  ).toLowerCase();
  const couponAmount = Number(
    couponSource?.discount_value ?? couponSource?.amount ?? 0,
  );
  const percentOff =
    couponType === "percentage" && Number.isFinite(couponAmount) && couponAmount > 0
      ? couponAmount
      : undefined;

  return {
    title: event.event_name?.trim() || "this event",
    href: options.href,
    currencySymbol: resolveCurrencySymbol(
      options.currencySymbol || DEFAULT_CURRENCY_SYMBOL,
    ),
    locationCity:
      options.locationCity?.trim() ||
      options.locationSlug
        .replace(/-\d+$/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    locationSlug: options.locationSlug,
    eventSlug: options.eventSlug,
    hasRooms,
    rooms,
    dates: hasRooms ? [] : mapDates(flat.dates),
    drinks: hasRooms ? [] : mapDrinks(flat.packages),
    coupon: couponProps?.code
      ? {
        code: couponProps.code,
        badge: couponProps.badge,
        headline: couponProps.headline,
        endsAt:
          couponProps.endsAt == null
            ? undefined
            : typeof couponProps.endsAt === "string"
              ? couponProps.endsAt
              : String(couponProps.endsAt),
        percentOff,
      }
      : undefined,
  };
}

/**
 * Follow-ups (dates, rooms, drinks, group size, coupon, deposit) must go to the
 * concierge with event data — not the canned “open the event page” redirect.
 */
export function isBookingConciergeFollowUp(text: string): boolean {
  const trimmed = text.trim();
  if (/^\d{1,3}$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n >= 1 && n <= 500 && n !== 2025 && n !== 2026 && n !== 2027) {
      return true;
    }
  }
  return /\b(date|dates|available|25th|26th|december|dec\b|room|rooms|hall|space|difference|different|compare|which room|office|snowball|drink|drinks|package|packages|table|tables|ticket|tickets|group|persons?|people|guests?|coupon|discount|promo|code|deposit|pay|payment|checkout|both days|already logg|logged in|book for me|make a booking)\b/i.test(
    text,
  );
}

export function listBookableChatRooms(
  brief: ChatEventBookingBrief | null | undefined,
): ChatBookingRoom[] {
  if (!brief?.hasRooms) return [];
  return brief.rooms.filter((room) => !room.disabled);
}

export function asksRoomDifference(text: string): boolean {
  return /\b(difference|different|differ|compare|what.?s (the difference|in (each|the) rooms?)|tell me about (the )?rooms?)\b/i.test(
    text,
  );
}

export function asksToChangeOrPickRoom(text: string): boolean {
  return /\b(change (the )?room|switch (the )?room|other room|which (room|hall|space))\b/i.test(
    text,
  );
}

export function buildRoomChoiceMarkdown(
  brief: ChatEventBookingBrief | null | undefined,
): string {
  const bookable = listBookableChatRooms(brief);
  if (bookable.length === 0) return "";
  const buttons = bookable
    .map((room) => `[${room.name}](chat:${room.name})`)
    .join(" ");
  const compare =
    bookable.length >= 2
      ? ` [What's the difference?](chat:What's the difference between the rooms?)`
      : "";
  return `${buttons}${compare}`;
}

function shortDateButtonLabel(date: ChatBookingDate): string {
  return date.label.replace(/\s+\d{4}$/, "").trim() || date.label;
}

export function listChatDatesForRoom(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatBookingDate[] {
  if (!brief) return [];
  if (brief.hasRooms) {
    const room =
      roomId != null
        ? brief.rooms.find((item) => item.roomId === roomId)
        : null;
    const pool = room?.dates ?? brief.rooms.flatMap((item) => item.dates);
    return pool.filter((date) => !date.soldOut);
  }
  return brief.dates.filter((date) => !date.soldOut);
}

export function buildDateChoiceMarkdown(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): string {
  return listChatDatesForRoom(brief, roomId)
    .slice(0, 8)
    .map((date) => `[${shortDateButtonLabel(date)}](chat:${date.label})`)
    .join(" ");
}

export function isEventPageBrushOff(text: string): boolean {
  return (
    /\bopen the event page\b/i.test(text) ||
    /\bplease open the event\b/i.test(text) ||
    /\bpick the room you.?d like and then select a date\b/i.test(text) ||
    /\bonce you.?ve chosen a room and date\b/i.test(text)
  );
}

export function isBareEventPageHref(
  href: string | undefined,
  brief: ChatEventBookingBrief | null | undefined,
): boolean {
  if (!href || !brief) return false;
  const [pathWithHash, query = ""] = href.split("?");
  const path = (pathWithHash.split("#")[0] || "").replace(/\/$/, "");
  const eventPath = `/${brief.locationSlug}/events/${brief.eventSlug}`;
  if (path !== eventPath) return false;
  const hash = pathWithHash.split("#")[1] || "";
  if (
    query.includes("pay=") ||
    query.includes("dates=") ||
    query.includes("coupon=") ||
    hash.includes("booking")
  ) {
    return false;
  }
  return true;
}

export function formatChatLocationLabel(
  brief: ChatEventBookingBrief | null | undefined,
): string {
  const city = brief?.locationCity?.trim() ?? "";
  if (city) {
    return city.replace(/\b\w/g, (char) => char.toUpperCase());
  }
  const slug = (brief?.locationSlug ?? "")
    .replace(/-\d+$/, "")
    .replace(/-/g, " ")
    .trim();
  if (!slug) return "";
  return slug.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatEventVenuePhrase(
  brief: ChatEventBookingBrief | null | undefined,
): string {
  const location = formatChatLocationLabel(brief);
  return location ? ` at our **${location}** venue` : "";
}

/** Customer-facing drink name — never show stock unless we are refusing a quantity. */
export function drinkLabelForGuest(raw: string | ChatBookingDrink): string {
  if (typeof raw !== "string") return raw.title;
  return raw.replace(/\s*\([^)]*\)\s*$/, "").trim() || raw.trim();
}

export function buildVisitEventQuickAction(
  brief: ChatEventBookingBrief,
  options?: { roomId?: number | null; dates?: string[] },
): ChatQuickActionDraft {
  const dates = (options?.dates ?? []).map((d) => d.slice(0, 10)).filter(Boolean);
  const href =
    dates.length > 0 || (options?.roomId != null && options.roomId > 0)
      ? buildEventBookingHandoffHref({
        eventHref: brief.href,
        roomId: options?.roomId,
        dates,
      })
      : `${String(brief.href).split("#")[0]}#booking`;
  return {
    id: "visit-event",
    label: `Visit ${brief.title}`,
    href,
  };
}

export function withVisitEventQuickAction<T extends ChatQuickActionDraft>(
  actions: T[],
  brief?: ChatEventBookingBrief | null,
  options?: { roomId?: number | null; dates?: string[] },
): Array<T | ChatQuickActionDraft> {
  if (!brief?.href) return actions;
  const visit = buildVisitEventQuickAction(brief, options);
  const rest = actions.filter((action) => {
    if (action.id === "visit-event") return false;
    if (action.label.replace(/\s+/g, " ").toLowerCase().startsWith("visit ")) {
      return false;
    }
    if (isBareEventPageHref(action.href, brief)) return false;
    return true;
  });
  return [...rest.slice(0, 12), visit];
}

/** Manual booking handoff — only when chat cannot continue. */
export function buildRecoveryQuickActions(
  brief: ChatEventBookingBrief,
  options?: { roomId?: number | null; dates?: string[] },
): ChatQuickActionDraft[] {
  return [buildVisitEventQuickAction(brief, options)];
}

export function isUnsafeChatProviderError(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return /reduce the length|request too large|context length|maximum context|too many tokens|max_completion|rate limit|tokens per |groq|openai|model_|internal server|api error/i.test(
    text,
  );
}

export function buildBookingRecoveryCopy(options: {
  brief: ChatEventBookingBrief;
  userName?: string | null;
}): string {
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const venue = formatEventVenuePhrase(options.brief);
  return `I can’t finish that in chat just now${nameBit}. **${options.brief.title}** is available${venue || ""}.\n\nVisit the event page to pick your room and date there, or tell me the next detail and I’ll continue here.`;
}

export function buildBookingKickoffCopy(options: {
  brief: ChatEventBookingBrief;
  userName?: string | null;
}): string {
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const venue = formatEventVenuePhrase(options.brief);
  const bookable = listBookableChatRooms(options.brief);
  if (bookable.length >= 2) {
    return `Yes${nameBit} — **${options.brief.title}** is available${venue}.\n\nWhich space would you like?`;
  }
  if (bookable.length === 1) {
    return `Yes${nameBit} — **${options.brief.title}** is in **${bookable[0].name}**${venue}.\n\nWhich date would you like?`;
  }
  return `Yes${nameBit} — **${options.brief.title}** is available${venue}.\n\nWhich date would you like?`;
}

export function buildRoomChoiceHostCopy(
  brief: ChatEventBookingBrief,
  guestCount?: number | null,
): string {
  const guestBit =
    guestCount != null ? `I’ve noted **${guestCount} guests**. ` : "";
  const venue = formatEventVenuePhrase(brief);
  const bookable = listBookableChatRooms(brief);
  if (bookable.length >= 2) {
    return `${guestBit}**${brief.title}**${venue} has ${bookable.length} spaces. Which would you like?`;
  }
  if (bookable.length === 1) {
    return `${guestBit}**${brief.title}** is in **${bookable[0].name}**${venue}. Which date would you like?`;
  }
  return `${guestBit}**${brief.title}**${venue}. Which date would you like?`;
}

function formatRoomCompareBlock(
  room: ChatBookingRoom,
  symbol: string,
): string {
  const lines: string[] = [`**${room.name}**`];
  const fromPrice = formatChatMoney(room.fromPrice, symbol);
  const packageBits = [
    fromPrice ? `From ${fromPrice}` : "",
    room.packageTitle?.trim() || "",
  ].filter(Boolean);
  if (packageBits.length) lines.push(`- ${packageBits.join(" · ")}`);
  if (room.highlights.length) {
    lines.push(`- Includes: ${room.highlights.slice(0, 3).join(", ")}`);
  }
  if (room.drinks.length) {
    lines.push(
      `- Drinks: ${room.drinks
        .map((drink) => formatChatDrinkLabel(drink, symbol))
        .join(", ")}`,
    );
  }
  return lines.join("\n");
}

/** Deterministic UK comparison from event data — never invented capacity or vibe. */
export function buildRoomDifferenceCopy(
  brief: ChatEventBookingBrief,
): string {
  const bookable = listBookableChatRooms(brief);
  const venue = formatEventVenuePhrase(brief);
  if (bookable.length === 0) {
    return `There isn’t a bookable room listed for **${brief.title}**${venue} right now.`;
  }
  if (bookable.length === 1) {
    return `**${brief.title}**${venue} has one space.\n\n${formatRoomCompareBlock(bookable[0], brief.currencySymbol)}\n\nTap the room below to continue.`;
  }
  return `**${brief.title}** is available${venue}. Here’s how the spaces compare:\n\n${bookable
    .map((room) => formatRoomCompareBlock(room, brief.currencySymbol))
    .join("\n\n")}\n\nTap a room below to continue.`;
}

export function withGuaranteedRoomChoiceCopy(
  reply: string,
  options: {
    brief?: ChatEventBookingBrief | null;
    roomChosen: boolean;
    userText: string;
    shouldOfferRooms?: boolean;
    guestCount?: number | null;
  },
): string {
  const brief = options.brief;
  const bookable = listBookableChatRooms(brief);
  if (!brief?.hasRooms || bookable.length === 0) return reply;

  if (asksRoomDifference(options.userText) && bookable.length >= 2) {
    return buildRoomDifferenceCopy(brief);
  }

  if (
    isEventPageBrushOff(reply) &&
    !options.roomChosen &&
    bookable.length >= 1
  ) {
    return buildRoomChoiceHostCopy(brief, options.guestCount);
  }

  if (!options.shouldOfferRooms) return reply;
  if (options.roomChosen || bookable.length < 2) return reply;

  const lower = reply.toLowerCase();
  const allNamed = bookable.every((room) =>
    lower.includes(room.name.toLowerCase()),
  );
  if (allNamed) return reply;

  const names = bookable.map((room) => `**${room.name}**`).join(" or ");
  return `${reply.trim()}\n\nWe have ${bookable.length} spaces for this event: ${names}. Tap the one you’d like — or ask what’s different.\n\n${buildRoomChoiceMarkdown(brief)}`;
}

export function buildEventBookingPromptBlock(
  brief: ChatEventBookingBrief | null | undefined,
): string {
  if (!brief) {
    return `
EVENT BOOKING DATA:
- No event detail is loaded for this turn.
- Do not invent dates, rooms, prices, drinks, or coupon codes.
- If they want to book, use LIVE EVENTS links to identify the event, then ask the next booking question.
`;
  }

  const dateLines = (dates: ChatBookingDate[]) =>
    dates.length === 0
      ? "    (no dates listed)"
      : dates
        .map((d) => {
          const bits = [d.label];
          if (d.soldOut) bits.push("SOLD OUT");
          if (d.fromPrice != null) bits.push(`from ${d.fromPrice}`);
          if (d.offer) bits.push(d.offer);
          if (d.bookingType) bits.push(d.bookingType);
          if (d.tables.length > 0) {
            bits.push(
              `tables: ${d.tables
                .map((table) => {
                  const seats = `${table.minPersons}–${table.maxPersons} guests`;
                  const left =
                    table.remaining != null
                      ? `, ${table.remaining} left`
                      : "";
                  const price =
                    table.price != null ? ` @ ${table.price}` : "";
                  return `${seats}${price}${left}`;
                })
                .join("; ")}`,
            );
          }
          if (d.tickets.length > 0) {
            bits.push(
              `tickets: ${d.tickets
                .map((ticket) => {
                  const price =
                    ticket.price != null ? ` @ ${ticket.price}` : "";
                  const left =
                    ticket.remaining != null
                      ? `, ${ticket.remaining} left`
                      : "";
                  return `${ticket.title}${price}${left}`;
                })
                .join("; ")}`,
            );
          }
          return `    - ${bits.join(" · ")}`;
        })
        .join("\n");

  const drinkLines = (drinks: ChatBookingDrink[]) =>
    drinks.length === 0
      ? "    (no drink packages listed for this room)"
      : drinks
          .map((drink) => {
            const price = formatChatMoney(drink.price, brief.currencySymbol);
            return `    - ${drink.title}${price ? ` · ${price}` : ""}`;
          })
          .join("\n");

  const anyDrinks = brief.hasRooms
    ? brief.rooms.some((room) => room.drinks.length > 0)
    : brief.drinks.length > 0;

  const bookableRooms = listBookableChatRooms(brief);
  const roomChoiceButtons = buildRoomChoiceMarkdown(brief);
  const roomsBlock = brief.hasRooms
    ? brief.rooms
      .map((room) => {
        const status = room.disabled ? " (not bookable)" : "";
        const packageBits = [
          room.packageTitle ? `package: ${room.packageTitle}` : "",
          room.packageSummary ? room.packageSummary : "",
          room.highlights.length
            ? `includes: ${room.highlights.join("; ")}`
            : "",
          room.fromPrice != null ? `from ${room.fromPrice}` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        return `- Room: ${room.name}${status} (roomId ${room.roomId})
  About: ${packageBits || "(no extra package copy listed)"}
  Dates:
${dateLines(room.dates)}
  Drinks:
${drinkLines(room.drinks)}`;
      })
      .join("\n")
    : `- Dates:
${dateLines(brief.dates)}
- Drink packages:
${drinkLines(brief.drinks)}`;
  const roomChoiceBlock = brief.hasRooms
    ? `- Bookable rooms (${bookableRooms.length}): ${bookableRooms.map((room) => room.name).join(" · ") || "none"
    }
- ROOM CHOICE BUTTONS (copy these whenever you ask which room, or after explaining the difference):
  ${roomChoiceButtons || "(none bookable)"}
- If they ask how the rooms differ / which is better / what’s in each room: compare ONLY the About / Dates / Drinks facts above. If two rooms share the same drinks or dates, say so. Never invent capacity, table counts, décor, or vibe. Then show the ROOM CHOICE BUTTONS again.`
    : "";

  const couponBlock = brief.coupon
    ? `- Coupon available: code **${brief.coupon.code}**${
        brief.coupon.badge ? ` (${brief.coupon.badge})` : ""
      }${brief.coupon.percentOff != null ? ` · ${brief.coupon.percentOff}% off tables and tickets` : ""}${
        brief.coupon.headline ? ` — ${brief.coupon.headline}` : ""
      }. Offer it LAST, after drinks. Use [Apply ${brief.coupon.code}](chat:please apply ${brief.coupon.code}). Do not send them to Checkout to apply it.`
    : `- No event coupon is listed. Do not invent a code. Date-level offers (if shown on a date above) still apply unless a coupon is used.`;

  return `
EVENT BOOKING DATA (authoritative for this conversation — MUST FOLLOW):
- Event: **${brief.title}** at **${formatChatLocationLabel(brief) || brief.locationCity || brief.locationSlug}**
- Rooms enabled: ${brief.hasRooms ? "yes — you MUST ask which room before dates or drinks" : "no"}
${roomChoiceBlock}
${roomsBlock}
${couponBlock}
- Drinks: ${
    anyDrinks
      ? "listed under each room above with prices. NEVER say drinks are not listed. After they pick a room, offer THAT room’s drink packages with prices. Do not show stock unless they ask for more than is available."
      : "none listed for this event. Only then may you say drinks are not listed."
  }
- Stay in chat. Never send them to the event page, cart, or Checkout unless you cannot continue.
- Ask ONE question per turn. Only show buttons for that question.
- Quote prices. Show a short booking summary before payment.
- Coupon last. Mention which dates have a date-level offer (from the date lines above).
- Pay in full / Pay a table deposit stay in chat (the host UI opens the payment modal). Never use /vendor/checkout links.
- NEVER invent table counts. If they ask for more tables/tickets/drinks than listed remaining, say the available quantity.
- Never invent dates, rooms, drinks, or coupon codes that are not listed above.
`;
}

export function buildBookingConciergeInstructions(isLoggedInCustomer: boolean): string {
  const loginLine = isLoggedInCustomer
    ? `- They are already logged in. NEVER ask them to create an account or log in.`
    : `- Checkout needs a customer account. Only mention [Create account](/auth/register/customer) or [Log in](/auth/login) if they are not signed in and they are ready to pay.`;

  return `
BOOKING CONCIERGE (MUST FOLLOW — THIS IS HOW YOU BOOK WITH THE GUEST):
You are a professional venue host taking a booking in chat. You already have EVENT BOOKING DATA. Stay in chat. Payment is taken in the chat modal — never send them to cart or Checkout.

${loginLine}

Ask ONE question at a time, in this order (skip any step they already answered). Only show buttons for the current question:
1. Location (only if LIVE EVENTS shows more than one city). Always name the city.
2. Room, if rooms are enabled. Offer every bookable room. If they ask the difference, short bullets with package, from-price, inclusions and drink prices — no stock counts, no date dump — then the room buttons again.
3. Date(s) for the chosen room.
4. Party size.
5. Tables, tickets, or both.
6. Drinks for that room, with prices. If they ask for more than available, say the stock figure then.
7. Short summary with prices. Coupon LAST — which dates have a date offer, then Apply CODE.
8. Pay in full / Pay a table deposit (deposit is tables only). Stay in chat.

CHOICE BUTTONS:
- In-chat only: [Label](chat:the exact reply)
- NEVER write /chat: or /chat — there is no slash before chat:
- Do NOT add Visit / event page / Checkout links on a healthy booking turn.
- Visit the event page only if you cannot continue.

TONE:
- Warm, concise, UK English. One short paragraph + the current question’s buttons. Always name the city.
- Quote prices. Do not dump remaining stock, table counts, or “pages”.
- Do NOT send them to the event page, cart, or Checkout.
- Do NOT invent table counts, dates, rooms, drinks, or coupon codes.
`.trim();
}

/** Parse markdown link targets. `/chat:` is a model typo for in-chat `chat:`. */
export function parseMarkdownLinkTarget(
  raw: string,
):
  | { kind: "chat"; sendText: string }
  | { kind: "href"; href: string }
  | null {
  const target = raw.trim();
  if (!target) return null;

  const chatMatch = target.match(/^\/?chat(?::(.*))?$/i);
  if (chatMatch) {
    const payload = chatMatch[1] ?? "";
    let sendText = payload.trim();
    try {
      sendText = decodeURIComponent(payload.replace(/\+/g, " ")).trim();
    } catch {
      sendText = payload.trim();
    }
    if (!sendText) return null;
    return { kind: "chat", sendText };
  }

  if (target.startsWith("/") || /^https?:\/\//i.test(target)) {
    return { kind: "href", href: target };
  }
  return null;
}

/** Hide in-chat choice markdown once those choices are shown as buttons. */
export function stripInChatChoiceMarkdown(content: string): string {
  return content
    .replace(/\[([^\]]+)\]\(\/?chat(?::[^)]*)?\)/gi, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/[ \t]*·[ \t]*·/g, " · ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Pull tappable choices out of an assistant reply (`[Label](/path)` / `[Label](chat:…)`). */
export function extractBookingQuickActions(
  content: string,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [];
  const seen = new Set<string>();
  const pattern =
    /\[([^\]]{1,80})\]\((\/?chat(?::[^)]*)?|https?:\/\/[^)\s]+|\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(content)) !== null) {
    const label = match[1].trim();
    const parsed = parseMarkdownLinkTarget(match[2] ?? "");
    if (!label || !parsed) continue;
    const key =
      parsed.kind === "chat"
        ? `${label}|chat:${parsed.sendText}`
        : `${label}|${parsed.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    index += 1;
    if (parsed.kind === "chat") {
      actions.push({
        id: `chat-choice-${index}`,
        label,
        sendText: parsed.sendText,
      });
    } else {
      actions.push({
        id: `chat-nav-${index}`,
        label,
        href: parsed.href,
      });
    }
    if (actions.length >= 16) break;
  }
  return actions;
}

export function buildRoomChoiceQuickActions(
  brief: ChatEventBookingBrief | null | undefined,
): ChatQuickActionDraft[] {
  const bookable = listBookableChatRooms(brief);
  const actions = bookable.map((room) => ({
    id: `room-${room.roomId}`,
    label: room.name,
    sendText: room.name,
  }));
  if (bookable.length >= 2) {
    actions.push({
      id: "room-compare",
      label: "What's the difference?",
      sendText: "What's the difference between the rooms?",
    });
  }
  return actions;
}

/**
 * Guarantee every bookable room is tappable when the guest still needs to choose.
 * If they ask how rooms differ, keep all room buttons so they can pick after the comparison.
 */
export function withRoomChoiceQuickActions<T extends ChatQuickActionDraft>(
  actions: T[],
  options: {
    brief?: ChatEventBookingBrief | null;
    roomChosen: boolean;
    hasDates: boolean;
    userText: string;
    reply: string;
    isBookingTurn?: boolean;
  },
): Array<T | ChatQuickActionDraft> {
  const brief = options.brief;
  const roomActions = buildRoomChoiceQuickActions(brief);
  if (roomActions.length === 0) return actions;

  const wantsCompare =
    asksRoomDifference(options.userText) ||
    asksRoomDifference(options.reply) ||
    asksToChangeOrPickRoom(options.userText);
  const mentionsRoom =
    /\b(which room|choose.{0,24}room|event space|room (would|do) you|pick (a |your )?room|rooms?:)\b/i.test(
      options.reply,
    ) || /\b(rooms?|halls?)\b/i.test(options.userText);

  if (options.hasDates && options.roomChosen && !wantsCompare) return actions;
  if (options.roomChosen && !wantsCompare) return actions;

  const shouldOffer =
    wantsCompare ||
    mentionsRoom ||
    (!options.roomChosen && options.isBookingTurn !== false);

  if (!shouldOffer) return actions;

  const mergedRoom = roomActions.map(
    (roomAction) =>
      actions.find(
        (action) =>
          action.label.trim().toLowerCase() ===
          roomAction.label.trim().toLowerCase(),
      ) ?? roomAction,
  );
  const rest = actions.filter(
    (action) =>
      !roomActions.some(
        (roomAction) =>
          roomAction.label.trim().toLowerCase() ===
          action.label.trim().toLowerCase(),
      ),
  );
  return [...mergedRoom, ...rest].slice(0, 12);
}

export function buildDateChoiceQuickActions(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatQuickActionDraft[] {
  return listChatDatesForRoom(brief, roomId)
    .slice(0, 8)
    .map((date) => ({
      id: `date-${date.date}`,
      label: shortDateButtonLabel(date),
      sendText: date.label,
    }));
}

export function withDateChoiceQuickActions<T extends ChatQuickActionDraft>(
  actions: T[],
  options: {
    brief?: ChatEventBookingBrief | null;
    roomId?: number | null;
    roomChosen: boolean;
    hasDates: boolean;
    isBookingTurn?: boolean;
  },
): Array<T | ChatQuickActionDraft> {
  const brief = options.brief;
  if (!brief || options.isBookingTurn === false) return actions;
  if (brief.hasRooms && !options.roomChosen) return actions;
  if (options.hasDates) return actions;

  const dateActions = buildDateChoiceQuickActions(brief, options.roomId);
  if (dateActions.length === 0) return actions;

  const merged = dateActions.map(
    (dateAction) =>
      actions.find(
        (action) =>
          action.label.trim().toLowerCase() ===
          dateAction.label.trim().toLowerCase() ||
          action.sendText?.trim().toLowerCase() ===
          dateAction.sendText?.trim().toLowerCase(),
      ) ?? dateAction,
  );
  const rest = actions.filter(
    (action) =>
      !dateActions.some(
        (dateAction) =>
          dateAction.label.trim().toLowerCase() ===
          action.label.trim().toLowerCase() ||
          (dateAction.sendText ?? "").trim().toLowerCase() ===
          (action.sendText ?? "").trim().toLowerCase(),
      ),
  );
  return [...merged, ...rest].slice(0, 12);
}

export function withGuaranteedDateChoiceCopy(
  reply: string,
  options: {
    brief?: ChatEventBookingBrief | null;
    roomId?: number | null;
    roomChosen: boolean;
    hasDates: boolean;
  },
): string {
  const brief = options.brief;
  if (!brief) return reply;
  if (brief.hasRooms && !options.roomChosen) return reply;
  if (options.hasDates) return reply;
  if (isEventPageBrushOff(reply)) {
    const dates = buildDateChoiceMarkdown(brief, options.roomId);
    if (!dates) return reply;
    return `${reply.trim()}\n\nHere are the dates I can book:\n${dates}`;
  }
  const dates = listChatDatesForRoom(brief, options.roomId);
  if (dates.length === 0) return reply;
  const lower = reply.toLowerCase();
  const named = dates.filter((date) =>
    lower.includes(date.label.toLowerCase()) ||
    lower.includes(shortDateButtonLabel(date).toLowerCase()),
  );
  if (named.length >= Math.min(2, dates.length)) return reply;
  return `${reply.trim()}\n\nAvailable dates:\n${buildDateChoiceMarkdown(brief, options.roomId)}`;
}
