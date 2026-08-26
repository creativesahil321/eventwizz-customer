import {
  asksRoomDifference,
  asksToChangeOrPickRoom,
  buildBookingKickoffCopy,
  buildDateChoiceQuickActions,
  buildEventInfoTurn,
  buildRoomChoiceHostCopy,
  buildRoomChoiceQuickActions,
  buildRoomDifferenceCopy,
  buildVisitEventQuickAction,
  chatDateSlotKey,
  CHAT_PAY_DEPOSIT_ID,
  CHAT_PAY_FULL_ID,
  formatChatDateChoiceSendText,
  formatChatDrinkLabel,
  formatChatMoney,
  formatChatTicketLabel,
  formatEventVenuePhrase,
  isBookingConciergeFollowUp,
  isCasualChatText,
  isChatEmailAddress,
  isChatEmailUpdatesText,
  isEventInfoQuestion,
  listBookableChatRooms,
  listChatDatesForRoom,
  listChatDrinks,
  type ChatBookingDate,
  type ChatBookingDrink,
  type ChatBookingTable,
  type ChatBookingTicket,
  type ChatEventBookingBrief,
  type ChatQuickActionDraft,
} from "@/lib/chat-event-booking";
import { isLiveEventBookingIntent, normalizeChatBookingQuery } from "@/lib/chat-live-events";
import { isDisallowedChatSafetyIntent } from "@/lib/chat-safety";
import {
  chatTableKey,
  chatTableLabel,
  findTableQuantityForGuests,
  formatChatSeatingPlan,
  planFromTablePicks,
  planSingleTableType,
  recommendedChatTablePlan,
  chatSeatingPlanGuests,
  type ChatSeatingPlanItem,
} from "@/lib/chat-table-plan";

export type ChatBookingSeating = "tables" | "tickets" | "both";

export type ChatBookingSlot = {
  roomId: number | null;
  roomName: string | null;
  date: ChatBookingDate;
  guestCount: number | null;
  seating: ChatBookingSeating | null;
  drinkTitles: string[];
  drinkQuantities: Record<string, number>;
  drinksDone: boolean;
  tableGuestCount: number | null;
  ticketCount: number | null;
  ticketTitles: string[];
  ticketQuantities: Record<string, number>;
  ticketsDone: boolean;
  tableMix: Record<string, number>;
  tablePlan: ChatSeatingPlanItem[];
  tablePlanDone: boolean;
  mixingTables: boolean;
};

export type ChatBookingChoices = {
  roomId: number | null;
  roomName: string | null;
  dates: ChatBookingDate[];
  guestCount: number | null;
  seating: ChatBookingSeating | null;
  drinkTitles: string[];
  drinkQuantities: Record<string, number>;
  couponApplied: boolean;
  couponSkipped: boolean;
  slots: ChatBookingSlot[];
  drinksDone: boolean;
  moreDatesDeclined: boolean;
  pendingRoomId: number | null;
  wantsGuestChange: boolean;
  wantsSeatingChange: boolean;
  pendingDrinkQtyTitle: string | null;
  pendingTicketQtyTitle: string | null;
  awaitingTableGuestCount: boolean;
};

export type ChatHostBookingTurn = {
  content: string;
  actions: ChatQuickActionDraft[];
};

export const CHAT_DRINKS_DONE_SEND = "that's all for drinks";
export const CHAT_NO_DRINKS_SEND = "no drinks for this date";
export const CHAT_DATES_DONE_SEND = "that's everything — continue";
export const CHAT_SAME_AS_LAST_SEND = "same guests and seating as last date";
export const CHAT_CHANGE_GUESTS_SEND = "change guests for this date";
export const CHAT_CHANGE_SEATING_SEND = "change seating for this date";
export const CHAT_USE_TABLE_PLAN_SEND = "use this seating plan";
export const CHAT_MIX_TABLES_SEND = "mix table types";
export const CHAT_TABLE_MIX_DONE_SEND = "that's the table mix";
export const CHAT_ALL_AT_TABLES_SEND = "all guests at tables";
export const CHAT_TYPE_TABLE_GUESTS_SEND = "I'll type how many sit at tables";
export const CHAT_TICKETS_DONE_SEND = "that's all for tickets";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function lastUserTexts(
  messages: Array<{ role: string; content: string }>,
): string[] {
  return messages.filter((m) => m.role === "user").map((m) => m.content);
}

function dateMatchesText(date: ChatBookingDate, text: string): boolean {
  const n = normalize(text);
  const send = normalize(formatChatDateChoiceSendText(date));
  if (send && n === send) return true;
  if (send && n.includes(send)) return true;
  const iso = date.date.slice(0, 10);
  if (iso && n.includes(iso.replace(/-/g, " "))) return true;
  if (iso && text.includes(iso)) return true;
  const label = normalize(date.label);
  if (label && n.includes(label)) return true;
  const compact = label.replace(/\s+/g, " ");
  if (compact && n.includes(compact)) return true;
  const dayMonth = date.label.match(/\d{1,2}\s+\w{3,}/);
  if (dayMonth && n.includes(normalize(dayMonth[0]))) return true;
  return false;
}

function roomMatchesText(
  roomName: string,
  text: string,
): boolean {
  const name = normalize(roomName);
  const n = normalize(text);
  return Boolean(name) && n.includes(name);
}

function matchChatDateChoice(
  text: string,
  dates: ChatBookingDate[],
  pendingRoomId?: number | null,
): ChatBookingDate | null {
  const n = normalize(text);
  const exact = dates.find(
    (date) => normalize(formatChatDateChoiceSendText(date)) === n,
  );
  if (exact) return exact;

  const withRoom = dates.filter((date) => {
    if (!dateMatchesText(date, text)) return false;
    if (!date.roomName) return true;
    return roomMatchesText(date.roomName, text);
  });
  if (withRoom.length === 1) return withRoom[0];

  const pool =
    pendingRoomId != null
      ? dates.filter((date) => date.roomId === pendingRoomId)
      : dates;
  const hits = pool.filter((date) => dateMatchesText(date, text));
  if (hits.length === 1) return hits[0];
  const uniqueIso = new Set(hits.map((date) => date.date.slice(0, 10)));
  if (hits.length > 1 && uniqueIso.size === 1 && pendingRoomId != null) {
    return hits[0];
  }
  return null;
}

function extractGuestCount(text: string): number | null {
  const withWord = [
    ...text.matchAll(/\b(\d{1,3})\s*(?:guests?|people|persons?|pax)\b/gi),
  ];
  if (withWord.length > 0) {
    const n = Number(withWord[withWord.length - 1][1]);
    if (n >= 1 && n <= 500) return n;
  }
  const lone = text.trim().match(/^(\d{1,3})$/);
  if (lone) {
    const n = Number(lone[1]);
    if (n >= 1 && n <= 500 && n !== 2025 && n !== 2026 && n !== 2027) return n;
  }
  return null;
}

function parseDrinkQuantity(
  text: string,
  drink: ChatBookingDrink,
): number | null {
  const n = normalize(text);
  const title = normalize(drink.title);
  if (!title || !n.includes(title)) return null;
  const after = n.match(
    new RegExp(`${title.replace(/ /g, "\\s+")}\\s*(?:x|×)?\\s*(\\d{1,3})`),
  );
  if (after) {
    const qty = Number(after[1]);
    if (qty >= 1 && qty <= 500) return qty;
  }
  const before = n.match(
    new RegExp(`(\\d{1,3})\\s*(?:x|×|of)?\\s*${title.replace(/ /g, "\\s+")}`),
  );
  if (before) {
    const qty = Number(before[1]);
    if (qty >= 1 && qty <= 500) return qty;
  }
  return 1;
}

function drinksMentionedInText(
  text: string,
  drinks: ChatBookingDrink[],
): ChatBookingDrink[] {
  const hits = drinks.filter((drink) => parseDrinkQuantity(text, drink) != null);
  const titles = hits.map((drink) => normalize(drink.title));
  return hits.filter((drink) => {
    const title = normalize(drink.title);
    return !titles.some((other) => other !== title && other.includes(title));
  });
}

function seatingFromText(n: string): ChatBookingSeating | null {
  if (/\bboth\b/.test(n) && /\b(table|ticket)/.test(n)) return "both";
  if (/\btickets?\s+only\b/.test(n) || n === "tickets" || n === "tickets only") {
    return "tickets";
  }
  if (/\btables?\s+only\b/.test(n) || n === "tables" || n === "tables only") {
    return "tables";
  }
  return null;
}

function dateOffersTables(date: ChatBookingDate): boolean {
  return date.tables.some(
    (table) =>
      (table.remaining == null || table.remaining > 0) && table.maxPersons > 0,
  );
}

function dateOffersTickets(date: ChatBookingDate): boolean {
  return date.tickets.length > 0;
}

function slotPickedTicketQty(slot: ChatBookingSlot): number {
  return slot.ticketTitles.reduce(
    (sum, title) => sum + Math.max(0, slot.ticketQuantities[title] ?? 0),
    0,
  );
}

export function resolveSlotTableAndTicketCounts(slot: ChatBookingSlot): {
  tableGuests: number;
  ticketQty: number;
} {
  const guests = slot.guestCount ?? 0;
  const offersTables = dateOffersTables(slot.date);
  const offersTickets = dateOffersTickets(slot.date);
  const pickedTickets =
    slot.ticketTitles.length > 0 ? slotPickedTicketQty(slot) : null;

  if (slot.tablePlan.length > 0) {
    const tableGuests = chatSeatingPlanGuests(slot.tablePlan);
    return {
      tableGuests,
      ticketQty:
        pickedTickets ??
        slot.ticketCount ??
        Math.max(0, guests - tableGuests),
    };
  }

  if (!offersTables || slot.seating === "tickets") {
    return {
      tableGuests: 0,
      ticketQty:
        pickedTickets ?? slot.ticketCount ?? (offersTickets ? guests : 0),
    };
  }
  if (slot.seating === "tables" || !offersTickets) {
    return {
      tableGuests: slot.tableGuestCount ?? guests,
      ticketQty: pickedTickets ?? 0,
    };
  }
  const tableGuests = slot.tableGuestCount ?? guests;
  const ticketQty =
    pickedTickets ??
    slot.ticketCount ??
    (slot.tableGuestCount != null ? Math.max(0, guests - tableGuests) : 0);
  return { tableGuests, ticketQty };
}

function applyInventorySeating(slot: ChatBookingSlot): void {
  const offersTables = dateOffersTables(slot.date);
  const offersTickets = dateOffersTickets(slot.date);
  if (!offersTables && offersTickets) {
    slot.seating = "tickets";
    slot.tableGuestCount = 0;
    slot.ticketCount = slot.guestCount;
    slot.tablePlan = [];
    slot.tablePlanDone = true;
    return;
  }
  if (offersTables && !offersTickets && slot.seating == null && slot.guestCount != null) {
    slot.seating = "tables";
    slot.tableGuestCount = slot.guestCount;
    slot.ticketCount = 0;
  }
}

function isDrinksDoneText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_DRINKS_DONE_SEND) ||
    /\b(that'?s all for drinks|no more drinks|done with drinks|drinks are fine)\b/.test(
      n,
    ) ||
    n === "thats all" ||
    n === "that s all"
  );
}

function isNoDrinksText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_NO_DRINKS_SEND) ||
    /\b(no drinks|skip drinks|without drinks|none for drinks)\b/.test(n)
  );
}

function isTicketsDoneText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_TICKETS_DONE_SEND) ||
    /\b(that'?s all for tickets|no more tickets|done with tickets|tickets are fine)\b/.test(
      n,
    )
  );
}

function typeTicketQtySend(title: string): string {
  return `I'll type the ticket quantity for ${title}`;
}

function parseTypeTicketQtyTitle(
  text: string,
  tickets: ChatBookingTicket[],
): string | null {
  const n = normalize(text);
  const prefix = normalize("I'll type the ticket quantity for");
  if (!n.startsWith(prefix)) return null;
  const rest = n.slice(prefix.length).trim();
  const ticket = tickets.find((item) => normalize(item.title) === rest);
  return ticket?.title ?? null;
}

function parseTicketQuantity(
  text: string,
  ticket: ChatBookingTicket,
): number | null {
  const n = normalize(text);
  const title = normalize(ticket.title);
  if (!title || !n.includes(title)) return null;
  const after = n.match(
    new RegExp(`${title.replace(/ /g, "\\s+")}\\s*(?:x|×)?\\s*(\\d{1,3})`),
  );
  if (after) {
    const qty = Number(after[1]);
    if (qty >= 1 && qty <= 500) return qty;
  }
  const before = n.match(
    new RegExp(`(\\d{1,3})\\s*(?:x|×|of)?\\s*${title.replace(/ /g, "\\s+")}`),
  );
  if (before) {
    const qty = Number(before[1]);
    if (qty >= 1 && qty <= 500) return qty;
  }
  return 1;
}

function ticketsMentionedInText(
  text: string,
  tickets: ChatBookingTicket[],
): ChatBookingTicket[] {
  const n = normalize(text);
  if (seatingFromText(n)) return [];
  const hits = tickets.filter((ticket) => parseTicketQuantity(text, ticket) != null);
  const titles = hits.map((ticket) => normalize(ticket.title));
  return hits.filter((ticket) => {
    const title = normalize(ticket.title);
    return !titles.some((other) => other !== title && other.includes(title));
  });
}

function isDatesDoneText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_DATES_DONE_SEND) ||
    /\b(that'?s everything|no more dates|just this date|continue to (summary|payment)|no other (date|room))\b/.test(
      n,
    )
  );
}

function isSameAsLastText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_SAME_AS_LAST_SEND) ||
    /\b(same as last|keep (the )?same|same guests and seating)\b/.test(n)
  );
}

function isChangeGuestsText(text: string): boolean {
  return normalize(text) === normalize(CHAT_CHANGE_GUESTS_SEND);
}

function isChangeSeatingText(text: string): boolean {
  return normalize(text) === normalize(CHAT_CHANGE_SEATING_SEND);
}

function typeDrinkQtySend(title: string): string {
  return `I'll type the quantity for ${title}`;
}

function drinkQtySend(title: string, qty: number): string {
  return `${qty} × ${title}`;
}

function parseTypeDrinkQtyTitle(
  text: string,
  drinks: ChatBookingDrink[],
): string | null {
  const n = normalize(text);
  const prefix = normalize("I'll type the quantity for");
  if (!n.startsWith(prefix)) return null;
  const rest = n.slice(prefix.length).trim();
  const drink = drinks.find((item) => normalize(item.title) === rest);
  return drink?.title ?? null;
}

function parseTableGuestsAtTables(text: string, guestCount: number): number | null {
  const n = normalize(text);
  if (n === normalize(CHAT_ALL_AT_TABLES_SEND) || n === "all at tables") {
    return guestCount;
  }
  const match = n.match(
    /^(\d{1,3})\s*(?:guests?\s+)?(?:at|on)\s+tables?$/,
  );
  if (match) {
    const qty = Number(match[1]);
    if (qty >= 0 && qty <= guestCount) return qty;
  }
  return null;
}

function parseTableQtyPick(
  text: string,
  tables: ChatBookingTable[],
): { table: ChatBookingTable; quantity: number } | null {
  const n = normalize(text);
  for (const table of tables) {
    const token = `${table.minPersons} ${table.maxPersons}`;
    if (n === `use tables ${token} only`) {
      return { table, quantity: 0 };
    }
    const qtyMatch = n.match(
      new RegExp(`^(\\d{1,3})(?: x)? tables ${token}$`),
    );
    if (qtyMatch) {
      const qty = Number(qtyMatch[1]);
      if (qty >= 1 && qty <= 40) return { table, quantity: qty };
    }
  }
  return null;
}

function emptySlot(date: ChatBookingDate): ChatBookingSlot {
  return {
    roomId: date.roomId ?? null,
    roomName: date.roomName ?? null,
    date,
    guestCount: null,
    seating: null,
    drinkTitles: [],
    drinkQuantities: {},
    drinksDone: false,
    tableGuestCount: null,
    ticketCount: null,
    ticketTitles: [],
    ticketQuantities: {},
    ticketsDone: false,
    tableMix: {},
    tablePlan: [],
    tablePlanDone: false,
    mixingTables: false,
  };
}

function lastAssistantContent(
  messages: Array<{ role: string; content: string }>,
  beforeIndex: number,
): string {
  for (let i = beforeIndex - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "assistant") return messages[i].content;
  }
  return "";
}

/**
 * Read room / dates / party size from the chat so the host can ask the next
 * question and so payment can build a checkout payload.
 */
export function parseChatBookingChoices(
  messages: Array<{ role: string; content: string }>,
  brief: ChatEventBookingBrief | null | undefined,
): ChatBookingChoices {
  const empty: ChatBookingChoices = {
    roomId: null,
    roomName: null,
    dates: [],
    guestCount: null,
    seating: null,
    drinkTitles: [],
    drinkQuantities: {},
    couponApplied: false,
    couponSkipped: false,
    slots: [],
    drinksDone: false,
    moreDatesDeclined: false,
    pendingRoomId: null,
    wantsGuestChange: false,
    wantsSeatingChange: false,
    pendingDrinkQtyTitle: null,
    pendingTicketQtyTitle: null,
    awaitingTableGuestCount: false,
  };
  if (!brief) return empty;

  const datePool = listChatDatesForRoom(brief);
  const bookable = listBookableChatRooms(brief);
  const slotsByKey = new Map<string, ChatBookingSlot>();
  const slotOrder: string[] = [];
  let activeKey: string | null = null;
  let pendingRoomId: number | null = null;
  let pendingRoomName: string | null = null;
  let pendingGuest: number | null = null;
  let pendingSeating: ChatBookingSeating | null = null;
  let moreDatesDeclined = false;
  let wantsGuestChange = false;
  let wantsSeatingChange = false;
  let pendingDrinkQtyTitle: string | null = null;
  let pendingTicketQtyTitle: string | null = null;
  let awaitingTableGuestCount = false;

  const couponCode = brief.coupon?.code ? normalize(brief.coupon.code) : "";
  let couponApplied = false;
  let couponSkipped = false;

  const activateSlot = (date: ChatBookingDate) => {
    const key = chatDateSlotKey(date);
    let slot = slotsByKey.get(key);
    if (!slot) {
      slot = emptySlot(date);
      if (slotOrder.length === 0) {
        slot.guestCount = pendingGuest;
        slot.seating = pendingSeating;
        pendingGuest = null;
        pendingSeating = null;
      }
      slotsByKey.set(key, slot);
      slotOrder.push(key);
    }
    activeKey = key;
    if (date.roomId != null) {
      pendingRoomId = date.roomId;
      pendingRoomName = date.roomName ?? pendingRoomName;
    }
    wantsGuestChange = false;
    wantsSeatingChange = false;
    return slot;
  };

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    const text = message.content;
    if (/i'?ll type the guest number/i.test(text)) continue;

    const n = normalize(text);
    if (couponCode) {
      if (n === couponCode || (/\b(apply|use)\b/.test(n) && n.includes(couponCode))) {
        couponApplied = true;
      }
    }
    if (
      /\b(without (a )?coupon|no coupon|skip (the )?coupon|continue without)\b/i.test(
        text,
      )
    ) {
      couponSkipped = true;
    }

    const assistant = lastAssistantContent(messages, index);
    const askingDrinks =
      /which drinks|any other drinks|no drinks|that'?s all for drinks|how many .+ packages|change a quantity/i.test(
        assistant,
      );
    const askingTickets =
      /which ticket|ticket type|how many .+ tickets|that'?s all for tickets|tickets so far|tickets to choose/i.test(
        assistant,
      );
    const askingMoreDates =
      /another date|another (room|space)|add another/i.test(assistant);
    const askingTableSplit = /sit at tables|at tables\?|how many .+ tables/i.test(
      assistant,
    );
    const askingSeatingPlan = /seating plan|table types|mix table/i.test(
      assistant,
    );

    if (isDatesDoneText(text) && (askingMoreDates || !askingDrinks)) {
      moreDatesDeclined = true;
      continue;
    }

    const pickedDate = matchChatDateChoice(text, datePool, pendingRoomId);
    if (pickedDate) {
      activateSlot(pickedDate);
      continue;
    }

    if (/\b(both rooms|all rooms|every (room|space))\b/i.test(text)) {
      pendingRoomId = null;
      pendingRoomName = null;
      continue;
    }

    if (!asksRoomDifference(text)) {
      const roomHit = bookable.find(
        (room) => n === normalize(room.name),
      );
      if (roomHit) {
        pendingRoomId = roomHit.roomId;
        pendingRoomName = roomHit.name;
        continue;
      }
    }

    const active = activeKey ? slotsByKey.get(activeKey) : null;
    const tables = active?.date.tables ?? [];
    const drinkPool = listChatDrinks(brief, active?.roomId ?? pendingRoomId);
    const ticketPool = active?.date.tickets ?? [];

    const typedTicketTitle = parseTypeTicketQtyTitle(text, ticketPool);
    if (typedTicketTitle) {
      pendingTicketQtyTitle = typedTicketTitle;
      continue;
    }

    if (pendingTicketQtyTitle && active) {
      const qty = extractGuestCount(text);
      if (qty != null) {
        if (!active.ticketTitles.includes(pendingTicketQtyTitle)) {
          active.ticketTitles.push(pendingTicketQtyTitle);
        }
        active.ticketQuantities[pendingTicketQtyTitle] = qty;
        pendingTicketQtyTitle = null;
        continue;
      }
    }

    const typedDrinkTitle = parseTypeDrinkQtyTitle(text, drinkPool);
    if (typedDrinkTitle) {
      pendingDrinkQtyTitle = typedDrinkTitle;
      continue;
    }

    if (pendingDrinkQtyTitle && active) {
      const qty = extractGuestCount(text);
      if (qty != null) {
        if (!active.drinkTitles.includes(pendingDrinkQtyTitle)) {
          active.drinkTitles.push(pendingDrinkQtyTitle);
        }
        active.drinkQuantities[pendingDrinkQtyTitle] = qty;
        pendingDrinkQtyTitle = null;
        continue;
      }
    }

    if (isTicketsDoneText(text) && active && (askingTickets || !askingDrinks)) {
      active.ticketsDone = true;
      continue;
    }

    if (isChangeGuestsText(text) && active) {
      active.guestCount = null;
      if (active.seating == null && slotOrder.length >= 2) {
        const prev = slotsByKey.get(slotOrder[slotOrder.length - 2]);
        if (prev?.seating) active.seating = prev.seating;
      }
      wantsGuestChange = true;
      continue;
    }
    if (isChangeSeatingText(text) && active) {
      active.seating = null;
      active.tablePlanDone = false;
      active.tablePlan = [];
      active.tableMix = {};
      active.tableGuestCount = null;
      active.ticketCount = null;
      active.ticketTitles = [];
      active.ticketQuantities = {};
      active.ticketsDone = false;
      if (active.guestCount == null && slotOrder.length >= 2) {
        const prev = slotsByKey.get(slotOrder[slotOrder.length - 2]);
        if (prev?.guestCount != null) active.guestCount = prev.guestCount;
      }
      wantsSeatingChange = true;
      continue;
    }
    if (isSameAsLastText(text) && active && slotOrder.length >= 2) {
      const prev = slotsByKey.get(slotOrder[slotOrder.length - 2]);
      if (prev) {
        active.guestCount = prev.guestCount;
        active.seating = prev.seating;
        wantsGuestChange = false;
        wantsSeatingChange = false;
      }
      continue;
    }

    if (isNoDrinksText(text) && active) {
      active.drinkTitles = [];
      active.drinkQuantities = {};
      active.drinksDone = true;
      continue;
    }
    if (isDrinksDoneText(text) && active && (askingDrinks || !askingMoreDates)) {
      active.drinksDone = true;
      continue;
    }

    if (active && active.guestCount != null && n === normalize(CHAT_TYPE_TABLE_GUESTS_SEND)) {
      awaitingTableGuestCount = true;
      continue;
    }
    if (active && active.guestCount != null && n === normalize(CHAT_ALL_AT_TABLES_SEND)) {
      active.tableGuestCount = active.guestCount;
      active.ticketCount = 0;
      active.ticketsDone = true;
      awaitingTableGuestCount = false;
      continue;
    }
    if (active && active.guestCount != null) {
      const atTables = parseTableGuestsAtTables(text, active.guestCount);
      if (atTables != null) {
        active.tableGuestCount = atTables;
        active.ticketCount = Math.max(0, active.guestCount - atTables);
        awaitingTableGuestCount = false;
        if (atTables === 0) active.tablePlanDone = true;
        continue;
      }
    }
    if (awaitingTableGuestCount && active && active.guestCount != null) {
      const qty = extractGuestCount(text);
      if (qty != null && qty <= active.guestCount) {
        active.tableGuestCount = qty;
        active.ticketCount = Math.max(0, active.guestCount - qty);
        awaitingTableGuestCount = false;
        continue;
      }
    }

    if (active && n === normalize(CHAT_MIX_TABLES_SEND)) {
      active.tableMix = {};
      active.tablePlanDone = false;
      active.mixingTables = true;
      continue;
    }
    if (active && n === normalize(CHAT_TABLE_MIX_DONE_SEND)) {
      const tableGuests =
        active.tableGuestCount ??
        (active.seating === "tickets" ? 0 : active.guestCount ?? 0);
      const picks = Object.entries(active.tableMix).flatMap(([key, quantity]) => {
        const table = tables.find((item) => chatTableKey(item) === key);
        if (!table || quantity < 1) return [];
        return [{ table, quantity }];
      });
      const plan = planFromTablePicks(picks, tableGuests);
      if (plan) {
        active.tablePlan = plan;
        active.tablePlanDone = true;
        active.mixingTables = false;
      }
      continue;
    }
    if (active && n === normalize(CHAT_USE_TABLE_PLAN_SEND)) {
      const tableGuests =
        active.tableGuestCount ??
        (active.seating === "tickets" ? 0 : active.guestCount ?? 0);
      const plan = recommendedChatTablePlan(tables, tableGuests);
      if (plan) {
        active.tablePlan = plan;
        active.tablePlanDone = true;
        active.mixingTables = false;
      }
      continue;
    }
    const tablePick = active ? parseTableQtyPick(text, tables) : null;
    if (active && tablePick) {
      const tableGuests =
        active.tableGuestCount ??
        (active.seating === "tickets" ? 0 : active.guestCount ?? 0);
      if (tablePick.quantity === 0) {
        const plan = planSingleTableType(tablePick.table, tableGuests);
        if (plan) {
          active.tablePlan = plan;
          active.tablePlanDone = true;
          active.tableMix = {};
          active.mixingTables = false;
        }
      } else {
        active.tableMix = {
          ...active.tableMix,
          [chatTableKey(tablePick.table)]: tablePick.quantity,
        };
        active.mixingTables = true;
        const picks = Object.entries(active.tableMix).flatMap(([key, quantity]) => {
          const table = tables.find((item) => chatTableKey(item) === key);
          if (!table || quantity < 1) return [];
          return [{ table, quantity }];
        });
        const plan = planFromTablePicks(picks, tableGuests);
        if (plan) {
          active.tablePlan = plan;
          active.tablePlanDone = true;
        } else {
          active.tablePlanDone = false;
        }
      }
      continue;
    }

    const guest = extractGuestCount(text);
    if (
      guest != null &&
      !askingTableSplit &&
      !askingSeatingPlan &&
      !askingDrinks &&
      !askingTickets &&
      !pendingTicketQtyTitle
    ) {
      if (active) active.guestCount = guest;
      else pendingGuest = guest;
      wantsGuestChange = false;
    }

    const seating = seatingFromText(n);
    if (seating) {
      if (active) {
        active.seating = seating;
        if (seating === "tickets") {
          active.tablePlanDone = true;
          active.tableGuestCount = 0;
          active.ticketCount = active.guestCount;
          active.ticketsDone = false;
        } else if (seating === "tables" && active.guestCount != null) {
          active.tableGuestCount = active.guestCount;
          active.ticketCount = 0;
          active.ticketsDone = true;
          active.ticketTitles = [];
          active.ticketQuantities = {};
          active.tablePlanDone = false;
        } else if (seating === "both") {
          active.tablePlanDone = false;
          active.ticketsDone = false;
          active.tableGuestCount = null;
          active.ticketCount = null;
        }
      } else pendingSeating = seating;
      wantsSeatingChange = false;
      continue;
    }

    const mentionedTickets = ticketsMentionedInText(text, ticketPool);
    if (mentionedTickets.length > 0 && active) {
      const party = resolveSlotTableAndTicketCounts(active);
      const remainingTickets = Math.max(
        0,
        party.ticketQty - slotPickedTicketQty(active),
      );
      const needed = Math.max(
        1,
        remainingTickets ||
          party.ticketQty ||
          (active.guestCount ?? 1),
      );
      for (const ticket of mentionedTickets) {
        const qty = parseTicketQuantity(text, ticket);
        const nextQty =
          qty != null && qty > 1
            ? qty
            : n === normalize(ticket.title)
              ? needed
              : (qty ?? needed);
        if (!active.ticketTitles.includes(ticket.title)) {
          active.ticketTitles.push(ticket.title);
        }
        active.ticketQuantities[ticket.title] = nextQty;
        pendingTicketQtyTitle = ticket.title;
      }
      continue;
    }

    const mentioned = drinksMentionedInText(text, drinkPool);
    if (mentioned.length > 0 && active) {
      for (const drink of mentioned) {
        const qty = parseDrinkQuantity(text, drink) ?? 1;
        if (!active.drinkTitles.includes(drink.title)) {
          active.drinkTitles.push(drink.title);
        }
        active.drinkQuantities[drink.title] = qty;
        pendingDrinkQtyTitle = drink.title;
      }
    }
  }

  const slots = slotOrder
    .map((key) => slotsByKey.get(key))
    .filter((slot): slot is ChatBookingSlot => slot != null);
  for (const slot of slots) {
    applyInventorySeating(slot);
  }
  const last = slots[slots.length - 1];
  const drinkTitles = last?.drinkTitles ?? [];
  const drinkQuantities = last?.drinkQuantities ?? {};

  return {
    roomId: last?.roomId ?? pendingRoomId,
    roomName: last?.roomName ?? pendingRoomName,
    dates: slots.map((slot) => slot.date),
    guestCount: last?.guestCount ?? pendingGuest,
    seating: last?.seating ?? pendingSeating,
    drinkTitles,
    drinkQuantities,
    couponApplied,
    couponSkipped,
    slots,
    drinksDone: last?.drinksDone ?? false,
    moreDatesDeclined,
    pendingRoomId,
    wantsGuestChange,
    wantsSeatingChange,
    pendingDrinkQtyTitle,
    pendingTicketQtyTitle,
    awaitingTableGuestCount,
  };
}

export function isChatPayIntent(text: string): boolean {
  return /\b(pay in full|pay a table deposit|pay the deposit|pay now)\b/i.test(
    text,
  );
}

export function parseChatPayMode(text: string): "full" | "deposit" | null {
  const n = normalize(text);
  if (/\bpay a table deposit\b/.test(n) || /\bpay the deposit\b/.test(n)) {
    return "deposit";
  }
  if (/\bpay in full\b/.test(n) || n === "pay now") return "full";
  return null;
}

export function isHostBookingUserText(
  text: string,
  brief: ChatEventBookingBrief | null | undefined,
): boolean {
  if (!brief) return false;
  if (isDisallowedChatSafetyIntent(text)) return false;
  const n = normalize(text);
  if (
    asksRoomDifference(text) ||
    asksToChangeOrPickRoom(text) ||
    isLiveEventBookingIntent(text) ||
    isBookingConciergeFollowUp(text) ||
    isChatPayIntent(text) ||
    isEventInfoQuestion(text) ||
    isDrinksDoneText(text) ||
    isNoDrinksText(text) ||
    isTicketsDoneText(text) ||
    isDatesDoneText(text) ||
    isSameAsLastText(text) ||
    isChangeGuestsText(text) ||
    isChangeSeatingText(text) ||
    n === normalize(CHAT_USE_TABLE_PLAN_SEND) ||
    n === normalize(CHAT_MIX_TABLES_SEND) ||
    n === normalize(CHAT_TABLE_MIX_DONE_SEND) ||
    n === normalize(CHAT_ALL_AT_TABLES_SEND) ||
    n === normalize(CHAT_TYPE_TABLE_GUESTS_SEND) ||
    n.startsWith(normalize("I'll type the quantity for")) ||
    n.startsWith(normalize("I'll type the ticket quantity for")) ||
    n === normalize(CHAT_TICKETS_DONE_SEND)
  ) {
    return true;
  }
  if (
    /\b(without (a )?coupon|no coupon|skip (the )?coupon|continue without|apply|i'?ll type|both rooms|all rooms)\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (
    listBookableChatRooms(brief).some((room) =>
      n.includes(normalize(room.name)),
    )
  ) {
    return true;
  }
  if (listChatDatesForRoom(brief).some((date) => dateMatchesText(date, text))) {
    return true;
  }
  if (
    listChatDrinks(brief).some((drink) => n.includes(normalize(drink.title)))
  ) {
    return true;
  }
  if (
    listChatDatesForRoom(brief).some((date) =>
      date.tickets.some((ticket) => n.includes(normalize(ticket.title))),
    )
  ) {
    return true;
  }
  const location = normalize(brief.locationCity || "");
  if (location && n.includes(location)) return true;
  const slugCity = normalize((brief.locationSlug || "").replace(/-/g, " "));
  if (slugCity && n.includes(slugCity)) return true;
  return extractGuestCount(text) != null;
}

/** Logged-out guests must not enter the date/guest/drinks loop. */
export function isGuestBookingConciergeText(
  text: string,
  brief?: ChatEventBookingBrief | null,
): boolean {
  if (isCasualChatText(text) || isChatEmailAddress(text) || isChatEmailUpdatesText(text)) {
    return false;
  }
  if (isEventInfoQuestion(text) && !asksRoomDifference(text)) return false;
  if (isLiveEventBookingIntent(text)) return true;
  if (brief && isHostBookingUserText(text, brief)) return true;
  return /\b(book|booking|reserve)\b/i.test(normalizeChatBookingQuery(text));
}

/** Booking or adding a date in chat — not hellos, menus, or room-compare. */
export function isChatExistingCartBookingIntent(
  text: string,
  brief?: ChatEventBookingBrief | null,
): boolean {
  if (isCasualChatText(text) || isChatEmailAddress(text) || isChatEmailUpdatesText(text)) {
    return false;
  }
  if (isEventInfoQuestion(text) && !isLiveEventBookingIntent(text)) return false;
  if (
    asksRoomDifference(text) &&
    !isLiveEventBookingIntent(text) &&
    !/\b(book|booking|reserve)\b/i.test(normalizeChatBookingQuery(text))
  ) {
    return false;
  }
  if (isLiveEventBookingIntent(text) || isChatPayIntent(text)) return true;
  if (brief && isHostBookingUserText(text, brief)) return true;
  return /\b(book|booking|reserve)\b/i.test(normalizeChatBookingQuery(text));
}

function guestChoiceActions(): ChatQuickActionDraft[] {
  return [
    { id: "guests-40", label: "40 guests", sendText: "40 guests" },
    {
      id: "guests-type",
      label: "I’ll type a number",
      sendText: "I'll type the guest number",
    },
  ];
}

function seatingActions(
  date: ChatBookingDate,
): { prose: string; actions: ChatQuickActionDraft[] } {
  const offersTables = dateOffersTables(date);
  const offersTickets = dateOffersTickets(date);
  if (!offersTables && !offersTickets) {
    return {
      prose:
        "I don’t have table or ticket types listed for this date in chat. Open the event page to pick them, or tell me another date.",
      actions: [],
    };
  }
  if (offersTables && !offersTickets) {
    return {
      prose: "This date is booked by table.",
      actions: [
        { id: "seating-tables", label: "Tables only", sendText: "tables only" },
      ],
    };
  }
  if (offersTickets && !offersTables) {
    return {
      prose: "This date is ticketed — I’ll book tickets for your guests.",
      actions: [
        {
          id: "seating-tickets",
          label: "Tickets only",
          sendText: "tickets only",
        },
      ],
    };
  }
  if (date.bookingType === "tables" && offersTables) {
    return {
      prose: "This date is booked by table.",
      actions: [
        { id: "seating-tables", label: "Tables only", sendText: "tables only" },
      ],
    };
  }
  if (date.bookingType === "tickets" && offersTickets) {
    return {
      prose: "This date is ticketed.",
      actions: [
        {
          id: "seating-tickets",
          label: "Tickets only",
          sendText: "tickets only",
        },
      ],
    };
  }
  return {
    prose: "Would you like tables, tickets, or both?",
    actions: [
      { id: "seating-tables", label: "Tables only", sendText: "tables only" },
      {
        id: "seating-tickets",
        label: "Tickets only",
        sendText: "tickets only",
      },
      {
        id: "seating-both",
        label: "Both",
        sendText: "both tables and tickets",
      },
    ],
  };
}

function seatingLabel(seating: ChatBookingSeating | null): string {
  if (seating === "tables") return "tables";
  if (seating === "tickets") return "tickets";
  if (seating === "both") return "tables and tickets";
  return "your seating";
}

function slotHeading(slot: ChatBookingSlot): string {
  const room = slot.roomName ? ` · ${slot.roomName}` : "";
  return `${slot.date.label}${room}`;
}

function dateOfferLines(
  dates: ChatBookingDate[],
  allDates: ChatBookingDate[],
): string {
  const withOffer = allDates.filter((date) => date.offer && !date.soldOut);
  if (withOffer.length === 0) return "";
  const chosenKeys = new Set(dates.map((date) => chatDateSlotKey(date)));
  const lines = withOffer.map((date) => {
    const chosen = chosenKeys.has(chatDateSlotKey(date)) ? " (your date)" : "";
    const room = date.roomName ? ` · ${date.roomName}` : "";
    return `- **${date.label}${room}** — ${date.offer}${chosen}`;
  });
  return `\n\nDate offers:\n${lines.join("\n")}`;
}

function remainingDateActions(
  brief: ChatEventBookingBrief,
  slots: ChatBookingSlot[],
  pendingRoomId?: number | null,
): ChatQuickActionDraft[] {
  const taken = new Set(slots.map((slot) => chatDateSlotKey(slot.date)));
  return buildDateChoiceQuickActions(brief, pendingRoomId).filter(
    (action) =>
      !listChatDatesForRoom(brief, pendingRoomId).some(
        (date) =>
          formatChatDateChoiceSendText(date) === action.sendText &&
          taken.has(chatDateSlotKey(date)),
      ),
  );
}

function estimateLineTotal(
  choices: ChatBookingChoices,
  brief: ChatEventBookingBrief,
): {
  tableTotal: number;
  ticketTotal: number;
  drinkTotal: number;
  lines: string[];
} {
  const symbol = brief.currencySymbol;
  const lines: string[] = [];
  let tableTotal = 0;
  let ticketTotal = 0;
  let drinkTotal = 0;
  const slots =
    choices.slots.length > 0
      ? choices.slots
      : choices.dates.map((date) => {
          const slot = emptySlot(date);
          slot.guestCount = choices.guestCount;
          slot.seating = choices.seating;
          slot.drinkTitles = choices.drinkTitles;
          slot.drinkQuantities = choices.drinkQuantities;
          slot.drinksDone = choices.drinksDone;
          slot.tableGuestCount = choices.guestCount;
          slot.ticketCount =
            choices.seating === "tickets" ? choices.guestCount : 0;
          slot.ticketsDone = true;
          slot.tablePlanDone = true;
          return slot;
        });

  for (const slot of slots) {
    const date = slot.date;
    const prefix = slots.length > 1 ? `${slotHeading(slot)} — ` : "";
    const { tableGuests, ticketQty } = resolveSlotTableAndTicketCounts(slot);

    if (date && tableGuests > 0 && slot.seating !== "tickets") {
      if (slot.tablePlan.length > 0) {
        for (const item of slot.tablePlan) {
          const seated = item.allocation.reduce((sum, count) => sum + count, 0);
          if (item.price != null) tableTotal += item.price * seated;
          const price = formatChatMoney(item.price, symbol);
          lines.push(
            `- ${prefix}${item.quantity} × ${chatTableLabel(item)}${price ? ` · ${price}/guest` : ""} — ${item.allocation.join(", ")} guests`,
          );
        }
      } else {
        const table = date.tables[0];
        if (table?.price != null) {
          tableTotal += table.price * tableGuests;
          const sizeBit =
            table.maxPersons > 0
              ? ` · seats ${table.minPersons}–${table.maxPersons}`
              : "";
          lines.push(
            `- ${prefix}Tables: ${tableGuests} guests × ${formatChatMoney(table.price, symbol)}${sizeBit}`,
          );
        } else if (date.fromPrice != null) {
          tableTotal += date.fromPrice * tableGuests;
          lines.push(
            `- ${prefix}Tables from ${formatChatMoney(date.fromPrice, symbol)} × ${tableGuests} guests`,
          );
        }
      }
    }

    if (date && ticketQty > 0 && slot.seating !== "tables") {
      if (slot.ticketTitles.length > 0) {
        for (const title of slot.ticketTitles) {
          const ticket = date.tickets.find(
            (item) => normalize(item.title) === normalize(title),
          );
          const qty = slot.ticketQuantities[title] ?? 0;
          if (!ticket || qty < 1) continue;
          if (ticket.price != null) ticketTotal += ticket.price * qty;
          const price = formatChatMoney(ticket.price, symbol);
          lines.push(
            `- ${prefix}Tickets: ${qty} × ${ticket.title}${price ? ` · ${price}` : ""}`,
          );
        }
      } else {
        const ticket = date.tickets[0];
        if (ticket?.price != null) {
          ticketTotal += ticket.price * ticketQty;
          lines.push(
            `- ${prefix}Tickets: ${ticketQty} × ${ticket.title} · ${formatChatMoney(ticket.price, symbol)}`,
          );
        } else if (date.fromPrice != null && slot.seating === "tickets") {
          ticketTotal += date.fromPrice * ticketQty;
          lines.push(
            `- ${prefix}Tickets from ${formatChatMoney(date.fromPrice, symbol)} × ${ticketQty}`,
          );
        }
      }
    }

    const drinks = listChatDrinks(brief, slot.roomId);
    for (const title of slot.drinkTitles) {
      const drink = drinks.find(
        (item) => normalize(item.title) === normalize(title),
      );
      if (!drink) continue;
      const qty = slot.drinkQuantities[title] ?? 1;
      if (drink.price != null) drinkTotal += drink.price * qty;
      const price = formatChatMoney(drink.price, symbol);
      lines.push(
        `- ${prefix}Drinks: ${qty} × ${drink.title}${price ? ` · ${price}` : ""}`,
      );
    }
  }

  return { tableTotal, ticketTotal, drinkTotal, lines };
}

function overstockDrinkTurn(
  brief: ChatEventBookingBrief,
  drink: ChatBookingDrink,
  requested: number,
  roomId?: number | null,
): ChatHostBookingTurn | null {
  const available = drink.availableQuantity;
  if (available == null || requested <= available) return null;
  return {
    content: `We only have **${available}** ${drink.title} available right now — I can’t book ${requested}.\n\nWould you like ${available}, or a different package?`,
    actions: [
      {
        id: `drink-stock-${drink.id || drink.title}`,
        label: `${available} × ${drink.title}`,
        sendText: `${available} ${drink.title}`,
      },
      ...listChatDrinks(brief, roomId)
        .filter((item) => item.title !== drink.title)
        .slice(0, 4)
        .map((item) => ({
          id: `drink-${item.id || item.title}`,
          label: formatChatDrinkLabel(item, brief.currencySymbol),
          sendText: item.title,
        })),
    ],
  };
}

function payActions(
  seating: ChatBookingSeating | null,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [
    { id: CHAT_PAY_FULL_ID, label: "Pay in full" },
  ];
  if (seating !== "tickets") {
    actions.push({
      id: CHAT_PAY_DEPOSIT_ID,
      label: "Pay a table deposit",
    });
  }
  return actions;
}

function couponActions(brief: ChatEventBookingBrief): ChatQuickActionDraft[] {
  if (!brief.coupon?.code) return [];
  return [
    {
      id: "apply-coupon",
      label: `Apply ${brief.coupon.code}`,
      sendText: `please apply ${brief.coupon.code}`,
    },
    {
      id: "skip-coupon",
      label: "Continue without a code",
      sendText: "continue without coupon",
    },
  ];
}

function drinkChoiceActions(
  drinks: ChatBookingDrink[],
  symbol: string,
  selected: string[],
): ChatQuickActionDraft[] {
  const remaining = drinks.filter(
    (drink) =>
      !selected.some((title) => normalize(title) === normalize(drink.title)),
  );
  return remaining.slice(0, 6).map((drink) => ({
    id: `drink-${drink.id || drink.title}`,
    label: formatChatDrinkLabel(drink, symbol),
    sendText: drink.title,
  }));
}

function drinkQuantityActions(
  slot: ChatBookingSlot,
  drinks: ChatBookingDrink[],
  pendingTitle?: string | null,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [];
  const seen = new Set<string>();
  for (const title of slot.drinkTitles) {
    const drink = drinks.find((item) => normalize(item.title) === normalize(title));
    const current = slot.drinkQuantities[title] ?? 1;
    const stock = drink?.availableQuantity;
    const candidates = [2, 3, 5, current + 1].filter(
      (qty) => qty !== current && qty >= 1 && (stock == null || qty <= stock),
    );
    for (const qty of [...new Set(candidates)].slice(0, 2)) {
      const sendText = drinkQtySend(title, qty);
      if (seen.has(sendText)) continue;
      seen.add(sendText);
      actions.push({
        id: `drink-qty-${title}-${qty}`,
        label: `${qty} × ${title}`,
        sendText,
      });
    }
  }
  const typeFor = pendingTitle || slot.drinkTitles[slot.drinkTitles.length - 1];
  const typeAction = typeFor
    ? {
        id: "drink-qty-type",
        label: "I’ll type a quantity",
        sendText: typeDrinkQtySend(typeFor),
      }
    : null;
  return [...actions.slice(0, 5), ...(typeAction ? [typeAction] : [])];
}

function ticketChoiceActions(
  tickets: ChatBookingTicket[],
  symbol: string | undefined,
  selected: string[],
): ChatQuickActionDraft[] {
  const remaining = tickets.filter(
    (ticket) =>
      !selected.some((title) => normalize(title) === normalize(ticket.title)),
  );
  return remaining.slice(0, 6).map((ticket) => ({
    id: `ticket-${ticket.id || ticket.title}`,
    label: formatChatTicketLabel(ticket, symbol),
    sendText: ticket.title,
  }));
}

function ticketQuantityActions(
  slot: ChatBookingSlot,
  tickets: ChatBookingTicket[],
  pendingTitle: string | null,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [];
  const seen = new Set<string>();
  for (const title of slot.ticketTitles) {
    const ticket = tickets.find((item) => normalize(item.title) === normalize(title));
    const current = slot.ticketQuantities[title] ?? 1;
    const stock = ticket?.remaining ?? ticket?.capacity;
    const candidates = [2, 5, 10, current + 5].filter(
      (qty) => qty !== current && qty >= 1 && (stock == null || qty <= stock),
    );
    for (const qty of [...new Set(candidates)].slice(0, 2)) {
      const sendText = `${qty} × ${title}`;
      if (seen.has(sendText)) continue;
      seen.add(sendText);
      actions.push({
        id: `ticket-qty-${title}-${qty}`,
        label: `${qty} × ${title}`,
        sendText,
      });
    }
  }
  const typeFor = pendingTitle || slot.ticketTitles[slot.ticketTitles.length - 1];
  const typeAction = typeFor
    ? {
        id: "ticket-qty-type",
        label: "I’ll type a quantity",
        sendText: typeTicketQtySend(typeFor),
      }
    : null;
  return [...actions.slice(0, 5), ...(typeAction ? [typeAction] : [])];
}

function slotNeedsSeatingPlan(slot: ChatBookingSlot): boolean {
  if (slot.tablePlanDone) return false;
  if (slot.seating === "tickets") return false;
  if (slot.seating !== "tables" && slot.seating !== "both") return false;
  if (!dateOffersTables(slot.date)) return false;
  if (slot.seating === "both" && slot.tableGuestCount == null) return true;
  const tableGuests = slot.tableGuestCount ?? slot.guestCount ?? 0;
  return tableGuests > 0;
}

function slotNeedsTicketPick(slot: ChatBookingSlot): boolean {
  if (slot.seating === "tables") return false;
  if (slot.seating !== "tickets" && slot.seating !== "both") return false;
  if (!dateOffersTickets(slot.date)) return false;
  if (slot.seating === "both" && slot.tableGuestCount == null) return false;
  if (slotNeedsSeatingPlan(slot)) return false;
  const { ticketQty } = resolveSlotTableAndTicketCounts(slot);
  const picked = slotPickedTicketQty(slot);
  if (slot.ticketsDone && (picked > 0 || ticketQty <= 0)) return false;
  return ticketQty > 0 || picked > 0;
}

function buildSummaryTurn(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  userName?: string | null;
  includeCouponAsk: boolean;
}): ChatHostBookingTurn {
  const { brief, choices } = options;
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const venue = formatEventVenuePhrase(brief);
  const symbol = brief.currencySymbol;
  const estimate = estimateLineTotal(choices, brief);
  const subTotal =
    estimate.tableTotal + estimate.ticketTotal + estimate.drinkTotal;
  const discountable = estimate.tableTotal + estimate.ticketTotal;
  const percent = brief.coupon?.percentOff;
  const discount =
    choices.couponApplied && percent != null && discountable > 0
      ? Math.round(((discountable * percent) / 100) * 100) / 100
      : 0;
  const total = Math.max(0, subTotal - discount);
  const slots =
    choices.slots.length > 0
      ? choices.slots
      : choices.dates.map((date) => {
          const slot = emptySlot(date);
          slot.guestCount = choices.guestCount;
          slot.seating = choices.seating;
          slot.drinkTitles = choices.drinkTitles;
          slot.drinkQuantities = choices.drinkQuantities;
          slot.drinksDone = true;
          slot.tableGuestCount = choices.guestCount;
          slot.ticketCount =
            choices.seating === "tickets" ? choices.guestCount : 0;
          slot.ticketsDone = true;
          slot.tablePlanDone = true;
          return slot;
        });

  const slotLines = slots.map((slot) => {
    const drinks =
      slot.drinkTitles.length > 0
        ? slot.drinkTitles
            .map((title) => {
              const qty = slot.drinkQuantities[title] ?? 1;
              return qty > 1 ? `${qty} × ${title}` : title;
            })
            .join(", ")
        : "none";
    const tables =
      slot.tablePlan.length > 0
        ? slot.tablePlan
            .map((item) => `${item.quantity} × ${chatTableLabel(item)}`)
            .join(", ")
        : null;
    const tickets =
      slot.ticketTitles.length > 0
        ? slot.ticketTitles
            .map((title) => {
              const qty = slot.ticketQuantities[title] ?? 1;
              return `${qty} × ${title}`;
            })
            .join(", ")
        : null;
    const extras = [
      tables ? `tables: ${tables}` : null,
      tickets ? `tickets: ${tickets}` : null,
      `drinks: ${drinks}`,
    ]
      .filter(Boolean)
      .join("; ");
    return `- **${slotHeading(slot)}** — ${slot.guestCount ?? "?"} guests (${seatingLabel(slot.seating)}); ${extras}`;
  });

  const offerCopy = dateOfferLines(
    slots.map((slot) => slot.date),
    listChatDatesForRoom(brief, choices.pendingRoomId ?? choices.roomId),
  );

  const moneyLines: string[] = [...estimate.lines];
  if (subTotal > 0) {
    moneyLines.push(`- Subtotal: **${formatChatMoney(subTotal, symbol)}**`);
  }
  if (choices.couponApplied && brief.coupon) {
    const badge =
      percent != null
        ? `${percent}% off tables and tickets`
        : brief.coupon.badge || "tables and tickets";
    moneyLines.push(`- Coupon applied: **${brief.coupon.code}** · ${badge}`);
    moneyLines.push("- Drinks stay full price.");
    if (discount > 0) {
      moneyLines.push(`- Discount: −${formatChatMoney(discount, symbol)}`);
      moneyLines.push(`- Total: **${formatChatMoney(total, symbol)}**`);
    } else if (subTotal > 0) {
      moneyLines.push(
        `- Total so far: **${formatChatMoney(subTotal, symbol)}** (exact table/ticket saving is confirmed at payment).`,
      );
    }
  } else if (brief.coupon && !choices.couponApplied && !choices.couponSkipped) {
    const badge =
      brief.coupon.badge || (percent != null ? `${percent}% off` : "");
    moneyLines.push(
      `- Coupon **${brief.coupon.code}**${badge ? ` · ${badge}` : ""} applies to tables and tickets (drinks stay full price).`,
    );
  }

  const body = `Here’s your booking summary${nameBit} — **${brief.title}**${venue}.
${slotLines.join("\n")}
${moneyLines.join("\n")}${offerCopy}`;

  if (options.includeCouponAsk && brief.coupon?.code) {
    return {
      content: `${body}\n\nWould you like to apply **${brief.coupon.code}**?`,
      actions: couponActions(brief),
    };
  }

  return {
    content: `${body}\n\nReady to pay from here?`,
    actions: payActions(
      choices.slots.some((slot) => slot.seating !== "tickets")
        ? "tables"
        : "tickets",
    ),
  };
}

function slotsReadyForSummary(
  brief: ChatEventBookingBrief,
  choices: ChatBookingChoices,
): boolean {
  if (choices.slots.length === 0) return false;
  const complete = choices.slots.every((slot) => {
    if (slot.guestCount == null || !slot.seating) return false;
    if (slotNeedsSeatingPlan(slot)) return false;
    if (slotNeedsTicketPick(slot)) return false;
    const drinks = listChatDrinks(brief, slot.roomId);
    return drinks.length === 0 || slot.drinksDone;
  });
  if (!complete) return false;
  const remaining = remainingDateActions(brief, choices.slots);
  return remaining.length === 0 || choices.moreDatesDeclined;
}

/**
 * Keep the booking concierge in deterministic copy so a long AI prompt
 * cannot fail with “reduce the length of the messages or completion”.
 */
export function buildHostBookingTurn(options: {
  brief: ChatEventBookingBrief;
  userText: string;
  choices: ChatBookingChoices;
  userName?: string | null;
}): ChatHostBookingTurn | null {
  const { brief, userText, choices, userName } = options;
  const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
  const venue = formatEventVenuePhrase(brief);
  const bookable = listBookableChatRooms(brief);
  const last = userText.trim();
  const active = choices.slots[choices.slots.length - 1];
  const drinks = listChatDrinks(brief, active?.roomId ?? choices.roomId);

  for (const drink of drinks) {
    const qty = parseDrinkQuantity(last, drink);
    if (qty == null || qty <= 1) continue;
    const over = overstockDrinkTurn(
      brief,
      drink,
      qty,
      active?.roomId ?? choices.roomId,
    );
    if (over) return over;
  }

  if (isEventInfoQuestion(last) && !asksRoomDifference(last)) {
    const info = buildEventInfoTurn({
      brief,
      userText: last,
      roomId: active?.roomId ?? choices.roomId,
    });
    if (info) return info;
  }

  if (asksRoomDifference(last) && bookable.length >= 2) {
    return {
      content: buildRoomDifferenceCopy(brief),
      actions: [
        ...buildRoomChoiceQuickActions(brief),
        ...buildDateChoiceQuickActions(brief),
        buildVisitEventQuickAction(brief),
      ],
    };
  }

  if (choices.slots.length === 0) {
    const roomId = choices.pendingRoomId;
    const dateActions = buildDateChoiceQuickActions(brief, roomId);
    if (
      brief.hasRooms &&
      bookable.length >= 2 &&
      roomId == null &&
      (isLiveEventBookingIntent(last) ||
        isBookingConciergeFollowUp(last) ||
        asksToChangeOrPickRoom(last))
    ) {
      return {
        content: buildBookingKickoffCopy({ brief, userName }),
        actions: [
          ...dateActions,
          {
            id: "room-compare",
            label: "What's the difference?",
            sendText: "What's the difference between the rooms?",
          },
        ],
      };
    }
    if (roomId != null && dateActions.length > 0) {
      const roomName =
        choices.roomName ||
        brief.rooms.find((room) => room.roomId === roomId)?.name ||
        "that room";
      return {
        content: `Thanks${nameBit} — **${roomName}** for **${brief.title}**${venue}.\n\nWhich date would you like?`,
        actions: dateActions,
      };
    }
    if (dateActions.length === 0) {
      if (roomId != null) {
        const roomName =
          choices.roomName ||
          brief.rooms.find((room) => room.roomId === roomId)?.name ||
          "that room";
        return {
          content: `Thanks${nameBit} — **${roomName}** for **${brief.title}**${venue}. There aren’t any dates listed for that room right now.`,
          actions: [],
        };
      }
      return {
        content: buildRoomChoiceHostCopy(brief, choices.guestCount),
        actions: buildRoomChoiceQuickActions(brief),
      };
    }
    return {
      content: `Which date would you like${nameBit}? Each date shows its room — you can add another space after this one.`,
      actions: [
        ...dateActions,
        ...(bookable.length >= 2
          ? [
              {
                id: "room-compare",
                label: "What's the difference?",
                sendText: "What's the difference between the rooms?",
              } satisfies ChatQuickActionDraft,
            ]
          : []),
      ],
    };
  }

  if (!active) return null;

  if (active.guestCount == null) {
    if (/i'?ll type the guest number/i.test(last)) {
      return {
        content: `No problem${nameBit} — type how many guests will be attending${choices.slots.length > 1 ? ` on **${slotHeading(active)}**` : ""}.`,
        actions: [],
      };
    }
    if (
      choices.slots.length > 1 &&
      !choices.wantsGuestChange &&
      !choices.wantsSeatingChange
    ) {
      const prev = choices.slots[choices.slots.length - 2];
      if (prev?.guestCount != null && prev.seating && active.seating == null) {
        return {
          content: `Added **${slotHeading(active)}**${nameBit}.\n\nFor this date, use **${prev.guestCount} guests** and **${seatingLabel(prev.seating)}** like your last date, or change them?`,
          actions: [
            {
              id: "same-as-last",
              label: "Same as last date",
              sendText: CHAT_SAME_AS_LAST_SEND,
            },
            {
              id: "change-guests",
              label: "Change guests",
              sendText: CHAT_CHANGE_GUESTS_SEND,
            },
            {
              id: "change-seating",
              label: "Change seating",
              sendText: CHAT_CHANGE_SEATING_SEND,
            },
          ],
        };
      }
    }
    return {
      content: `Great${nameBit} — **${brief.title}**${venue} on **${slotHeading(active)}**.\n\nHow many guests will be attending?`,
      actions: guestChoiceActions(),
    };
  }

  if (!active.seating) {
    const seating = seatingActions(active.date);
    return {
      content: `Noted${nameBit} — **${active.guestCount} guests** for **${brief.title}**${venue} on **${slotHeading(active)}**.\n\n${seating.prose}`,
      actions:
        seating.actions.length > 0
          ? seating.actions
          : [buildVisitEventQuickAction(brief)],
    };
  }

  if (
    (active.seating === "tables" || active.seating === "both") &&
    !dateOffersTables(active.date)
  ) {
    if (dateOffersTickets(active.date)) {
      return {
        content: `This date doesn’t list table types I can book in chat${nameBit}. I can book **tickets** for your **${active.guestCount} guests**, or you can pick tables on the event page.`,
        actions: [
          {
            id: "seating-tickets",
            label: "Tickets only",
            sendText: "tickets only",
          },
          buildVisitEventQuickAction(brief),
        ],
      };
    }
    return {
      content: `I don’t have table types listed for this date in chat${nameBit}. Open the event page to pick tables.`,
      actions: [buildVisitEventQuickAction(brief)],
    };
  }

  if (active.seating === "tickets" && !dateOffersTickets(active.date)) {
    if (dateOffersTables(active.date)) {
      return {
        content: `This date doesn’t list ticket types I can book in chat${nameBit}. I can book **tables** for your **${active.guestCount} guests**, or you can pick tickets on the event page.`,
        actions: [
          {
            id: "seating-tables",
            label: "Tables only",
            sendText: "tables only",
          },
          buildVisitEventQuickAction(brief),
        ],
      };
    }
    return {
      content: `I don’t have ticket types listed for this date in chat${nameBit}. Open the event page to pick tickets.`,
      actions: [buildVisitEventQuickAction(brief)],
    };
  }

  if (slotNeedsSeatingPlan(active)) {
    const guests = active.guestCount ?? 0;
    if (active.seating === "both" && active.tableGuestCount == null) {
      const half = guests >= 4 ? Math.floor(guests / 2) : null;
      return {
        content: `You chose tables and tickets for **${guests} guests** on **${slotHeading(active)}**.\n\nHow many should sit at tables? The rest get tickets. Each table type has a min and max size.`,
        actions: [
          {
            id: "tables-all",
            label: `All ${guests} at tables`,
            sendText: CHAT_ALL_AT_TABLES_SEND,
          },
          ...(half
            ? [
                {
                  id: "tables-half",
                  label: `${half} at tables`,
                  sendText: `${half} at tables`,
                } satisfies ChatQuickActionDraft,
              ]
            : []),
          {
            id: "tables-type-count",
            label: "I’ll type how many sit at tables",
            sendText: CHAT_TYPE_TABLE_GUESTS_SEND,
          },
        ],
      };
    }

    if (/i'?ll type how many sit at tables/i.test(last)) {
      return {
        content: `Type how many of the **${guests} guests** should sit at tables.`,
        actions: [],
      };
    }

    const tableGuests =
      active.tableGuestCount ??
      (active.seating === "tickets" ? 0 : guests);
    const tables = active.date.tables;
    const mixing = active.mixingTables || Object.keys(active.tableMix).length > 0;
    if (mixing && !active.tablePlanDone) {
      const mixLines = Object.entries(active.tableMix).map(([key, qty]) => {
        const table = tables.find((item) => chatTableKey(item) === key);
        return table
          ? `- ${qty} × ${chatTableLabel(table)}`
          : `- ${qty} × tables`;
      });
      const mixFail =
        /that'?s the table mix/i.test(last) && !active.tablePlanDone
          ? `That mix can’t seat **${tableGuests} guests** within the min–max for those tables. Change the quantities.\n\n`
          : "";
      const mixBody =
        mixLines.length > 0
          ? `Noted this mix for **${tableGuests} guests**:\n${mixLines.join("\n")}\n\nAdd another table type, or finish and I’ll split guests within each table’s min–max.`
          : `Pick how many of each table type for **${tableGuests} guests**. I’ll split people using each table’s min–max.`;
      return {
        content: `${mixFail}${mixBody}`,
        actions: [
          ...tables.flatMap((table) => {
            const stock = table.remaining ?? 8;
            const qty = findTableQuantityForGuests(
              Math.max(1, table.minPersons),
              table.minPersons,
              table.maxPersons,
              stock,
            );
            const options = [1, 2, qty].filter(
              (value): value is number =>
                value != null && value >= 1 && value <= stock,
            );
            return [...new Set(options)].slice(0, 2).map((value) => ({
              id: `table-qty-${chatTableKey(table)}-${value}`,
              label: `${value} × ${chatTableLabel(table)}`,
              hint: `${table.minPersons}–${table.maxPersons} guests`,
              sendText: `${value} × ${chatTableLabel(table)}`,
            }));
          }),
          {
            id: "table-mix-done",
            label: "That's the table mix",
            sendText: CHAT_TABLE_MIX_DONE_SEND,
          },
        ],
      };
    }

    const recommended = recommendedChatTablePlan(tables, tableGuests);
    const typeActions = tables
      .filter((table) => planSingleTableType(table, tableGuests))
      .map((table) => ({
        id: `table-only-${chatTableKey(table)}`,
        label: `Use ${chatTableLabel(table)} only`,
        hint: `${table.minPersons}–${table.maxPersons} guests`,
        sendText: `use ${chatTableLabel(table)} only`,
      }));

    if (!recommended && typeActions.length === 0) {
      return {
        content: `I can’t fit **${tableGuests} guests** on the table sizes listed for this date (each table has a min and max). Change the guest number, or visit the event page to pick tables there.`,
        actions: [buildVisitEventQuickAction(brief)],
      };
    }

    const planCopy = recommended
      ? `For **${tableGuests} table guests** I recommend:\n${formatChatSeatingPlan(recommended)}\n\nI split people using each table’s min–max. You can use this plan, pick one table size, or mix sizes.`
      : `For **${tableGuests} table guests**, pick a table size. Each type has a min and max I’ll split across.`;

    return {
      content: planCopy,
      actions: [
        ...(recommended
          ? [
              {
                id: "table-use-plan",
                label: "Use this seating plan",
                sendText: CHAT_USE_TABLE_PLAN_SEND,
              },
            ]
          : []),
        ...typeActions,
        ...(tables.length >= 2
          ? [
              {
                id: "table-mix",
                label: "Mix table types",
                sendText: CHAT_MIX_TABLES_SEND,
              },
            ]
          : []),
      ],
    };
  }

  const party = resolveSlotTableAndTicketCounts(active);

  if (
    /i'?ll type the ticket quantity for /i.test(last) &&
    choices.pendingTicketQtyTitle
  ) {
    return {
      content: `Type how many **${choices.pendingTicketQtyTitle}** tickets you want.`,
      actions: [],
    };
  }

  if (slotNeedsTicketPick(active)) {
    const tickets = active.date.tickets;
    const needed =
      party.ticketQty > 0
        ? party.ticketQty
        : Math.max(1, (active.guestCount ?? 0) - (active.tableGuestCount ?? 0));
    const selected = active.ticketTitles;
    const remainingTypes = ticketChoiceActions(
      tickets,
      brief.currencySymbol,
      selected,
    );
    const qtyActions = ticketQuantityActions(
      active,
      tickets,
      choices.pendingTicketQtyTitle,
    );
    if (selected.length === 0) {
      return {
        content: `Thanks${nameBit} — **${needed} tickets** for **${slotHeading(active)}**.\n\nWhich ticket type would you like? You can add more than one, then set the quantity.`,
        actions: remainingTypes,
      };
    }
    const picked = selected
      .map((title) => {
        const qty = active.ticketQuantities[title] ?? 1;
        return `${qty} × ${title}`;
      })
      .join(", ");
    const have = slotPickedTicketQty(active);
    const stillNeed = Math.max(0, needed - have);
    const needLine =
      stillNeed > 0
        ? ` You still need **${stillNeed}** more to cover the party.`
        : "";
    return {
      content: `Tickets so far for **${slotHeading(active)}**: **${picked}**${nameBit}.${needLine}\n\nChange a quantity, add another ticket, or continue.`,
      actions: [
        ...qtyActions,
        ...remainingTypes,
        {
          id: "tickets-done",
          label: "That's all for tickets",
          sendText: CHAT_TICKETS_DONE_SEND,
        },
      ],
    };
  }

  if (party.ticketQty > 0) {
    for (const title of active.ticketTitles) {
      const ticket = active.date.tickets.find(
        (item) => normalize(item.title) === normalize(title),
      );
      const qty = active.ticketQuantities[title] ?? 0;
      const remaining = ticket?.remaining ?? ticket?.capacity ?? null;
      if (ticket && remaining != null && qty > remaining) {
        return {
          content: `This date has **${remaining}** ${ticket.title} left — I can’t book **${qty}**. Choose a smaller quantity.`,
          actions: ticketQuantityActions(
            active,
            active.date.tickets,
            ticket.title,
          ),
        };
      }
    }
  }

  if (/i'?ll type the quantity for /i.test(last) && choices.pendingDrinkQtyTitle) {
    return {
      content: `Type how many **${choices.pendingDrinkQtyTitle}** packages you want.`,
      actions: [],
    };
  }

  if (drinks.length > 0 && !active.drinksDone) {
    const selected = active.drinkTitles;
    const remaining = drinkChoiceActions(drinks, brief.currencySymbol, selected);
    const qtyActions = drinkQuantityActions(
      active,
      drinks,
      choices.pendingDrinkQtyTitle,
    );
    if (selected.length === 0) {
      return {
        content: `Thanks${nameBit} — **${active.guestCount} guests**, ${seatingLabel(active.seating)} on **${slotHeading(active)}**.\n\nWhich drinks would you like? You can add more than one, then set the quantity.`,
        actions: [
          ...remaining,
          {
            id: "no-drinks",
            label: "No drinks",
            sendText: CHAT_NO_DRINKS_SEND,
          },
        ],
      };
    }
    const picked = selected
      .map((title) => {
        const qty = active.drinkQuantities[title] ?? 1;
        return `${qty} × ${title}`;
      })
      .join(", ");
    return {
      content: `Drinks so far for **${slotHeading(active)}**: **${picked}**${nameBit}.\n\nChange a quantity or add another package.`,
      actions: [
        ...qtyActions,
        ...remaining,
        {
          id: "drinks-done",
          label: "That's all for drinks",
          sendText: CHAT_DRINKS_DONE_SEND,
        },
      ],
    };
  }

  const remainingDates = remainingDateActions(brief, choices.slots);
  if (remainingDates.length > 0 && !choices.moreDatesDeclined) {
    return {
      content: `That's **${slotHeading(active)}** noted${nameBit}.\n\nWould you like another date or room? Each date shows its room.`,
      actions: [
        ...remainingDates.slice(0, 10),
        {
          id: "dates-done",
          label: "That's everything",
          sendText: CHAT_DATES_DONE_SEND,
        },
      ],
    };
  }

  if (slotsReadyForSummary(brief, choices)) {
    const includeCouponAsk =
      Boolean(brief.coupon?.code) &&
      !choices.couponApplied &&
      !choices.couponSkipped;
    return buildSummaryTurn({
      brief,
      choices,
      userName,
      includeCouponAsk,
    });
  }

  return null;
}

export function toChatQuickActions(
  actions: ChatQuickActionDraft[],
): ChatQuickActionDraft[] {
  return actions.filter((action) => {
    if (action.id === CHAT_PAY_FULL_ID || action.id === CHAT_PAY_DEPOSIT_ID) {
      return true;
    }
    if (action.id === "visit-event") return true;
    if (action.sendText) return true;
    if (action.href?.startsWith("/auth/")) return true;
    if (action.id.startsWith("brochure-")) return true;
    if (action.href && /^https?:\/\//i.test(action.href)) return true;
    return false;
  });
}
