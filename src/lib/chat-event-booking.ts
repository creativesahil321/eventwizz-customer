import { format, isValid, parseISO } from "date-fns";
import {
  extractRequestedEventWindow,
  isBroadEventListIntent,
  isBrochureQuestion,
  isEventWindowFollowUp,
  isLiveEventBookingIntent,
  isSwitchLiveEventIntent,
} from "@/lib/chat-live-events";
import type { GuestBookableLink } from "@/lib/chat-live-events";
import { isDisallowedChatSafetyIntent } from "@/lib/chat-safety";
import { couponToStripProps } from "@/lib/coupon-strip-props";
import { formatDateCardOfferBadge } from "@/components/public/date-card-offer";
import { buildEventHeaderDownloadLinks } from "@/lib/event-header-downloads";
import { pickRoomHighlights } from "@/lib/event-room-chooser-item";
import {
  isPublicEventRoomMode,
  listPublicEventRooms,
  resolvePublicEventActiveSlices,
  resolvePublicEventRoomPayloadSlices,
} from "@/lib/resolve-public-event-room-slices";
import type { EventDetail } from "@/services/common/events/type";
import {
  buildEventBookingHandoffHref,
  CHECKOUT_PATH,
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
  roomId?: number;
  roomName?: string;
  /** True after chat loaded table/ticket types from the cart for this date. */
  inventoryLoaded?: boolean;
};

export type ChatDateInventory = {
  tables: ChatBookingTable[];
  tickets: ChatBookingTicket[];
  loaded?: boolean;
};

export type ChatBookingDrink = {
  id: number;
  title: string;
  price?: number;
  availableQuantity?: number;
};

export type ChatBookingMenuItem = {
  title: string;
  description?: string;
};

export type ChatBookingMenu = {
  name: string;
  items: ChatBookingMenuItem[];
};

export type ChatBookingFaq = {
  question: string;
  answer: string;
};

export type ChatBookingScheduleItem = {
  time: string;
  title: string;
};

export type ChatBookingPdf = {
  title: string;
  href: string;
  roomName?: string;
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
  menus: ChatBookingMenu[];
  schedule: ChatBookingScheduleItem[];
  brochures: ChatBookingPdf[];
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
  aboutHeading?: string;
  about?: string;
  menus: ChatBookingMenu[];
  schedule: ChatBookingScheduleItem[];
  faqs: ChatBookingFaq[];
  packageDetails: string[];
  brochures: ChatBookingPdf[];
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
  /** Small secondary line, e.g. the room name under a date. */
  hint?: string;
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

function firstFinite(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function mapTables(raw: unknown): ChatBookingTable[] {
  if (!Array.isArray(raw)) return [];
  const tables: ChatBookingTable[] = [];
  for (const row of raw) {
    const item = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const minPersons = firstFinite(item.min_persons, item.minPersons, item.min);
    const maxPersons = firstFinite(item.max_persons, item.maxPersons, item.max);
    const price = firstFinite(item.price, item.price_per_person, item.pricePerPerson);
    const total = firstFinite(item.total_tables, item.totalTables, item.total);
    const sold = firstFinite(item.sold_tables, item.soldTables, item.sold);
    const available = firstFinite(
      item.available_tables,
      item.availableTables,
      item.maxQuantity,
      item.max_quantity,
    );
    const id = firstFinite(item.id);
    const remaining = Number.isFinite(available)
      ? Math.max(0, available)
      : Number.isFinite(total) && Number.isFinite(sold)
        ? Math.max(0, total - sold)
        : Number.isFinite(total) && total > 0
          ? total
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
    const title = String(item.title ?? item.name ?? "").trim();
    if (!title) continue;
    const price = firstFinite(
      item.price,
      item.price_per_ticket,
      item.pricePerTicket,
    );
    const capacity = firstFinite(
      item.total_capacity,
      item.totalCapacity,
      item.capacity,
    );
    const sold = firstFinite(item.sold_tickets, item.soldTickets, item.sold);
    const available = firstFinite(
      item.available_tickets,
      item.availableTickets,
      item.maxQuantity,
      item.max_quantity,
    );
    const id = firstFinite(item.id);
    const remaining = Number.isFinite(available)
      ? Math.max(0, available)
      : Number.isFinite(capacity) && Number.isFinite(sold)
        ? Math.max(0, capacity - sold)
        : Number.isFinite(capacity) && capacity > 0
          ? capacity
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

function mapDates(dates: unknown): ChatBookingDate[] {
  if (!Array.isArray(dates)) return [];
  return dates.map((row) => {
    const item =
      row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const offerRaw = item.offer;
    const offerBadge =
      offerRaw && typeof offerRaw === "object"
        ? formatDateCardOfferBadge(
            offerRaw as Parameters<typeof formatDateCardOfferBadge>[0],
          ) || undefined
        : undefined;
    const price = firstFinite(item.price);
    const bookingTypeRaw = String(
      item.booking_type ?? item.bookingType ?? "",
    ).trim();
    const bookingType =
      bookingTypeRaw === "tickets" ||
      bookingTypeRaw === "tables" ||
      bookingTypeRaw === "both"
        ? bookingTypeRaw
        : undefined;
    const eventDate = String(
      item.event_date ?? item.eventDate ?? item.date ?? "",
    ).trim();
    const roomName = String(item.room_name ?? item.roomName ?? "").trim();
    const roomIdRaw = firstFinite(item.room_id, item.roomId);
    return {
      date: eventDate,
      label: formatChatEventDate(eventDate),
      soldOut: item.sold_out === true || item.soldOut === true,
      fromPrice: Number.isFinite(price) && price > 0 ? price : undefined,
      offer: offerBadge || undefined,
      bookingType,
      tables: mapTables(item.tables ?? item.table_types ?? item.tableTypes),
      tickets: mapTickets(item.tickets ?? item.ticket_types ?? item.ticketTypes),
      roomName: roomName || undefined,
      roomId:
        Number.isFinite(roomIdRaw) && roomIdRaw !== 0 ? roomIdRaw : undefined,
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

function mapMenus(
  menus:
    | Array<{
        name?: string;
        items?: Array<{ title?: string; description?: string }>;
      }>
    | undefined,
): ChatBookingMenu[] {
  if (!Array.isArray(menus)) return [];
  return menus
    .slice(0, 8)
    .map((section) => ({
      name: String(section.name ?? "").trim() || "Menu",
      items: (section.items ?? [])
        .slice(0, 10)
        .map((item) => ({
          title: String(item.title ?? "").trim(),
          description: clipChatText(item.description, 140),
        }))
        .filter((item) => item.title),
    }))
    .filter((section) => section.items.length > 0);
}

function mapSchedule(
  items: Array<{ time?: string; title?: string }> | undefined,
): ChatBookingScheduleItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 10)
    .map((item) => ({
      time: String(item.time ?? "").trim(),
      title: String(item.title ?? "").trim(),
    }))
    .filter((item) => item.time || item.title);
}

function mapFaqs(
  items: Array<{ question?: string; answer?: string }> | undefined,
): ChatBookingFaq[] {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 8)
    .map((item) => ({
      question: String(item.question ?? "").trim(),
      answer: clipChatText(item.answer, 220) ?? "",
    }))
    .filter((item) => item.question && item.answer);
}

function mapChatPdfs(
  source: {
    brochure_pdf?: unknown;
    brochure_pdf_2?: unknown;
    faq_pdf?: unknown;
  },
  roomName?: string,
): ChatBookingPdf[] {
  return buildEventHeaderDownloadLinks(source).map((item) => ({
    title: item.title,
    href: item.href,
    roomName,
  }));
}

export function listChatBrochures(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatBookingPdf[] {
  if (!brief) return [];
  if (brief.hasRooms) {
    if (roomId != null) {
      const room = brief.rooms.find((item) => item.roomId === roomId);
      if (room?.brochures.length) return room.brochures;
    }
    const seen = new Set<string>();
    const fromRooms: ChatBookingPdf[] = [];
    for (const room of brief.rooms) {
      for (const pdf of room.brochures) {
        if (seen.has(pdf.href)) continue;
        seen.add(pdf.href);
        fromRooms.push({
          ...pdf,
          roomName: pdf.roomName ?? room.name,
        });
      }
    }
    if (fromRooms.length > 0) return fromRooms;
  }
  return brief.brochures;
}

export { isBrochureQuestion };

export const CHAT_EVENT_BROCHURE_ID = "brochure-event";
export const CHAT_EVENT_BROCHURE_SEND = "I want the brochure";

export function listChatEventBrochureFiles(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatBookingPdf[] {
  return listChatBrochures(brief, roomId).filter(
    (pdf) => !/faq/i.test(pdf.title),
  );
}

export function buildEventBrochureQuickAction(
  brief?: ChatEventBookingBrief | null,
  roomId?: number | null,
): ChatQuickActionDraft | null {
  const files = listChatEventBrochureFiles(brief, roomId);
  if (files.length === 0) return null;
  if (files.length === 1) {
    return {
      id: CHAT_EVENT_BROCHURE_ID,
      label: "Event brochure",
      hint: files[0].roomName,
      href: files[0].href,
    };
  }
  return {
    id: CHAT_EVENT_BROCHURE_ID,
    label: "Event brochure",
    sendText: CHAT_EVENT_BROCHURE_SEND,
  };
}

function hasEventBrochureChip(actions: ChatQuickActionDraft[]): boolean {
  return actions.some(
    (action) =>
      action.id === CHAT_EVENT_BROCHURE_ID || /^brochure-\d+$/.test(action.id),
  );
}

export function brochureQuestionWantsAllRooms(text: string): boolean {
  return /\b(both rooms|all rooms|each room|every room|all (the )?spaces|both spaces)\b/i.test(
    text,
  );
}

export function isEventInfoQuestion(text: string): boolean {
  return (
    isBrochureQuestion(text) ||
    /\b(menu|menus|food|starter|starters|mains?|dessert|faq|faqs|frequently asked|schedule|programme|program|about (the |this |our )?event|dress code|what('?s| is) included|what time|tell me about|included in)\b/i.test(
      text,
    )
  );
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

export function formatChatTicketLabel(
  ticket: ChatBookingTicket,
  symbol?: string,
): string {
  const price = formatChatMoney(ticket.price, symbol);
  return price ? `${ticket.title} · ${price}` : ticket.title;
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
  const listedRooms = listPublicEventRooms(event);
  const bookableListed = listedRooms.filter((room) => !room.disabled);
  // Trust is_rooms when the public page is in room mode. If the flag is off,
  // only treat leftover room payloads as rooms when there are two+ bookable
  // spaces — a single named payload is often a flat event, not a room picker.
  const hasRooms =
    (isPublicEventRoomMode(event) && bookableListed.length > 0) ||
    bookableListed.length >= 2;
  const rooms = hasRooms
    ? listedRooms.map((room, index) => {
      const slices = resolvePublicEventRoomPayloadSlices(event, index);
      const dates = mapDates(slices?.dates).map((item) => ({
        ...item,
        roomId: room.room_id,
        roomName: room.name,
      }));
      const inclusionHighlights = pickRoomHighlights(
        (slices?.package_details ?? []).map((detail) => detail.title),
        4,
      );
      const highlights =
        inclusionHighlights.length > 0
          ? inclusionHighlights
          : pickRoomHighlights(
            (slices?.packages ?? []).map((pkg) => pkg.title),
            4,
          );
      return {
        name: room.name,
        roomId: room.room_id,
        disabled: room.disabled === true,
        dates,
        drinks: mapDrinks(slices?.packages),
        packageTitle: slices?.package_title?.trim() || undefined,
        packageSummary: clipChatText(slices?.package_description),
        highlights,
        fromPrice: lowestDateFromPrice(dates),
        menus: mapMenus(slices?.menus),
        schedule: mapSchedule(slices?.event_schedular),
        brochures: mapChatPdfs(
          {
            brochure_pdf: slices?.brochure_pdf,
            brochure_pdf_2: slices?.brochure_pdf_2,
            faq_pdf: event.faq_pdf,
          },
          room.name,
        ),
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
    aboutHeading: clipChatText(event.about_event_heading, 80),
    about: clipChatText(
      [event.about_event_sub_heading, event.about_event_description]
        .filter(Boolean)
        .join(" — "),
      420,
    ),
    menus: hasRooms ? [] : mapMenus(event.menus),
    schedule: hasRooms ? [] : mapSchedule(event.event_schedular),
    faqs: mapFaqs(event.faqs),
    packageDetails: (event.package_details ?? [])
      .map((detail) => String(detail.title ?? "").trim())
      .filter(Boolean)
      .slice(0, 8),
    brochures: mapChatPdfs({
      brochure_pdf: event.brochure_pdf ?? flat.brochure_pdf,
      brochure_pdf_2: event.brochure_pdf_2 ?? flat.brochure_pdf_2,
      faq_pdf: event.faq_pdf,
    }),
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
  if (isDisallowedChatSafetyIntent(text)) return false;
  if (isSwitchLiveEventIntent(text) || /\breschedule\b/i.test(text)) return false;
  const trimmed = text.trim();
  if (/^\d{1,3}$/.test(trimmed)) {
    const n = Number(trimmed);
    if (n >= 1 && n <= 500 && n !== 2025 && n !== 2026 && n !== 2027) {
      return true;
    }
  }
  if (isEventWindowFollowUp(text)) return true;
  return /\b(date|dates|available|25th|26th|december|dec\b|room|rooms|hall|space|difference|different|compare|which room|office|snowball|drink|drinks|package|packages|table|tables|ticket|tickets|group|persons?|people|guests?|coupon|discount|promo|code|deposit|pay|payment|checkout|both days|already logg|logged in|book for me|make a booking|that'?s all|that'?s everything|no more|same as last|no drinks|(and|also|what about)\s+(the\s+)?\d{1,2}(st|nd|rd|th)?)\b/i.test(
    text,
  );
}

/** Hellos and thanks are not a booking request — do not dump dates or Visit event page. */
export function isCasualChatText(text: string): boolean {
  const stripped = text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/[^a-z0-9\s']/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return true;
  return /^(hi+|hii+|hello|hey+|hiya|yo|sup|howdy|hi there|hello there|good (morning|afternoon|evening|night)|how are you|hows it going|how are things|whats up|thanks?( you)?|thank you|cheers|ok(ay)?|cool|great|nice|bye|goodbye|see you)(\s+(there|again|all|everyone|team))?$/i.test(
    stripped,
  );
}

export function shouldOfferChatBookingUi(
  userText: string,
  choices?: {
    dates?: unknown[];
    roomId?: number | null;
    guestCount?: number | null;
    seating?: unknown;
    drinkTitles?: unknown[];
    slots?: unknown[];
    couponApplied?: boolean;
  } | null,
): boolean {
  if (isDisallowedChatSafetyIntent(userText)) return false;
  if (
    choices &&
    ((choices.dates?.length ?? 0) > 0 ||
      (choices.slots?.length ?? 0) > 0 ||
      (choices.drinkTitles?.length ?? 0) > 0 ||
      choices.roomId != null ||
      choices.guestCount != null ||
      Boolean(choices.seating) ||
      Boolean(choices.couponApplied))
  ) {
    return true;
  }
  if (isCasualChatText(userText)) return false;
  if (isLiveEventBookingIntent(userText)) return true;
  if (isBookingConciergeFollowUp(userText)) return true;
  if (asksRoomDifference(userText) || asksToChangeOrPickRoom(userText)) {
    return true;
  }
  return false;
}

/** Drop date dumps / Visit event page the model added to a hello. */
export function stripUnsolicitedBookingOfferCopy(reply: string): string {
  return reply
    .replace(
      /\n+(Available dates:|Here are the dates I can book:)\s*((?:\s*\[[^\]]+\]\(chat:[^)]+\))+)/gi,
      "",
    )
    .replace(/\s*\[Visit event page\]\([^)]+\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

export function shortDateButtonLabel(date: ChatBookingDate): string {
  return date.label.replace(/\s+\d{4}$/, "").trim() || date.label;
}

export function chatDateSlotKey(
  date: Pick<ChatBookingDate, "date" | "roomId">,
): string {
  return `${date.roomId ?? 0}:${date.date.slice(0, 10)}`;
}

export function chatInventoryFromCartBucket(
  bucket: unknown,
): ChatDateInventory {
  const row =
    bucket && typeof bucket === "object"
      ? (bucket as Record<string, unknown>)
      : null;
  return {
    tables: mapTables(row?.tables ?? row?.table_types ?? row?.tableTypes),
    tickets: mapTickets(row?.tickets ?? row?.ticket_types ?? row?.ticketTypes),
    loaded: true,
  };
}

function inferChatBookingType(
  tables: ChatBookingTable[],
  tickets: ChatBookingTicket[],
): ChatBookingDate["bookingType"] {
  if (tables.length > 0 && tickets.length > 0) return "both";
  if (tables.length > 0) return "tables";
  if (tickets.length > 0) return "tickets";
  return undefined;
}

function listAllChatDates(brief: ChatEventBookingBrief): ChatBookingDate[] {
  return brief.hasRooms
    ? brief.rooms.flatMap((room) => room.dates)
    : brief.dates;
}

export function chatDateNeedsInventoryHydrate(date: ChatBookingDate): boolean {
  if (date.inventoryLoaded) return false;
  return date.tables.length === 0 || date.tickets.length === 0;
}

export function withChatDateInventory(
  brief: ChatEventBookingBrief,
  catalogs: Map<string, ChatDateInventory>,
): ChatEventBookingBrief {
  if (catalogs.size === 0) return brief;
  const apply = (date: ChatBookingDate): ChatBookingDate => {
    const catalog = catalogs.get(chatDateSlotKey(date));
    if (!catalog) return date;
    const tables =
      catalog.tables.length > 0 ? catalog.tables : date.tables;
    const tickets =
      catalog.tickets.length > 0 ? catalog.tickets : date.tickets;
    return {
      ...date,
      tables,
      tickets,
      inventoryLoaded:
        catalog.loaded === true || date.inventoryLoaded === true,
      bookingType: date.bookingType ?? inferChatBookingType(tables, tickets),
    };
  };
  return {
    ...brief,
    dates: brief.dates.map(apply),
    rooms: brief.rooms.map((room) => ({
      ...room,
      dates: room.dates.map(apply),
    })),
  };
}

export function mergeChatBriefInventory(
  base: ChatEventBookingBrief,
  previous: ChatEventBookingBrief | null | undefined,
): ChatEventBookingBrief {
  if (!previous || previous.eventSlug !== base.eventSlug) return base;
  const catalogs = new Map<string, ChatDateInventory>();
  for (const date of listAllChatDates(previous)) {
    if (
      !date.inventoryLoaded &&
      date.tables.length === 0 &&
      date.tickets.length === 0
    ) {
      continue;
    }
    catalogs.set(chatDateSlotKey(date), {
      tables: date.tables,
      tickets: date.tickets,
      loaded: true,
    });
  }
  if (catalogs.size === 0) return base;
  return withChatDateInventory(base, catalogs);
}

export function formatChatDateChoiceSendText(date: ChatBookingDate): string {
  return date.roomName ? `${date.roomName} · ${date.label}` : date.label;
}

export function listChatDatesForRoom(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatBookingDate[] {
  if (!brief) return [];
  if (brief.hasRooms) {
    const rooms =
      roomId != null
        ? brief.rooms.filter((item) => item.roomId === roomId)
        : brief.rooms;
    return rooms.flatMap((room) =>
      room.dates
        .filter((date) => !date.soldOut)
        .map((date) => ({
          ...date,
          roomId: date.roomId ?? room.roomId,
          roomName: date.roomName?.trim() || room.name,
        })),
    );
  }
  return brief.dates.filter((date) => !date.soldOut);
}

export function chatDatesShowRooms(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): boolean {
  return listChatDatesForRoom(brief, roomId).some((date) =>
    Boolean(date.roomName?.trim()),
  );
}

export function formatChatDatePickerQuestion(options: {
  brief: ChatEventBookingBrief;
  nameBit?: string;
  roomId?: number | null;
}): string {
  const nameBit = options.nameBit ?? "";
  if (options.roomId != null) {
    return `Which date would you like${nameBit}?`;
  }
  const bookable = listBookableChatRooms(options.brief);
  const namedRooms = [
    ...new Set(
      listChatDatesForRoom(options.brief)
        .map((date) => date.roomName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  if (namedRooms.length >= 2) {
    return `Which date would you like${nameBit}? Each date shows its room — you can add another space after this one.`;
  }
  const singleRoom = bookable[0]?.name ?? namedRooms[0];
  if (singleRoom) {
    return `Which date would you like${nameBit} in **${singleRoom}**?`;
  }
  return `Which date would you like${nameBit}?`;
}

export function buildDateChoiceMarkdown(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): string {
  return formatDateChoiceMarkdown(listChatDatesForRoom(brief, roomId));
}

function formatDateChoiceMarkdown(dates: ChatBookingDate[]): string {
  return dates
    .slice(0, 8)
    .map((date) => {
      const label = date.roomName
        ? `${shortDateButtonLabel(date)} · ${date.roomName}`
        : shortDateButtonLabel(date);
      return `[${label}](chat:${formatChatDateChoiceSendText(date)})`;
    })
    .join(" ");
}

function dateIsoDay(date: ChatBookingDate): string {
  const raw = date.date?.trim() ?? "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = parseISO(raw);
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : raw.slice(0, 10);
}

/** After an event is already open, check this/next weekend against its dates. */
export function buildPinnedEventWindowReply(options: {
  brief: ChatEventBookingBrief;
  userText: string;
  userName?: string | null;
  now?: Date;
}): { content: string } | null {
  const window = extractRequestedEventWindow(options.userText, options.now);
  if (!window) return null;
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const city = options.brief.locationCity?.trim();
  const cityBit = city ? ` in **${city}**` : "";
  const dates = listChatDatesForRoom(options.brief);
  const hits = dates.filter((date) => {
    const iso = dateIsoDay(date);
    return iso >= window.start && iso <= window.end;
  });
  if (hits.length > 0) {
    return {
      content: `Yes${nameBit} — **${options.brief.title}**${cityBit} has dates on **${window.label}**:\n\n${formatDateChoiceMarkdown(hits)}\n\nTap a date and I’ll continue the booking here.`,
    };
  }
  const available = formatDateChoiceMarkdown(dates);
  const fallback = available
    ? `Here are the dates I can book for this event:\n\n${available}`
    : "I don’t have dates loaded for this event just now.";
  return {
    content: `**${options.brief.title}**${cityBit} doesn’t have dates on **${window.label}**${nameBit}. ${fallback}\n\nIf you meant other events that weekend, tell me a city and I’ll list what’s on there.`,
  };
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
    label: "Visit event page",
    href,
  };
}

export const CHAT_EMAIL_UPDATES_SEND = "email me updates";

export function isChatEmailAddress(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text.trim());
}

export function isChatEmailUpdatesText(text: string): boolean {
  const n = text.replace(/\s+/g, " ").trim().toLowerCase();
  return (
    n === CHAT_EMAIL_UPDATES_SEND ||
    n === "subscribe" ||
    /\b(email me updates|join the newsletter|subscribe to (the )?newsletter)\b/i.test(
      text,
    )
  );
}

export function buildGuestBookingGateCopy(options: {
  brief?: ChatEventBookingBrief | null;
  events?: GuestBookableLink[];
  userName?: string | null;
  includeEventLead?: boolean;
  registerHref?: string;
  loginHref?: string;
}): string {
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const registerHref = options.registerHref ?? "/auth/register/customer";
  const loginHref = options.loginHref ?? "/auth/login";
  const fromBrief =
    options.brief?.href
      ? [
          {
            title: options.brief.title,
            href: String(options.brief.href).split("#")[0],
            locationCity: options.brief.locationCity || undefined,
            locationHref: options.brief.locationSlug
              ? `/${options.brief.locationSlug.replace(/^\/+|\/+$/g, "")}`
              : undefined,
          } satisfies GuestBookableLink,
        ]
      : [];
  const events =
    options.events && options.events.length > 0 ? options.events : fromBrief;

  let lead = "";
  if (options.includeEventLead !== false && events.length === 1) {
    const event = events[0];
    const city = event.locationCity ? ` in **${event.locationCity}**` : "";
    const locationLine = event.locationHref
      ? `\n[${event.locationCity || "Location"}](${event.locationHref})`
      : "";
    lead = `**${event.title}** is available${city}.\n\n[${event.title}](${event.href})${locationLine}\n\n`;
  } else if (options.includeEventLead !== false && events.length > 1) {
    lead = `These events are available to book:\n\n${events
      .map((event) => {
        const city = event.locationCity ? ` — ${event.locationCity}` : "";
        return `- [${event.title}${city}](${event.href})`;
      })
      .join("\n")}\n\n`;
  }

  return `${lead}You’re not logged in${nameBit}. [Create account](${registerHref}) or [Log in](${loginHref}) to book.`;
}

export function buildExistingCartBookingGateCopy(options?: {
  userName?: string | null;
}): string {
  const nameBit = options?.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  return `You already have items in Checkout${nameBit}. Open Checkout to remove them, then I can book a new event here.`;
}

export function buildExistingCartBookingGateActions(): ChatQuickActionDraft[] {
  return [
    {
      id: "open-checkout",
      label: "Go to checkout",
      href: CHECKOUT_PATH,
    },
  ];
}

export function buildGuestBookingGateActions(
  brief?: ChatEventBookingBrief | null,
  options?: {
    registerHref?: string;
    loginHref?: string;
    events?: GuestBookableLink[];
  },
): ChatQuickActionDraft[] {
  const fromBrief =
    brief?.href
      ? [
          {
            title: brief.title,
            href: String(brief.href).split("#")[0],
            locationCity: brief.locationCity || undefined,
            locationHref: brief.locationSlug
              ? `/${brief.locationSlug.replace(/^\/+|\/+$/g, "")}`
              : undefined,
          } satisfies GuestBookableLink,
        ]
      : [];
  const events =
    options?.events && options.events.length > 0 ? options.events : fromBrief;

  const eventActions: ChatQuickActionDraft[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (eventActions.length >= 8) break;
    if (!seen.has(event.href)) {
      seen.add(event.href);
      eventActions.push({
        id: `event-${event.href}`,
        label: event.title,
        hint: event.locationCity,
        href: event.href,
      });
    }
    if (
      eventActions.length < 8 &&
      event.locationHref &&
      !seen.has(event.locationHref)
    ) {
      seen.add(event.locationHref);
      eventActions.push({
        id: `location-${event.locationHref}`,
        label: event.locationCity || "Explore location",
        href: event.locationHref,
      });
    }
  }
  return [
    ...eventActions,
    {
      id: "register",
      label: "Create account",
      href: options?.registerHref ?? "/auth/register/customer",
    },
    {
      id: "login",
      label: "Log in",
      href: options?.loginHref ?? "/auth/login",
    },
    {
      id: "newsletter",
      label: "Email me updates",
      sendText: CHAT_EMAIL_UPDATES_SEND,
    },
  ];
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
  const brochure = hasEventBrochureChip(rest)
    ? null
    : buildEventBrochureQuickAction(brief, options?.roomId);
  const cap = Math.max(0, 12 - (brochure ? 1 : 0));
  return [...rest.slice(0, cap), ...(brochure ? [brochure] : []), visit];
}

/** Manual booking handoff — only when chat cannot continue. */
export function buildRecoveryQuickActions(
  brief: ChatEventBookingBrief,
  options?: { roomId?: number | null; dates?: string[] },
): ChatQuickActionDraft[] {
  return withVisitEventQuickAction([], brief, options);
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
  const roomBit =
    listBookableChatRooms(options.brief).length >= 2
      ? "pick your room and date there"
      : "pick your date there";
  return `I can’t finish that in chat just now${nameBit}. **${options.brief.title}** is available${venue || ""}.\n\nVisit the event page to ${roomBit}, or tell me the next detail and I’ll continue here.`;
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
  const here = " I’ll help you book it here.";
  if (bookable.length >= 2) {
    return `Yes${nameBit} — **${options.brief.title}** is available${venue}.${here}\n\n${formatChatDatePickerQuestion({ brief: options.brief })}`;
  }
  if (bookable.length === 1) {
    return `Yes${nameBit} — **${options.brief.title}** is in **${bookable[0].name}**${venue}.${here}\n\nWhich date would you like?`;
  }
  return `Yes${nameBit} — **${options.brief.title}** is available${venue}.${here}\n\nWhich date would you like?`;
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
  if (room.menus.length) {
    const dishes = room.menus
      .flatMap((section) =>
        section.items.slice(0, 2).map((item) => item.title),
      )
      .slice(0, 4);
    if (dishes.length) {
      lines.push(`- Menu: ${dishes.join(", ")}`);
    }
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

function formatMenuSections(menus: ChatBookingMenu[]): string {
  return menus
    .map((section) => {
      const items = section.items
        .map((item) =>
          item.description
            ? `- **${item.title}** — ${item.description}`
            : `- **${item.title}**`,
        )
        .join("\n");
      return `**${section.name}**\n${items}`;
    })
    .join("\n\n");
}

function menusForRoom(
  brief: ChatEventBookingBrief,
  roomId?: number | null,
): ChatBookingMenu[] {
  if (brief.hasRooms) {
    const room =
      roomId != null
        ? brief.rooms.find((item) => item.roomId === roomId)
        : null;
    if (room) return room.menus;
    return [];
  }
  return brief.menus;
}

function formatMenusCopy(
  brief: ChatEventBookingBrief,
  roomId?: number | null,
): string | null {
  if (brief.hasRooms && roomId == null) {
    const blocks = listBookableChatRooms(brief)
      .map((room) => {
        const body = formatMenuSections(room.menus);
        if (!body) {
          const named = room.highlights.filter(Boolean).join(", ");
          return named
            ? `**${room.name}** — ${named}`
            : `**${room.name}** — no dish list is published for this space.`;
        }
        return `**${room.name}**\n${body}`;
      })
      .join("\n\n");
    return blocks
      ? `Here’s what’s on the menus for **${brief.title}**:\n\n${blocks}`
      : null;
  }
  const menus = menusForRoom(brief, roomId);
  const body = formatMenuSections(menus);
  if (body) {
    const roomName =
      roomId != null
        ? brief.rooms.find((room) => room.roomId === roomId)?.name
        : null;
    const where = roomName ? ` in **${roomName}**` : "";
    return `Here’s the menu${where} for **${brief.title}**:\n\n${body}`;
  }
  const highlights =
    roomId != null
      ? brief.rooms.find((room) => room.roomId === roomId)?.highlights
      : brief.packageDetails;
  if (highlights?.length) {
    return `The listed food for **${brief.title}** is: ${highlights.join(", ")}.`;
  }
  return null;
}

function formatFaqsCopy(brief: ChatEventBookingBrief, userText: string): string | null {
  if (!brief.faqs.length) return null;
  const n = userText.toLowerCase();
  const matched = brief.faqs.filter(
    (faq) =>
      n.includes(faq.question.toLowerCase().slice(0, 24)) ||
      faq.question.toLowerCase().split(/\s+/).some((word) => word.length > 4 && n.includes(word)),
  );
  const list = (matched.length > 0 ? matched : brief.faqs).slice(0, 6);
  const body = list
    .map((faq) => `**${faq.question}**\n${faq.answer}`)
    .join("\n\n");
  return `Here are the FAQs for **${brief.title}**:\n\n${body}`;
}

function formatScheduleCopy(
  brief: ChatEventBookingBrief,
  roomId?: number | null,
): string | null {
  const room =
    roomId != null
      ? brief.rooms.find((item) => item.roomId === roomId)
      : null;
  const schedule = room?.schedule?.length
    ? room.schedule
    : brief.hasRooms
      ? listBookableChatRooms(brief).flatMap((item) =>
          item.schedule.map((row) => ({
            ...row,
            title: `${item.name}: ${row.title}`,
          })),
        )
      : brief.schedule;
  if (!schedule.length) return null;
  const lines = schedule
    .map((row) => `- **${row.time}** — ${row.title}`)
    .join("\n");
  return `Here’s the schedule for **${brief.title}**:\n\n${lines}`;
}

function brochureWantsAllDownloads(text: string): boolean {
  return /\b(pdf|pdfs|downloads?|flyer|flier|flayer)\b/i.test(text);
}

function formatBrochureCopy(
  brief: ChatEventBookingBrief,
  pdfs: ChatBookingPdf[],
): string {
  const venue = formatEventVenuePhrase(brief);
  const lines = pdfs
    .map((pdf) => {
      const room = pdf.roomName ? ` · ${pdf.roomName}` : "";
      return `- [${pdf.title}${room}](${pdf.href})`;
    })
    .join("\n");
  const roomBit = pdfs.some((pdf) => pdf.roomName)
    ? " Files are labelled by room."
    : "";
  return `Here’s the brochure for **${brief.title}**${venue}.${roomBit} Tap a file to open the PDF.\n\n${lines}`;
}

function brochureActions(pdfs: ChatBookingPdf[]): ChatQuickActionDraft[] {
  return pdfs.map((pdf, index) => ({
    id: `brochure-${index}`,
    label: pdf.roomName ? `${pdf.title} · ${pdf.roomName}` : pdf.title,
    href: pdf.href,
  }));
}

export function buildEventInfoTurn(options: {
  brief: ChatEventBookingBrief;
  userText: string;
  roomId?: number | null;
}): { content: string; actions: ChatQuickActionDraft[] } | null {
  const { brief, userText, roomId } = options;
  const t = userText.toLowerCase();
  if (isBrochureQuestion(userText)) {
    const all = listChatBrochures(brief, roomId);
    const pdfs = brochureWantsAllDownloads(userText)
      ? all
      : all.filter((pdf) => !/faq/i.test(pdf.title));
    const files = pdfs.length > 0 ? pdfs : all;
    if (files.length > 0) {
      return {
        content: `${formatBrochureCopy(brief, files)}\n\nYou can keep booking here after you’ve had a look.`,
        actions: brochureActions(files),
      };
    }
    return {
      content: `**${brief.title}** doesn’t have a brochure available, I’m afraid. We can keep booking here in chat.`,
      actions: [],
    };
  }
  let content: string | null = null;
  if (/\b(menu|menus|food|starter|starters|mains?|dessert|included in)\b/i.test(t)) {
    content = formatMenusCopy(brief, roomId);
  } else if (/\b(faq|faqs|frequently asked|dress code|what time|cancel|guest)\b/i.test(t)) {
    content = formatFaqsCopy(brief, userText);
  } else if (/\b(schedule|programme|program|what time)\b/i.test(t)) {
    content = formatScheduleCopy(brief, roomId) ?? formatFaqsCopy(brief, userText);
  } else if (/\babout (the |this |our )?event\b/i.test(t) || /^tell me about\b/i.test(t)) {
    content = brief.about
      ? `**${brief.aboutHeading || brief.title}**\n\n${brief.about}`
      : null;
  }
  if (!content) {
    content =
      formatMenusCopy(brief, roomId) ||
      formatFaqsCopy(brief, userText) ||
      formatScheduleCopy(brief, roomId) ||
      (brief.about
        ? `**${brief.aboutHeading || brief.title}**\n\n${brief.about}`
        : null);
  }
  if (!content) return null;
  return {
    content: `${content}\n\nYou can keep booking here, or open the event page to do it yourself.`,
    actions: [buildVisitEventQuickAction(brief, { roomId })],
  };
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
  if (isEventInfoQuestion(options.userText)) return reply;
  if (isCasualChatText(options.userText) && !options.shouldOfferRooms) {
    return reply;
  }

  if (asksRoomDifference(options.userText) && bookable.length >= 2) {
    return buildRoomDifferenceCopy(brief);
  }

  if (
    options.shouldOfferRooms &&
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
  return `${reply.trim()}\n\nWe have ${bookable.length} spaces for this event: ${names}. Tap a room below — or ask what’s different.`;
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
- If they ask what’s on this weekend / next week / in a city, list only matching LIVE EVENTS. If that city is not listed, say so. Never invent weekend dates — ask them to tap an event so you can check.
- If EVENT BOOKING DATA is already loaded and they say “what about this weekend / next weekend”, that is a date check for THIS event — do not dump other events. If those dates are not listed, say so and offer this event’s real dates.
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
${drinkLines(room.drinks)}
  Menu:
${
  room.menus.length
    ? room.menus
        .map(
          (section) =>
            `    - ${section.name}: ${section.items.map((item) => item.title).join("; ")}`,
        )
        .join("\n")
    : "    (no dish list)"
}
  Brochures:
${
  room.brochures.length
    ? room.brochures
        .map((pdf) => `    - [${pdf.title}](${pdf.href})`)
        .join("\n")
    : "    (none listed)"
}
  Schedule:
${
  room.schedule.length
    ? room.schedule
        .map((row) => `    - ${row.time} ${row.title}`.trim())
        .join("\n")
    : "    (none listed)"
}`;
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
- If they ask how the rooms differ / which is better / what’s in each room: compare ONLY the About / Dates / Drinks / Menu facts above. If two rooms share the same drinks or dates, say so. Never invent capacity, table counts, décor, or vibe. Then show the ROOM CHOICE BUTTONS again.
- Do NOT append room buttons when they ask about menus, FAQs, schedule, or about the event — answer those from EVENT INFO below.`
    : "";

  const couponBlock = brief.coupon
    ? `- Coupon available: code **${brief.coupon.code}**${
        brief.coupon.badge ? ` (${brief.coupon.badge})` : ""
      }${brief.coupon.percentOff != null ? ` · ${brief.coupon.percentOff}% off tables and tickets` : ""}${
        brief.coupon.headline ? ` — ${brief.coupon.headline}` : ""
      }. Offer it LAST, after drinks. Use [Apply ${brief.coupon.code}](chat:please apply ${brief.coupon.code}). Do not send them to Checkout to apply it.`
    : `- No event coupon is listed. Do not invent a code. Date-level offers (if shown on a date above) still apply unless a coupon is used.`;

  const infoBlock = `- About: ${brief.about || "(none listed)"}
- Event menus: ${
    brief.menus.length
      ? brief.menus
          .map(
            (section) =>
              `${section.name}: ${section.items.map((item) => item.title).join("; ")}`,
          )
          .join(" | ")
      : brief.hasRooms
        ? "see each room’s Menu above"
        : "(none listed)"
  }
- Schedule: ${
    brief.schedule.length
      ? brief.schedule.map((row) => `${row.time} ${row.title}`.trim()).join("; ")
      : brief.hasRooms
        ? "see each room’s Schedule above"
        : "(none listed)"
  }
- FAQs:
${
  brief.faqs.length
    ? brief.faqs
        .map((faq) => `    - Q: ${faq.question} A: ${faq.answer}`)
        .join("\n")
    : "    (none listed)"
}
- Brochures / PDFs:
${
  listChatBrochures(brief).length
    ? listChatBrochures(brief)
        .map((pdf) => {
          const room = pdf.roomName ? ` · ${pdf.roomName}` : "";
          return `    - [${pdf.title}${room}](${pdf.href})`;
        })
        .join("\n")
    : "    (none listed)"
}
- If they ask about menus, FAQs, schedule, about the event, or the brochure/PDF, answer from this block. NEVER say you do not have the brochure if a URL is listed — give the markdown link. If none are listed, say professionally that this event doesn’t have a brochure and keep booking in chat — do not send them to the event page to look for one.
- Greetings (hi, hello, thanks): greet back only — do not list dates, rooms, or Visit event page until they ask to book.
- They may book in chat or open the event page: [Visit event page](${brief.href})`;

  return `
EVENT BOOKING DATA (authoritative for this conversation — MUST FOLLOW):
- Event: **${brief.title}** at **${formatChatLocationLabel(brief) || brief.locationCity || brief.locationSlug}**
- Rooms enabled: ${brief.hasRooms ? "yes — you MUST ask which room before dates or drinks" : "no — do not mention rooms, halls, or event spaces"}
${roomChoiceBlock}
${roomsBlock}
${couponBlock}
${infoBlock}
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
        : `- They are NOT signed in. If an event is available, give its event page link and the location page link. Then say they’re not logged in and include [Create account](/auth/register/customer) and [Log in](/auth/login). Do not collect dates, guests, drinks, or payment. Do not dump date chips.`;

  return `
BOOKING CONCIERGE (MUST FOLLOW — THIS IS HOW YOU BOOK WITH THE GUEST):
You are a professional venue host taking a booking in chat. You already have EVENT BOOKING DATA. Stay in chat. Payment is taken in the chat modal — never send them to cart or Checkout.

${loginLine}

If they only greet (hi, hello, thanks, ok): greet back in one line. Do not start the booking steps, list dates/rooms, or offer Visit event page until they ask to book or continue a booking already in progress.
If they mention weapons, violence, hacking, or destroying the venue — even in the same sentence as “book” — refuse and do not offer dates.

Ask ONE question at a time, in this order (skip any step they already answered). Only show buttons for the current question:
1. Location (only if LIVE EVENTS shows more than one city). Always name the city.
2. Room, if rooms are enabled. Offer every bookable room. If they ask the difference, short bullets with package, from-price, inclusions and drink prices — no stock counts, no date dump — then the room buttons again.
3. Date(s) for the chosen room.
4. Tables, tickets, or both — only options listed for that date. Skip this if the date is only tables or only tickets.
5. If they chose tables or both: party size (“How many guests will be attending?”) — that number is for tables only — then table types and quantities (min–max guests). Then if they chose both (or tickets, or the date is ticket-only): which ticket type(s) and how many of each. Do **not** split the party into “this many at tables, the rest get tickets”, and do **not** ask how many guests will be attending for tickets. Do not skip to drinks until those are chosen.
6. Drinks for that room, with prices. If they ask for more than available, say the stock figure then.
7. Short summary with prices. Coupon LAST — which dates have a date offer, then Apply CODE.
8. Ask Pay in full or Pay a table deposit when table deposit is enabled. Then ask card / PayPal if more than one method is available. Deposit is tables only. Stay in chat. If they close the payment form, nothing is charged — show the summary again and let them change guests, tables, tickets, or drinks, or pay again.

CHOICE BUTTONS:
- In-chat only: [Label](chat:the exact reply)
- They can book in chat or open the event page themselves: [Visit event page](/{location_slug}/events/{event_slug}) from EVENT BOOKING DATA.
- Event picks: [Event name · City](chat:Book Event name in City). Never repeat “Book now”. At most 6 event buttons. If they asked for a city or category with no match, say so then offer alternatives.
- Only show room/date buttons for the current booking question. Do not repeat the same buttons twice. Do not re-offer rooms when they asked about menus, FAQs, the brochure, or the schedule.
- NEVER write /chat: or /chat — there is no slash before chat:
- Do NOT invent table counts, dates, rooms, drinks, menus, FAQs, or coupon codes.

TONE:
- Warm, concise, UK English. One short paragraph + the current question’s buttons. Always name the city.
- Quote prices. Do not dump remaining stock, table counts, or “pages”.
- They may book in chat or open [Visit event page] from EVENT BOOKING DATA to do it on the website.
- Do NOT invent table counts, dates, rooms, drinks, menus, FAQs, or coupon codes.
`.trim();
}

/** Collapse unicode spaces/apostrophes so “Room 1” and “Room 1” are the same chip. */
export function normalizeChatActionKey(label: string): string {
  return label
    .normalize("NFKC")
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u2011\u2010\u2060]/g, " ")
    .replace(/[’‘‛]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function dedupeChatQuickActions<T extends ChatQuickActionDraft>(
  actions: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const action of actions) {
    const labelKey = normalizeChatActionKey(action.label);
    const identity = action.sendText
      ? `send:${normalizeChatActionKey(action.sendText)}`
      : action.href
        ? `href:${action.href}`
        : `id:${action.id}`;
    if (seen.has(identity)) continue;
    if (!action.sendText && seen.has(labelKey)) continue;
    seen.add(identity);
    if (!action.sendText) seen.add(labelKey);
    out.push(action);
  }
  return out;
}
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
    .replace(/[ \t]+—[ \t]*$/gm, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]*-[ \t]*$/gm, "")
    .replace(/[ \t]*·[ \t]*·/g, " · ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const GENERIC_CHAT_BOOK_LABELS = new Set([
  "book now",
  "book",
  "book it",
  "book this",
]);

/** `Book Corporate Event in Bristol` — not `Book in Bristol`. */
export function parseBookEventInCitySendText(
  sendText?: string | null,
): { title: string; city: string } | null {
  if (!sendText) return null;
  const match = sendText.trim().match(/^book\s+(.+?)\s+in\s+(.+)$/i);
  if (!match) return null;
  const title = match[1].trim();
  const city = match[2].trim();
  if (!title || !city || /^in$/i.test(title)) return null;
  if (/^(an?\s+)?events?$/i.test(title)) return null;
  return { title, city };
}

/** True when the guest asked for a brochure, then tapped an event chip. */
export function shouldSendBrochureForEventPick(
  userText: string,
  messages: Array<{ role: string; content: string }>,
): boolean {
  if (!parseBookEventInCitySendText(userText)) return false;
  const recent = messages
    .filter((message) => message.role === "user")
    .slice(-4);
  if (!recent.some((message) => isBrochureQuestion(message.content))) {
    return false;
  }
  const last = recent[recent.length - 1];
  return Boolean(
    last &&
      (isBrochureQuestion(last.content) ||
        isBroadEventListIntent(last.content)),
  );
}

function eventPickHint(
  originalLabel: string,
  pick: { title: string; city: string },
  existingHint?: string,
): string {
  const parts = originalLabel
    .split(" · ")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const key = normalizeChatActionKey(part);
      return (
        key !== normalizeChatActionKey(pick.title) &&
        key !== normalizeChatActionKey(pick.city)
      );
    });
  if (existingHint) {
    const hintKey = normalizeChatActionKey(existingHint);
    if (!parts.some((part) => normalizeChatActionKey(part) === hintKey)) {
      parts.push(existingHint);
    }
  }
  if (
    pick.city &&
    !parts.some(
      (part) => normalizeChatActionKey(part) === normalizeChatActionKey(pick.city),
    )
  ) {
    parts.push(pick.city);
  }
  return parts.join(" · ") || pick.city;
}

/**
 * Identical “Book now” chips are unusable. Event picks get a unique title
 * plus the city as a hint so guests can tell them apart.
 */
export function decorateChatEventPickActions<T extends ChatQuickActionDraft>(
  actions: T[],
): T[] {
  const parsed = actions.map((action, index) => ({
    action,
    pick: parseBookEventInCitySendText(action.sendText),
    index,
  }));

  return parsed.map((item) => {
    if (!item.pick) {
      const generic = GENERIC_CHAT_BOOK_LABELS.has(
        normalizeChatActionKey(item.action.label),
      );
      if (generic) {
        return {
          ...item.action,
          label: item.action.sendText?.trim() || item.action.label,
        };
      }
      return item.action;
    }
    return {
      ...item.action,
      id: `event-pick-${item.index + 1}`,
      label: item.pick.title,
      hint: eventPickHint(item.action.label, item.pick, item.action.hint),
    };
  });
}

/** Pull tappable choices out of an assistant reply (`[Label](/path)` / `[Label](chat:…)`). */
export function extractBookingQuickActions(
  content: string,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [];
  const seen = new Set<string>();
  const pattern =
    /\[([^\]]{1,120})\]\((\/?chat(?::[^)]*)?|https?:\/\/[^)\s]+|\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(content)) !== null) {
    const label = match[1].trim();
    const parsed = parseMarkdownLinkTarget(match[2] ?? "");
    if (!label || !parsed) continue;
    const key =
      parsed.kind === "chat"
        ? `chat:${normalizeChatActionKey(parsed.sendText)}`
        : `${normalizeChatActionKey(label)}|${parsed.href}`;
    if (seen.has(key)) continue;
    if (parsed.kind !== "chat" && seen.has(normalizeChatActionKey(label))) {
      continue;
    }
    seen.add(key);
    if (parsed.kind !== "chat") seen.add(normalizeChatActionKey(label));
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
  return decorateChatEventPickActions(actions);
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
  if (isEventInfoQuestion(options.userText) && !wantsCompare) {
    return actions;
  }
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
          normalizeChatActionKey(action.label) ===
          normalizeChatActionKey(roomAction.label),
      ) ?? roomAction,
  );
  const rest = actions.filter(
    (action) =>
      !roomActions.some(
        (roomAction) =>
          normalizeChatActionKey(roomAction.label) ===
          normalizeChatActionKey(action.label),
      ),
  );
  return dedupeChatQuickActions([...mergedRoom, ...rest]).slice(0, 12);
}

export function buildDateChoiceQuickActions(
  brief: ChatEventBookingBrief | null | undefined,
  roomId?: number | null,
): ChatQuickActionDraft[] {
  return listChatDatesForRoom(brief, roomId)
    .slice(0, 12)
    .map((date) => ({
      id: `date-${date.roomId ?? "event"}-${date.date.slice(0, 10)}`,
      label: shortDateButtonLabel(date),
      hint: date.roomName?.trim() || undefined,
      sendText: formatChatDateChoiceSendText(date),
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
  if (options.hasDates) return actions;

  const dateActions = buildDateChoiceQuickActions(brief, options.roomId);
  if (dateActions.length === 0) return actions;

  const merged = dateActions.map(
    (dateAction) =>
      actions.find(
        (action) =>
          (dateAction.sendText ?? "").trim().toLowerCase() ===
          (action.sendText ?? "").trim().toLowerCase(),
      ) ?? dateAction,
  );
  const rest = actions.filter(
    (action) =>
      !dateActions.some(
        (dateAction) =>
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
    userText?: string;
    shouldOfferDates?: boolean;
  },
): string {
  const brief = options.brief;
  if (!brief) return reply;
  if (options.hasDates) return reply;
  const offerDates =
    options.shouldOfferDates ??
    (options.userText ? shouldOfferChatBookingUi(options.userText) : true);
  if (!offerDates) return reply;
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
