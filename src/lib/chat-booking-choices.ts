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
  chatDatesShowRooms,
  CHAT_PAY_DEPOSIT_ID,
  CHAT_PAY_FULL_ID,
  formatChatDateChoiceSendText,
  formatChatDrinkLabel,
  formatChatMoney,
  formatChatTicketLabel,
  formatChatLocationLabel,
  formatEventVenuePhrase,
  isBookingConciergeFollowUp,
  isCasualChatText,
  isChatEmailAddress,
  isChatEmailUpdatesText,
  isBrochureQuestion,
  isEventInfoQuestion,
  brochureQuestionWantsAllRooms,
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
import { CHECKOUT_PATH } from "@/lib/checkout-chat-handoff";
import { isBroadEventListIntent, isLiveEventAvailabilityQuestion, isLiveEventBookingIntent, normalizeChatBookingQuery } from "@/lib/chat-live-events";
import { isDisallowedChatSafetyIntent } from "@/lib/chat-safety";
import {
  chatTableKey,
  chatTableLabel,
  chatTablesSeatCapacity,
  findTableQuantityForGuests,
  formatChatSeatingPlan,
  largestFittingGuestCount,
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

export type ChatBookingSummaryItem = {
  kind: "table" | "ticket" | "drink";
  slotHeading: string;
  qty: number;
  name: string;
  unitPrice?: string;
  meta?: string;
  amount?: string;
};

export type ChatBookingSummaryCard = {
  eventTitle: string;
  venue?: string;
  greeting?: string;
  slots: Array<{
    heading: string;
    guests?: string;
    seating?: string;
  }>;
  items: ChatBookingSummaryItem[];
  couponNote?: string;
  subtotal?: string;
  discount?: string;
  total?: string;
  prompt?: string;
};

export type ChatVenueContact = {
  phone?: string | null;
  email?: string | null;
};

export type ChatHostBookingTurn = {
  content: string;
  actions: ChatQuickActionDraft[];
  summary?: ChatBookingSummaryCard;
};

export const CHAT_DRINKS_DONE_SEND = "that's all for drinks";
export const CHAT_NO_DRINKS_SEND = "no drinks for this date";
export const CHAT_DATES_DONE_SEND = "that's everything — continue";
export const CHAT_SAME_AS_LAST_SEND = "same guests and seating as last date";
export const CHAT_CHANGE_GUESTS_SEND = "change guests for this date";
export const CHAT_CHANGE_SEATING_SEND = "change seating for this date";
export const CHAT_CHANGE_TABLES_SEND = "change tables for this date";
export const CHAT_CHANGE_TICKETS_SEND = "change tickets for this date";
export const CHAT_CHANGE_DRINKS_SEND = "change drinks for this date";
export const CHAT_USE_TABLE_PLAN_SEND = "use this seating plan";
export const CHAT_MIX_TABLES_SEND = "mix table types";
export const CHAT_TABLE_MIX_DONE_SEND = "that's the table mix";
export const CHAT_ALL_AT_TABLES_SEND = "all guests at tables";
export const CHAT_TYPE_TABLE_GUESTS_SEND = "I'll type how many sit at tables";
export const CHAT_TICKETS_DONE_SEND = "that's all for tickets";
export const CHAT_NO_TICKETS_SEND = "no tickets for this date";
export const CHAT_OPEN_CHECKOUT_SEND = "go to checkout";
export const CHAT_ASK_VENUE_SEND = "ask the venue about this group";
export const CHAT_RAISE_ENQUIRY_SEND = "raise a support enquiry";

export function isChatBookingVenueEnquiryIntent(text: string): boolean {
  const n = text.toLowerCase().replace(/[’']/g, "'");
  if (/\bask the venue\b/.test(n)) return true;
  if (/\bi have (a |an )?(enquiry|inquiry|query)\b/.test(n)) return true;
  return /\braise (a |an )?(support )?(enquiry|inquiry|ticket|query)\b/.test(n);
}

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
  return parsePartySizeChange(text)?.qty ?? null;
}

function isGuestCountPhrase(text: string): boolean {
  return /\b(\d{1,7}\s+)?(guests?|people|persons?|pax|prople|ppl|party of|party size|table for|groups?)\b/i.test(
    text,
  );
}

function isPartySizeQty(qty: number): boolean {
  return Number.isFinite(qty) && qty >= 1 && qty <= 9_999_999;
}

function parsePartySizeChange(
  text: string,
  options?: { allowImpliedBare?: boolean },
): { mode: "set" | "add"; qty: number } | null {
  const add = text.match(
    /\badd\s+(\d{1,7})\s+(?:more\s+)?(?:guests?|people|persons?|pax)\b/i,
  );
  if (add) {
    const qty = Number(add[1]);
    if (isPartySizeQty(qty)) return { mode: "add", qty };
  }
  const more = text.match(
    /\b(\d{1,7})\s+more\s+(?:guests?|people|persons?|pax)\b/i,
  );
  if (more) {
    const qty = Number(more[1]);
    if (isPartySizeQty(qty)) return { mode: "add", qty };
  }
  const withWord = [
    ...text.matchAll(
      /\b(\d{1,7})\s*(?:guests?|people|persons?|prople|ppl|pax)\b/gi,
    ),
  ];
  if (withWord.length > 0) {
    const qty = Number(withWord[withWord.length - 1][1]);
    if (isPartySizeQty(qty)) return { mode: "set", qty };
  }
  const groupOf = text.match(/\bgroups?\s+of\s+(\d{1,7})\b/i);
  if (groupOf) {
    const qty = Number(groupOf[1]);
    if (isPartySizeQty(qty)) return { mode: "set", qty };
  }
  const peopleGroup = text.match(
    /\b(\d{1,7})[-\s]*(?:people|persons?|prople|ppl|guests?)\s+groups?\b/i,
  );
  if (peopleGroup) {
    const qty = Number(peopleGroup[1]);
    if (isPartySizeQty(qty)) return { mode: "set", qty };
  }
  const party = text.match(
    /\b(?:party of|table for|we are|we're|party size|i have (?:a |an )?)\s*(\d{1,7})\b/i,
  );
  if (party) {
    const qty = Number(party[1]);
    if (isPartySizeQty(qty)) return { mode: "set", qty };
  }
  if (options?.allowImpliedBare) {
    const implied = text.match(
      /\b(?:make it|change to|actually|try|what about|how about|can i (?:do|book|have)|instead)\s+(\d{1,7})\b/i,
    );
    if (implied) {
      const qty = Number(implied[1]);
      if (isPartySizeQty(qty)) return { mode: "set", qty };
    }
  }
  const lone = text.trim().match(/^(\d{1,7})$/);
  if (lone) {
    const qty = Number(lone[1]);
    if (isPartySizeQty(qty) && qty !== 2025 && qty !== 2026 && qty !== 2027) {
      return { mode: "set", qty };
    }
  }
  return null;
}

function applySlotGuestCount(slot: ChatBookingSlot, guests: number): void {
  if (!isPartySizeQty(guests)) return;
  const prev = slot.guestCount;
  slot.guestCount = guests;
  if (slot.seating === "tickets") return;
  slot.tableGuestCount = guests;
  if (prev != null && prev !== guests) {
    slot.tablePlan = [];
    slot.tablePlanDone = false;
    slot.tableMix = {};
    slot.mixingTables = false;
  }
}

function isRemoveCatalogItem(text: string, title: string): boolean {
  const n = normalize(text);
  const token = normalize(title);
  if (!token || !n.includes(token)) return false;
  return /\b(no|remove|delete|drop|without|don t want|dont want|take off|cancel)\b/.test(
    n,
  );
}

function parseDrinkQuantity(
  text: string,
  drink: ChatBookingDrink,
): number | null {
  return parseDrinkQtyChange(text, drink)?.qty ?? null;
}

export function parseDrinkQtyChange(
  text: string,
  drink: ChatBookingDrink,
): { mode: "set" | "add"; qty: number } | null {
  const n = normalize(text);
  const title = normalize(drink.title);
  if (!title || !n.includes(title)) return null;
  if (isRemoveCatalogItem(text, drink.title)) return null;
  const titlePat = title.replace(/ /g, "\\s+");
  const add = n.match(
    new RegExp(`\\badd\\s+(\\d{1,3})\\s+(?:more\\s+)?(?:x\\s+)?${titlePat}`),
  );
  if (add) {
    const qty = Number(add[1]);
    if (qty >= 1 && qty <= 500) return { mode: "add", qty };
  }
  const after = n.match(new RegExp(`${titlePat}\\s*(?:x|×)?\\s*(\\d{1,3})`));
  if (after) {
    const qty = Number(after[1]);
    if (qty >= 1 && qty <= 500) return { mode: "set", qty };
  }
  const before = n.match(
    new RegExp(`(\\d{1,3})\\s*(?:x|×|of)?\\s*${titlePat}`),
  );
  if (before) {
    const qty = Number(before[1]);
    if (qty >= 1 && qty <= 500) return { mode: "set", qty };
  }
  return { mode: "set", qty: 1 };
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
  return date.tickets.some((ticket) => !isTicketSoldOut(ticket));
}

function ticketStock(ticket: ChatBookingTicket): number | null {
  if (ticket.remaining != null) return ticket.remaining;
  if (ticket.capacity != null) return ticket.capacity;
  return null;
}

function isTicketSoldOut(ticket: ChatBookingTicket): boolean {
  const stock = ticketStock(ticket);
  return stock != null && stock <= 0;
}

function ticketStockHint(ticket: ChatBookingTicket): string | undefined {
  const stock = ticketStock(ticket);
  if (stock == null) return undefined;
  return stock <= 0 ? "Sold out" : `${stock} left`;
}

function removeTicketSend(title: string): string {
  return `0 × ${title}`;
}

function parseTypedTicketQuantity(text: string): number | null {
  const t = text.trim();
  const match = t.match(/^(\d{1,7})(?:\s+tickets?)?$/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 0 || n > 9_999_999) return null;
  return n;
}

function isBareTicketQuantityText(text: string): boolean {
  const n = parseTypedTicketQuantity(text);
  if (n == null) return false;
  if (n === 2025 || n === 2026 || n === 2027) return false;
  return n <= 500;
}

function slotHasTicketOverstock(slot: ChatBookingSlot): boolean {
  return slot.ticketTitles.some((title) => {
    const ticket = slot.date.tickets.find(
      (item) => normalize(item.title) === normalize(title),
    );
    const qty = slot.ticketQuantities[title] ?? 0;
    const stock = ticket ? ticketStock(ticket) : null;
    return Boolean(ticket && stock != null && qty > stock);
  });
}

function slotPickedTicketQty(slot: ChatBookingSlot): number {
  return slot.ticketTitles.reduce(
    (sum, title) => sum + Math.max(0, slot.ticketQuantities[title] ?? 0),
    0,
  );
}

function slotHasTablePlan(slot: ChatBookingSlot): boolean {
  return slot.tablePlan.some((item) => item.quantity > 0);
}

function finishTicketsIfTablesCover(slot: ChatBookingSlot): void {
  if (slotPickedTicketQty(slot) > 0) return;
  if (!slotHasTablePlan(slot)) return;
  slot.ticketsDone = true;
  slot.ticketCount = 0;
  if (slot.seating === "both") slot.seating = "tables";
}

export function resolveSlotTableAndTicketCounts(slot: ChatBookingSlot): {
  tableGuests: number;
  ticketQty: number;
} {
  const guests = slot.guestCount ?? 0;
  const offersTables = dateOffersTables(slot.date);
  const offersTickets = dateOffersTickets(slot.date);

  if (slot.tablePlan.length > 0) {
    return {
      tableGuests: chatSeatingPlanGuests(slot.tablePlan),
      ticketQty: slot.seating === "tables" ? 0 : slotPickedTicketQty(slot),
    };
  }

  if (!offersTables || slot.seating === "tickets") {
    const picked = slotPickedTicketQty(slot);
    return {
      tableGuests: 0,
      ticketQty: offersTickets ? (picked > 0 ? picked : guests) : 0,
    };
  }
  if (slot.seating === "tables" || !offersTickets) {
    return {
      tableGuests: slot.tableGuestCount ?? guests,
      ticketQty: 0,
    };
  }
  return {
    tableGuests: slot.tableGuestCount ?? guests,
    ticketQty: slotPickedTicketQty(slot),
  };
}

function applyInventorySeating(slot: ChatBookingSlot): void {
  const offersTables = dateOffersTables(slot.date);
  const offersTickets = dateOffersTickets(slot.date);
  if (!offersTables && offersTickets) {
    slot.seating = "tickets";
    slot.tableGuestCount = 0;
    slot.tablePlan = [];
    slot.tablePlanDone = true;
    const picked = slotPickedTicketQty(slot);
    if (picked > 0) {
      slot.guestCount = picked;
      slot.ticketCount = picked;
    }
    return;
  }
  if (offersTables && !offersTickets && slot.seating == null) {
    slot.seating = "tables";
    slot.ticketCount = 0;
    slot.ticketsDone = true;
    if (slot.guestCount != null) {
      slot.tableGuestCount = slot.guestCount;
    }
    return;
  }
  if (
    slot.seating === "both" &&
    slot.guestCount != null &&
    slot.tableGuestCount == null
  ) {
    slot.tableGuestCount = slot.guestCount;
  }
}

/** Guest count is for table seating — checkout tickets only need type + quantity. */
function slotNeedsGuestCount(slot: ChatBookingSlot): boolean {
  if (slot.guestCount != null) return false;
  if (slot.seating === "tickets") return false;
  if (slot.seating === "tables" || slot.seating === "both") return true;
  return dateOffersTables(slot.date) && !dateOffersTickets(slot.date);
}

export function isChatTableCapacityQuestion(text: string): boolean {
  const n = text.toLowerCase().replace(/[’']/g, "'");
  if (/\bhow many (should|to) sit\b/.test(n) || /\bsit at tables\b/.test(n)) {
    return false;
  }
  if (
    /\bhow many\b/.test(n) &&
    /\b(can |could )?(fit|fits|seat|seats|sit|hold)\b/.test(n)
  ) {
    return true;
  }
  return /\b(what('?s| is) the (max|maximum|capacity)|max(imum)? (guests?|people|capacity)|how many tables? (are )?(left|remain)|can you (fit|seat))\b/.test(
    n,
  );
}

export function isChatTableNeedQuestion(text: string): boolean {
  const n = text.toLowerCase();
  return (
    /\bhow many tables?\b/.test(n) &&
    /\b(need|should|do i|for (us|me|my)|recommend)\b/.test(n)
  );
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
    /\b(no drinks|skip drinks|without drinks|none for drinks|don t want drinks|dont want drinks)\b/.test(
      n,
    )
  );
}

function isSoftNoThanks(text: string): boolean {
  const n = normalize(text);
  return (
    n === "no thanks" ||
    n === "no thank you" ||
    n === "none" ||
    n === "skip" ||
    n === "not for me" ||
    n === "not for us" ||
    n === "we re good" ||
    n === "were good" ||
    n === "im good" ||
    n === "i m good"
  );
}

function isSoftDeclineMoreDates(text: string): boolean {
  const n = normalize(text);
  return (
    isDatesDoneText(text) ||
    isSoftNoThanks(text) ||
    n === "thats all" ||
    n === "that s all" ||
    n === "thats it" ||
    n === "that s it" ||
    n === "no" ||
    n === "nope" ||
    n === "just this" ||
    n === "just this one" ||
    n === "this one only" ||
    /\b(no more|nothing else|that will be all)\b/.test(n)
  );
}

function isNoTicketsText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_NO_TICKETS_SEND) ||
    /\b(no tickets|skip tickets|without tickets|none for tickets|just tables)\b/.test(
      n,
    )
  );
}

function isTicketsDoneText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_TICKETS_DONE_SEND) ||
    n === normalize(CHAT_OPEN_CHECKOUT_SEND) ||
    /\b(that'?s all for tickets|no more tickets|done with tickets|tickets are fine|that'?s enough)\b/.test(
      n,
    ) ||
    /\b(go to checkout|take me to checkout|open checkout)\b/.test(n)
  );
}

export function isChatCheckoutHandoffIntent(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_OPEN_CHECKOUT_SEND) ||
    /\b(go to checkout|take me to checkout|open checkout|that'?s enough)\b/.test(
      n,
    )
  );
}

export function chatChoicesHaveLineItems(choices: ChatBookingChoices): boolean {
  return choices.slots.some((slot) => {
    if (slotPickedTicketQty(slot) > 0) return true;
    if (slot.tablePlan.some((item) => item.quantity > 0)) return true;
    if (Object.values(slot.tableMix).some((qty) => qty > 0)) return true;
    return slot.drinkTitles.some(
      (title) => Math.max(0, slot.drinkQuantities[title] ?? 1) > 0,
    );
  });
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
  const change = parseTicketQtyChange(text, ticket);
  if (change) return change.qty;
  const title = normalize(ticket.title);
  if (title && normalize(text) === title) return 1;
  return null;
}

export function parseTicketQtyChange(
  text: string,
  ticket: ChatBookingTicket,
): { mode: "set" | "add"; qty: number } | null {
  const n = normalize(text);
  const title = normalize(ticket.title);
  if (!title || !n.includes(title)) return null;
  if (n === title) return null;
  const titlePat = title.replace(/ /g, "\\s+");
  const add = n.match(
    new RegExp(`\\badd\\s+(\\d{1,7})\\s+(?:more\\s+)?(?:x\\s+)?${titlePat}`),
  );
  if (add) {
    const qty = Number(add[1]);
    if (qty >= 1 && qty <= 9_999_999) return { mode: "add", qty };
  }
  const after = n.match(new RegExp(`${titlePat}\\s*(?:x|×)?\\s*(\\d{1,7})`));
  if (after) {
    const qty = Number(after[1]);
    if (qty >= 0 && qty <= 9_999_999) return { mode: "set", qty };
  }
  const before = n.match(
    new RegExp(`(\\d{1,7})\\s*(?:x|×|of)?\\s*${titlePat}`),
  );
  if (before) {
    const qty = Number(before[1]);
    if (qty >= 0 && qty <= 9_999_999) return { mode: "set", qty };
  }
  return null;
}

function ticketAddSend(title: string, qty: number): string {
  return `add ${qty} more ${title}`;
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

function isChangeIntent(text: string, topic: string): boolean {
  const n = normalize(text);
  return new RegExp(
    `\\b(change|update|edit|fix|adjust)\\s+(the\\s+)?${topic}\\b`,
  ).test(n);
}

function isChangeGuestsText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_CHANGE_GUESTS_SEND) ||
    isChangeIntent(text, "guests?") ||
    /\b(change|update|edit) (the )?(party size|guest count|number of guests)\b/.test(
      n,
    )
  );
}

function isChangeDateText(text: string): boolean {
  const n = normalize(text);
  return (
    /\b(change|switch|wrong) (the )?(date|day)\b/.test(n) ||
    /\b(different date|not (this|that) date|picked the wrong date|wrong date)\b/.test(
      n,
    )
  );
}

function isChangeSeatingText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_CHANGE_SEATING_SEND) ||
    isChangeIntent(text, "seating")
  );
}

function isChangeTablesText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_CHANGE_TABLES_SEND) || isChangeIntent(text, "tables?")
  );
}

function isChangeTicketsText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_CHANGE_TICKETS_SEND) ||
    isChangeIntent(text, "tickets?")
  );
}

function isChangeDrinksText(text: string): boolean {
  const n = normalize(text);
  return (
    n === normalize(CHAT_CHANGE_DRINKS_SEND) || isChangeIntent(text, "drinks?")
  );
}

function typeDrinkQtySend(title: string): string {
  return `I'll type the quantity for ${title}`;
}

function drinkQtySend(title: string, qty: number): string {
  return `${qty} × ${title}`;
}

function drinkAddSend(title: string, qty: number): string {
  return `add ${qty} more ${title}`;
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
      /which drinks|any other drinks|no drinks|that'?s all for drinks|how many .+ packages|change a quantity|drinks so far|set to|add .+ more/i.test(
        assistant,
      );
    const askingTickets =
      /which ticket|ticket type|how many .+ tickets|that'?s all for tickets|tickets so far|tickets to choose|can'?t book|smaller quantity|sold out|still need \*\*\d+|set to|add .+ more/i.test(
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
    const askingGuestNumber =
      /how many guests will be attending|type how many guests will be attending|i'?ll type the guest number/i.test(
        assistant,
      );
    const askingCapacityOrFit =
      isChatTableCapacityQuestion(assistant) ||
      /can.?t fit|at most \*\*\d+|those table sizes/i.test(assistant);
    const guestPhrase = isGuestCountPhrase(text);

    if (
      (isDatesDoneText(text) ||
        (askingMoreDates && isSoftDeclineMoreDates(text))) &&
      (askingMoreDates || !askingDrinks)
    ) {
      moreDatesDeclined = true;
      continue;
    }

    const pickedDate = matchChatDateChoice(text, datePool, pendingRoomId);
    if (pickedDate) {
      const current = activeKey ? slotsByKey.get(activeKey) : null;
      const guests = current?.guestCount;
      const currentCantFit = Boolean(
        current &&
          guests != null &&
          guests > 0 &&
          current.seating !== "tickets" &&
          !current.tablePlanDone &&
          dateOffersTables(current.date) &&
          !recommendedChatTablePlan(current.date.tables, guests) &&
          chatDateSlotKey(pickedDate) !== activeKey,
      );
      if (currentCantFit && current && activeKey) {
        slotsByKey.delete(activeKey);
        const idx = slotOrder.indexOf(activeKey);
        if (idx >= 0) slotOrder.splice(idx, 1);
      }
      const slot = activateSlot(pickedDate);
      if (currentCantFit && current) {
        if (current.guestCount != null) {
          applySlotGuestCount(slot, current.guestCount);
        }
        if (current.seating) slot.seating = current.seating;
        slot.drinkTitles = [...current.drinkTitles];
        slot.drinkQuantities = { ...current.drinkQuantities };
        slot.drinksDone = current.drinksDone;
      }
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
    const waitingForGuestCount = Boolean(active && slotNeedsGuestCount(active));
    const tables = active?.date.tables ?? [];
    const drinkPool = listChatDrinks(brief, active?.roomId ?? pendingRoomId);
    const ticketPool = active?.date.tickets ?? [];

    const typedTicketTitle = parseTypeTicketQtyTitle(text, ticketPool);
    if (typedTicketTitle) {
      pendingTicketQtyTitle = typedTicketTitle;
      continue;
    }

    if (isChangeDateText(text) && active && !askingMoreDates) {
      slotsByKey.delete(activeKey!);
      const idx = slotOrder.indexOf(activeKey!);
      if (idx >= 0) slotOrder.splice(idx, 1);
      activeKey = slotOrder[slotOrder.length - 1] ?? null;
      pendingDrinkQtyTitle = null;
      pendingTicketQtyTitle = null;
      continue;
    }

    if (
      pendingTicketQtyTitle &&
      active &&
      parseTypedTicketQuantity(text) != null &&
      !waitingForGuestCount &&
      !askingGuestNumber &&
      !guestPhrase &&
      !askingCapacityOrFit
    ) {
      const qty = parseTypedTicketQuantity(text);
      if (qty != null) {
        const pendingTitle = pendingTicketQtyTitle;
        const ticket = ticketPool.find(
          (item) => normalize(item.title) === normalize(pendingTitle),
        );
        const stock = ticket ? ticketStock(ticket) : null;
        const overflowed = Boolean(
          ticket && stock != null && stock > 0 && qty > stock,
        );
        if (qty <= 0) {
          active.ticketTitles = active.ticketTitles.filter(
            (title) => title !== pendingTicketQtyTitle,
          );
          delete active.ticketQuantities[pendingTicketQtyTitle];
          finishTicketsIfTablesCover(active);
        } else if (!ticket || stock == null || stock > 0) {
          const nextQty = stock != null ? Math.min(qty, stock) : qty;
          if (!active.ticketTitles.includes(pendingTicketQtyTitle)) {
            active.ticketTitles.push(pendingTicketQtyTitle);
          }
          active.ticketQuantities[pendingTicketQtyTitle] = nextQty;
        }
        if (!overflowed) {
          pendingTicketQtyTitle = null;
        }
        continue;
      }
    }
    if (
      pendingTicketQtyTitle &&
      !n.includes(normalize(pendingTicketQtyTitle)) &&
      parseTypedTicketQuantity(text) == null
    ) {
      pendingTicketQtyTitle = null;
    }

    const typedDrinkTitle = parseTypeDrinkQtyTitle(text, drinkPool);
    if (typedDrinkTitle) {
      pendingDrinkQtyTitle = typedDrinkTitle;
      continue;
    }

    if (
      pendingDrinkQtyTitle &&
      active &&
      !waitingForGuestCount &&
      !askingGuestNumber &&
      !guestPhrase &&
      !askingCapacityOrFit
    ) {
      const qty =
        extractGuestCount(text) ??
        (askingDrinks
          ? parsePartySizeChange(text, { allowImpliedBare: true })?.qty
          : null);
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
      if (!slotHasTicketOverstock(active)) {
        if (slotPickedTicketQty(active) > 0) {
          active.ticketsDone = true;
        } else {
          finishTicketsIfTablesCover(active);
        }
      }
      pendingTicketQtyTitle = null;
      continue;
    }
    if (
      (isNoTicketsText(text) || (askingTickets && isSoftNoThanks(text))) &&
      active &&
      slotHasTablePlan(active)
    ) {
      active.ticketTitles = [];
      active.ticketQuantities = {};
      pendingTicketQtyTitle = null;
      finishTicketsIfTablesCover(active);
      continue;
    }

    if (isChangeGuestsText(text) && active) {
      active.guestCount = null;
      active.tableGuestCount = null;
      active.tablePlan = [];
      active.tablePlanDone = false;
      active.tableMix = {};
      active.mixingTables = false;
      pendingDrinkQtyTitle = null;
      pendingTicketQtyTitle = null;
      if (active.seating == null && slotOrder.length >= 2) {
        const prev = slotsByKey.get(slotOrder[slotOrder.length - 2]);
        if (prev?.seating) active.seating = prev.seating;
      }
      wantsGuestChange = true;
      continue;
    }
    if (isChangeTablesText(text) && active) {
      active.tablePlan = [];
      active.tablePlanDone = false;
      active.tableMix = {};
      active.mixingTables = false;
      continue;
    }
    if (isChangeTicketsText(text) && active) {
      active.ticketsDone = false;
      if (active.seating === "tables" && dateOffersTickets(active.date)) {
        active.seating = "both";
      }
      continue;
    }
    if (isChangeDrinksText(text) && active) {
      active.drinksDone = false;
      pendingDrinkQtyTitle = null;
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
      pendingDrinkQtyTitle = null;
      pendingTicketQtyTitle = null;
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
      pendingDrinkQtyTitle = null;
      continue;
    }
    if (askingDrinks && isSoftNoThanks(text) && active) {
      if (active.drinkTitles.length === 0) {
        active.drinkTitles = [];
        active.drinkQuantities = {};
      }
      active.drinksDone = true;
      pendingDrinkQtyTitle = null;
      continue;
    }
    if (isDrinksDoneText(text) && active && (askingDrinks || !askingMoreDates)) {
      active.drinksDone = true;
      pendingDrinkQtyTitle = null;
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

    const allowImpliedGuest =
      waitingForGuestCount ||
      askingGuestNumber ||
      askingCapacityOrFit ||
      wantsGuestChange ||
      askingSeatingPlan ||
      Boolean(
        active &&
          active.tablePlanDone &&
          !askingDrinks &&
          !askingTickets,
      );
    const party = parsePartySizeChange(text, {
      allowImpliedBare: allowImpliedGuest,
    });
    const ticketOnlyDate = Boolean(
      active &&
        !dateOffersTables(active.date) &&
        dateOffersTickets(active.date),
    );
    if (
      party != null &&
      active?.seating !== "tickets" &&
      !ticketOnlyDate &&
      (askingGuestNumber ||
        waitingForGuestCount ||
        askingCapacityOrFit ||
        guestPhrase ||
        (!askingTableSplit &&
          !askingSeatingPlan &&
          !askingDrinks &&
          !askingTickets &&
          !pendingTicketQtyTitle))
    ) {
      const next: number =
        party.mode === "add"
          ? (active?.guestCount ?? pendingGuest ?? 0) + party.qty
          : party.qty;
      if (active) applySlotGuestCount(active, next);
      else pendingGuest = next;
      wantsGuestChange = false;
      pendingDrinkQtyTitle = null;
      pendingTicketQtyTitle = null;
    }

    const seating = seatingFromText(n);
    if (seating) {
      if (active) {
        active.seating = seating;
        if (seating === "tickets") {
          active.tablePlanDone = true;
          active.tableGuestCount = 0;
          active.ticketsDone = false;
        } else if (seating === "tables") {
          active.ticketCount = 0;
          active.ticketsDone = true;
          active.ticketTitles = [];
          active.ticketQuantities = {};
          if (active.guestCount != null) {
            active.tableGuestCount = active.guestCount;
          }
          if (!slotHasTablePlan(active)) {
            active.tablePlanDone = false;
          }
        } else if (seating === "both") {
          active.tablePlanDone = false;
          active.ticketsDone = false;
          active.tableGuestCount = active.guestCount;
          active.ticketCount = null;
        }
      } else pendingSeating = seating;
      wantsSeatingChange = false;
      continue;
    }

    const removedTicket = ticketPool.find((ticket) =>
      isRemoveCatalogItem(text, ticket.title),
    );
    if (removedTicket && active) {
      for (const ticket of ticketPool) {
        if (!isRemoveCatalogItem(text, ticket.title)) continue;
        active.ticketTitles = active.ticketTitles.filter(
          (title) => title !== ticket.title,
        );
        delete active.ticketQuantities[ticket.title];
        if (pendingTicketQtyTitle === ticket.title) {
          pendingTicketQtyTitle = null;
        }
      }
      finishTicketsIfTablesCover(active);
      continue;
    }

    const mentionedTickets = ticketsMentionedInText(text, ticketPool);
    if (mentionedTickets.length > 0 && active) {
      for (const ticket of mentionedTickets) {
        const titleOnly = n === normalize(ticket.title);
        const change = parseTicketQtyChange(text, ticket);
        if (titleOnly || (isTicketSoldOut(ticket) && !change)) {
          pendingTicketQtyTitle = ticket.title;
          continue;
        }
        if (!change) continue;
        const current = active.ticketQuantities[ticket.title] ?? 0;
        const next =
          change.mode === "add" ? current + change.qty : change.qty;
        const stock = ticketStock(ticket);
        const capped =
          stock != null ? Math.min(Math.max(0, next), stock) : Math.max(0, next);
        if (capped <= 0) {
          active.ticketTitles = active.ticketTitles.filter(
            (title) => title !== ticket.title,
          );
          delete active.ticketQuantities[ticket.title];
          if (pendingTicketQtyTitle === ticket.title) {
            pendingTicketQtyTitle = null;
          }
          finishTicketsIfTablesCover(active);
          continue;
        }
        if (!active.ticketTitles.includes(ticket.title)) {
          active.ticketTitles.push(ticket.title);
        }
        active.ticketQuantities[ticket.title] = capped;
        pendingTicketQtyTitle = ticket.title;
      }
      continue;
    }

    const removedDrink = drinkPool.find((drink) =>
      isRemoveCatalogItem(text, drink.title),
    );
    if (removedDrink && active) {
      for (const drink of drinkPool) {
        if (!isRemoveCatalogItem(text, drink.title)) continue;
        active.drinkTitles = active.drinkTitles.filter(
          (title) => title !== drink.title,
        );
        delete active.drinkQuantities[drink.title];
        if (pendingDrinkQtyTitle === drink.title) {
          pendingDrinkQtyTitle = null;
        }
      }
      continue;
    }

    const mentioned = drinksMentionedInText(text, drinkPool);
    if (mentioned.length > 0 && active) {
      for (const drink of mentioned) {
        const change = parseDrinkQtyChange(text, drink);
        if (!change) continue;
        const current = active.drinkQuantities[drink.title] ?? 0;
        const next =
          change.mode === "add" ? current + change.qty : change.qty;
        const stock = drink.availableQuantity;
        const capped =
          stock != null ? Math.min(Math.max(0, next), stock) : Math.max(0, next);
        if (capped <= 0) {
          active.drinkTitles = active.drinkTitles.filter(
            (title) => title !== drink.title,
          );
          delete active.drinkQuantities[drink.title];
          continue;
        }
        if (!active.drinkTitles.includes(drink.title)) {
          active.drinkTitles.push(drink.title);
        }
        active.drinkQuantities[drink.title] = capped;
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
  return /\b(pay in full|pay a table deposit|pay the deposit|pay now|pay with (card|paypal|stripe|worldpay|klarna)|pay by (card|bank))\b/i.test(
    text,
  );
}

export function parseChatPaymentGatewaySlug(text: string): string | null {
  const n = normalize(text);
  if (/\bpaypal\b/.test(n)) return "paypal";
  if (/\bbank transfer\b/.test(n)) return "stripe_bank";
  if (/\bklarna\b/.test(n)) return "klarna";
  if (/\bworldpay\b/.test(n)) return "worldpay";
  if (/\b(card|stripe|credit card|debit card)\b/.test(n)) return "stripe";
  return null;
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
    isNoTicketsText(text) ||
    isChatCheckoutHandoffIntent(text) ||
    isDatesDoneText(text) ||
    isSameAsLastText(text) ||
    isChangeGuestsText(text) ||
    isChangeSeatingText(text) ||
    isChangeTablesText(text) ||
    isChangeTicketsText(text) ||
    isChangeDrinksText(text) ||
    isChangeDateText(text) ||
    n === normalize(CHAT_ASK_VENUE_SEND) ||
    n === normalize(CHAT_RAISE_ENQUIRY_SEND) ||
    isChatTableCapacityQuestion(text) ||
    isChatTableNeedQuestion(text) ||
    isSoftNoThanks(text) ||
    n === normalize(CHAT_USE_TABLE_PLAN_SEND) ||
    n === normalize(CHAT_MIX_TABLES_SEND) ||
    n === normalize(CHAT_TABLE_MIX_DONE_SEND) ||
    n === normalize(CHAT_ALL_AT_TABLES_SEND) ||
    n === normalize(CHAT_TYPE_TABLE_GUESTS_SEND) ||
    n.startsWith(normalize("I'll type the quantity for")) ||
    n.startsWith(normalize("I'll type the ticket quantity for")) ||
    n === normalize(CHAT_TICKETS_DONE_SEND) ||
    n === normalize(CHAT_NO_TICKETS_SEND)
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
  return (
    extractGuestCount(text) != null ||
    parsePartySizeChange(text, { allowImpliedBare: true }) != null
  );
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
  if (isLiveEventAvailabilityQuestion(text)) return false;
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
  if (isBrochureQuestion(text) || isBroadEventListIntent(text)) return false;
  if (isLiveEventAvailabilityQuestion(text)) return false;
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

function dateGuestCap(date?: ChatBookingDate): number {
  if (!date) return 40;
  const ticketCap = date.tickets.reduce((sum, ticket) => {
    const stock = ticketStock(ticket);
    return sum + (stock != null && stock > 0 ? stock : 0);
  }, 0);
  const tableCap = date.tables.reduce((sum, table) => {
    const remaining = table.remaining ?? table.total ?? 0;
    const seats = table.maxPersons || 0;
    return sum + Math.max(0, remaining) * Math.max(0, seats);
  }, 0);
  const cap = Math.max(ticketCap, tableCap);
  return cap > 0 ? Math.min(cap, 200) : 40;
}

function guestChoiceActions(date?: ChatBookingDate): ChatQuickActionDraft[] {
  const cap = dateGuestCap(date);
  const presets = [2, 4, 10, 20].filter((n) => n <= cap);
  return [
    ...presets.map((n) => ({
      id: `guests-${n}`,
      label: `${n} guests`,
      sendText: `${n} guests`,
    })),
    {
      id: "guests-type",
      label: "I’ll type a number",
      sendText: "I'll type the guest number",
    },
  ];
}

function tableCapacityHostCopy(
  slot: ChatBookingSlot,
  requested: number,
): { maxGuests: number; fit: number | null; body: string } {
  const tables = slot.date.tables;
  const { maxGuests, lines } = chatTablesSeatCapacity(tables);
  const fit = largestFittingGuestCount(tables, Math.max(1, requested));
  const list =
    lines.length > 0
      ? lines.join("\n")
      : "No table types with stock are listed for this date.";
  const intro =
    maxGuests > 0
      ? `On **${slotHeading(slot)}** I can seat at most **${maxGuests} guests** with the tables left:\n${list}`
      : `On **${slotHeading(slot)}** I don’t have table stock that can seat that many guests.\n${list}`;
  return { maxGuests, fit, body: intro };
}

function tableCapacityActions(
  date: ChatBookingDate,
  brief: ChatEventBookingBrief,
  fit: number | null,
): ChatQuickActionDraft[] {
  const guests = guestChoiceActions(date);
  const extras: ChatQuickActionDraft[] = [];
  if (
    fit != null &&
    !guests.some((action) => action.sendText === `${fit} guests`)
  ) {
    extras.push({
      id: `guests-fit-${fit}`,
      label: `${fit} guests`,
      sendText: `${fit} guests`,
    });
  }
  return [
    ...extras,
    ...guests,
    {
      id: "change-guests",
      label: "Change guests",
      sendText: CHAT_CHANGE_GUESTS_SEND,
    },
    buildVisitEventQuickAction(brief),
  ];
}

function dateCanSeatParty(
  date: ChatBookingDate,
  guests: number,
): "tables" | "tickets" | null {
  if (date.soldOut || guests < 1) return null;
  if (
    date.tables.length > 0 &&
    recommendedChatTablePlan(date.tables, guests)
  ) {
    return "tables";
  }
  const ticketCap = date.tickets.reduce((sum, ticket) => {
    const stock = ticketStock(ticket);
    return sum + (stock != null && stock > 0 ? stock : 0);
  }, 0);
  if (ticketCap >= guests) return "tickets";
  return null;
}

function otherDatesForParty(
  brief: ChatEventBookingBrief,
  slot: ChatBookingSlot,
  guests: number,
): ChatBookingDate[] {
  const currentKey = chatDateSlotKey(slot.date);
  return listChatDatesForRoom(brief, slot.roomId).filter((date) => {
    if (chatDateSlotKey(date) === currentKey) return false;
    return dateCanSeatParty(date, guests) != null;
  });
}

function venueContactLines(contact?: ChatVenueContact | null): string {
  const phone = contact?.phone?.trim();
  const email = contact?.email?.trim();
  const lines = [
    phone ? `Phone: **${phone}**` : "",
    email ? `Email: **${email}**` : "",
  ].filter(Boolean);
  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

function venueHelpActions(): ChatQuickActionDraft[] {
  return [
    {
      id: "ask-venue",
      label: "Ask the venue",
      sendText: CHAT_ASK_VENUE_SEND,
    },
    {
      id: "raise-enquiry",
      label: "Raise a venue enquiry",
      sendText: CHAT_RAISE_ENQUIRY_SEND,
    },
    {
      id: "contact-venue",
      label: "Contact the venue",
      href: "/contact",
    },
  ];
}

function seatingCannotFitTurn(
  slot: ChatBookingSlot,
  brief: ChatEventBookingBrief,
  tableGuests: number,
  contact?: ChatVenueContact | null,
): ChatHostBookingTurn {
  const capacity = tableCapacityHostCopy(slot, tableGuests);
  const otherDates = otherDatesForParty(brief, slot, tableGuests).slice(0, 4);
  const dateActions = otherDates.map((date) => ({
    id: `fit-date-${chatDateSlotKey(date)}`,
    label: formatChatDateChoiceSendText(date),
    hint:
      dateCanSeatParty(date, tableGuests) === "tickets"
        ? "tickets"
        : "tables",
    sendText: formatChatDateChoiceSendText(date),
  }));
  const canTickets = dateOffersTickets(slot.date);
  const optionLines: string[] = [];
  if (capacity.fit) {
    optionLines.push(
      `I can plan for **${capacity.fit} guests** on this date.`,
    );
  }
  if (otherDates.length > 0) {
    optionLines.push(
      `These other dates can take **${tableGuests}**:\n${otherDates
        .map((date) => `- **${formatChatDateChoiceSendText(date)}**`)
        .join("\n")}`,
    );
  }
  if (canTickets) {
    optionLines.push(
      `This date also has tickets — I can book **${tableGuests} tickets** instead of tables.`,
    );
  }
  const help =
    optionLines.length > 0
      ? optionLines.join("\n\n")
      : `I don’t have another date or table size in chat that fits **${tableGuests}**. Ask the venue — they can check a larger table, another room, or a private hire.${venueContactLines(contact)}`;
  const venueBit =
    optionLines.length > 0
      ? `\n\nIf none of those work, ask the venue or raise an enquiry.${venueContactLines(contact)}`
      : "";
  return {
    content: `${capacity.body}\n\nI can’t fit **${tableGuests} guests** on those table sizes (each has a min and max).\n\n${help}${venueBit}`,
    actions: [
      ...dateActions,
      ...(canTickets
        ? [
            {
              id: "seating-tickets-instead",
              label: "Book tickets instead",
              sendText: "tickets only",
            },
          ]
        : []),
      ...tableCapacityActions(slot.date, brief, capacity.fit).filter(
        (action) => action.id !== "visit-event",
      ),
      ...venueHelpActions(),
      buildVisitEventQuickAction(brief),
    ],
  };
}

function noTicketsTablesAction(): ChatQuickActionDraft {
  return {
    id: "no-tickets",
    label: "No tickets — tables only",
    sendText: CHAT_NO_TICKETS_SEND,
  };
}

function checkoutTicketActions(have: number): ChatQuickActionDraft[] {
  if (have <= 0) return [];
  return [
    {
      id: "tickets-done",
      label: "That's all for tickets",
      sendText: CHAT_TICKETS_DONE_SEND,
    },
    {
      id: "open-checkout",
      label: "Go to checkout",
      sendText: CHAT_OPEN_CHECKOUT_SEND,
      href: CHECKOUT_PATH,
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

export function buildBookingVenueEnquiryDraft(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  userName?: string | null;
}): string {
  const slot = options.choices.slots[options.choices.slots.length - 1];
  const guests = slot?.guestCount ?? options.choices.guestCount;
  const location = formatChatLocationLabel(options.brief);
  const when = slot ? slotHeading(slot) : "";
  const capacity = slot ? chatTablesSeatCapacity(slot.date.tables) : null;
  const fit =
    slot && guests != null
      ? largestFittingGuestCount(slot.date.tables, guests)
      : null;
  const name = options.userName?.trim();
  const lines = [
    "Hello,",
    "",
    `I am trying to book ${options.brief.title}${location ? ` in ${location}` : ""}${when ? ` on ${when}` : ""}${guests != null ? ` for ${guests} guests` : ""}.`,
  ];
  if (guests != null && capacity && capacity.maxGuests > 0 && guests > capacity.maxGuests) {
    lines.push(
      "",
      `I cannot book this group in chat — the tables left on that date seat at most ${capacity.maxGuests} guests.`,
    );
    if (capacity.lines.length > 0) {
      lines.push(
        capacity.lines
          .map((line) => line.replace(/\*\*/g, ""))
          .join(" "),
      );
    }
    if (fit != null && fit < guests) {
      lines.push(
        `The largest party I can complete in chat on this date is ${fit} guests. I still need seating or a private hire for ${guests} people.`,
      );
    } else {
      lines.push(
        `I still need seating or a private hire for ${guests} people.`,
      );
    }
  } else {
    lines.push(
      "",
      "Please confirm whether you can accommodate this booking, or suggest another date or room.",
    );
  }
  lines.push("", "Please let me know what you can offer.", "");
  lines.push(name ? `Thank you, ${name}.` : "Thank you.");
  return lines.join("\n");
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

function moneyLabel(
  amount: number | null | undefined,
  symbol?: string,
): string | undefined {
  const text = formatChatMoney(amount, symbol);
  return text || undefined;
}

function estimateLineTotal(
  choices: ChatBookingChoices,
  brief: ChatEventBookingBrief,
): {
  tableTotal: number;
  ticketTotal: number;
  drinkTotal: number;
  items: ChatBookingSummaryItem[];
  slots: ChatBookingSlot[];
} {
  const symbol = brief.currencySymbol;
  const items: ChatBookingSummaryItem[] = [];
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
    const heading = slotHeading(slot);
    const { tableGuests, ticketQty } = resolveSlotTableAndTicketCounts(slot);

    if (date && tableGuests > 0 && slot.seating !== "tickets") {
      if (slot.tablePlan.length > 0) {
        for (const item of slot.tablePlan) {
          const seated = item.allocation.reduce((sum, count) => sum + count, 0);
          if (item.price != null) tableTotal += item.price * seated;
          const unit = moneyLabel(item.price, symbol);
          items.push({
            kind: "table",
            slotHeading: heading,
            qty: item.quantity,
            name: chatTableLabel(item),
            unitPrice: unit ? `${unit}/guest` : undefined,
            meta: seated > 0 ? `${seated} guests` : undefined,
            amount: moneyLabel(
              item.price != null ? item.price * seated : null,
              symbol,
            ),
          });
        }
      } else {
        const table = date.tables[0];
        if (table?.price != null) {
          tableTotal += table.price * tableGuests;
          const unit = moneyLabel(table.price, symbol);
          items.push({
            kind: "table",
            slotHeading: heading,
            qty: 1,
            name: chatTableLabel(table),
            unitPrice: unit ? `${unit}/guest` : undefined,
            meta: `${tableGuests} guests`,
            amount: moneyLabel(table.price * tableGuests, symbol),
          });
        } else if (date.fromPrice != null) {
          tableTotal += date.fromPrice * tableGuests;
          items.push({
            kind: "table",
            slotHeading: heading,
            qty: tableGuests,
            name: "Tables",
            unitPrice: moneyLabel(date.fromPrice, symbol),
            meta: `${tableGuests} guests`,
            amount: moneyLabel(date.fromPrice * tableGuests, symbol),
          });
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
          const unit = moneyLabel(ticket.price, symbol);
          items.push({
            kind: "ticket",
            slotHeading: heading,
            qty,
            name: ticket.title,
            unitPrice: unit ? `${unit} each` : undefined,
            amount: moneyLabel(
              ticket.price != null ? ticket.price * qty : null,
              symbol,
            ),
          });
        }
      } else {
        const ticket = date.tickets[0];
        if (ticket?.price != null) {
          ticketTotal += ticket.price * ticketQty;
          const unit = moneyLabel(ticket.price, symbol);
          items.push({
            kind: "ticket",
            slotHeading: heading,
            qty: ticketQty,
            name: ticket.title,
            unitPrice: unit ? `${unit} each` : undefined,
            amount: moneyLabel(ticket.price * ticketQty, symbol),
          });
        } else if (date.fromPrice != null && slot.seating === "tickets") {
          ticketTotal += date.fromPrice * ticketQty;
          items.push({
            kind: "ticket",
            slotHeading: heading,
            qty: ticketQty,
            name: "Tickets",
            unitPrice: moneyLabel(date.fromPrice, symbol),
            amount: moneyLabel(date.fromPrice * ticketQty, symbol),
          });
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
      const unit = moneyLabel(drink.price, symbol);
      items.push({
        kind: "drink",
        slotHeading: heading,
        qty,
        name: drink.title,
        unitPrice: unit ? `${unit} each` : undefined,
        amount: moneyLabel(
          drink.price != null ? drink.price * qty : null,
          symbol,
        ),
      });
    }
  }

  return { tableTotal, ticketTotal, drinkTotal, items, slots };
}

function formatSummaryItemLine(item: ChatBookingSummaryItem): string {
  const detail = [item.unitPrice, item.meta].filter(Boolean).join(" · ");
  const amount = item.amount ? ` — ${item.amount}` : "";
  return `- ${item.qty} × ${item.name}${detail ? ` · ${detail}` : ""}${amount}`;
}

function formatSummaryKindBlock(
  items: ChatBookingSummaryItem[],
  kind: ChatBookingSummaryItem["kind"],
  heading: string,
): string {
  const rows = items.filter((item) => item.kind === kind);
  if (rows.length === 0) return "";
  return `**${heading}**\n${rows.map(formatSummaryItemLine).join("\n")}`;
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
        label: `Set to ${available} × ${drink.title}`,
        sendText: `${available} × ${drink.title}`,
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

function overstockTicketTurn(options: {
  brief: ChatEventBookingBrief;
  ticket: ChatBookingTicket;
  requested: number;
  nameBit: string;
}): ChatHostBookingTurn | null {
  const available = ticketStock(options.ticket);
  if (available == null || options.requested <= available) return null;
  const title = options.ticket.title;
  return {
    content: `We only have **${available}** ${title} tickets left${options.nameBit} — I can’t book **${options.requested}**. I’ve set **${available}**.`,
    actions: [
      {
        id: `ticket-stock-${options.ticket.id || title}`,
        label: `Set to ${available} × ${title}`,
        sendText: `${available} × ${title}`,
      },
      {
        id: "tickets-done",
        label: "That's all for tickets",
        sendText: CHAT_TICKETS_DONE_SEND,
      },
    ],
  };
}

function payActions(options: {
  depositAvailable: boolean;
}): ChatQuickActionDraft[] {
  const methods: ChatQuickActionDraft[] = [
    {
      id: CHAT_PAY_FULL_ID,
      label: "Pay in full",
      sendText: "Pay in full",
    },
  ];
  if (options.depositAvailable) {
    methods.push({
      id: CHAT_PAY_DEPOSIT_ID,
      label: "Pay a table deposit",
      sendText: "Pay a table deposit",
    });
  }
  return methods;
}

function summaryEditActions(
  brief: ChatEventBookingBrief,
  slots: ChatBookingSlot[],
): ChatQuickActionDraft[] {
  const slot = slots[slots.length - 1];
  if (!slot) return [];
  const actions: ChatQuickActionDraft[] = [];
  if (slot.seating === "tables" || slot.seating === "both") {
    actions.push({
      id: "change-guests",
      label: "Change guests",
      sendText: CHAT_CHANGE_GUESTS_SEND,
    });
    actions.push({
      id: "change-tables",
      label: "Change tables",
      sendText: CHAT_CHANGE_TABLES_SEND,
    });
  }
  if (slot.seating === "tickets" || slot.seating === "both") {
    actions.push({
      id: "change-tickets",
      label: "Change tickets",
      sendText: CHAT_CHANGE_TICKETS_SEND,
    });
  }
  if (listChatDrinks(brief, slot.roomId).length > 0) {
    actions.push({
      id: "change-drinks",
      label: "Change drinks",
      sendText: CHAT_CHANGE_DRINKS_SEND,
    });
  }
  actions.push({
    id: "change-date",
    label: "Change date",
    sendText: "change the date",
  });
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
    const withinStock = (qty: number) =>
      qty >= 1 && (stock == null || qty <= stock);
    const setTargets = [2, 3, 5].filter(
      (qty) => qty !== current && withinStock(qty),
    );
    for (const qty of setTargets.slice(0, 2)) {
      const sendText = drinkQtySend(title, qty);
      if (seen.has(sendText)) continue;
      seen.add(sendText);
      actions.push({
        id: `drink-set-${title}-${qty}`,
        label: `Set to ${qty} × ${title}`,
        hint: "replaces the current number",
        sendText,
      });
    }
    const addTargets = [1, 5].filter((qty) => withinStock(current + qty));
    for (const qty of addTargets.slice(0, 2)) {
      const sendText = drinkAddSend(title, qty);
      if (seen.has(sendText)) continue;
      seen.add(sendText);
      actions.push({
        id: `drink-add-${title}-${qty}`,
        label: `Add ${qty} more`,
        hint: `makes ${current + qty} × ${title}`,
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
  return [...actions.slice(0, 6), ...(typeAction ? [typeAction] : [])];
}

function ticketChoiceActions(
  tickets: ChatBookingTicket[],
  symbol: string | undefined,
  selected: string[],
): ChatQuickActionDraft[] {
  const remaining = tickets.filter(
    (ticket) =>
      !isTicketSoldOut(ticket) &&
      !selected.some((title) => normalize(title) === normalize(ticket.title)),
  );
  return remaining.slice(0, 6).map((ticket) => ({
    id: `ticket-${ticket.id || ticket.title}`,
    label: formatChatTicketLabel(ticket, symbol),
    hint: ticketStockHint(ticket),
    sendText: ticket.title,
  }));
}

function ticketQuantityActions(
  slot: ChatBookingSlot,
  tickets: ChatBookingTicket[],
  pendingTitle: string | null,
  needed: number,
): ChatQuickActionDraft[] {
  const actions: ChatQuickActionDraft[] = [];
  const seen = new Set<string>();
  const titles =
    pendingTitle &&
    !slot.ticketTitles.some((title) => normalize(title) === normalize(pendingTitle))
      ? [...slot.ticketTitles, pendingTitle]
      : slot.ticketTitles;
  for (const title of titles) {
    const ticket = tickets.find((item) => normalize(item.title) === normalize(title));
    const current = slot.ticketQuantities[title] ?? 0;
    const stock = ticket ? ticketStock(ticket) : null;
    if (ticket && isTicketSoldOut(ticket)) {
      if (current > 0) {
        const sendText = removeTicketSend(title);
        if (!seen.has(sendText)) {
          seen.add(sendText);
          actions.push({
            id: `ticket-qty-remove-${title}`,
            label: `Remove ${title}`,
            sendText,
          });
        }
      }
      continue;
    }
    const withinStock = (qty: number) =>
      qty >= 1 && (stock == null || qty <= stock);
    const others = slotPickedTicketQty({
      ...slot,
      ticketTitles: slot.ticketTitles.filter((item) => item !== title),
      ticketQuantities: { ...slot.ticketQuantities, [title]: 0 },
    });
    const stillNeed = Math.max(0, needed - others);
    const cover =
      stillNeed > 0 &&
      slot.seating !== "tickets" &&
      slot.seating !== "both" &&
      withinStock(stillNeed)
        ? [stillNeed]
        : [];
    const setTargets = [...cover, 5, 10, 2].filter(
      (qty) => qty !== current && withinStock(qty),
    );
    for (const qty of [...new Set(setTargets)].slice(0, 2)) {
      const sendText = `${qty} × ${title}`;
      if (seen.has(sendText)) continue;
      seen.add(sendText);
      actions.push({
        id: `ticket-set-${title}-${qty}`,
        label: `Set to ${qty} × ${title}`,
        hint:
          qty === stillNeed && stillNeed > 0 && slot.seating !== "tickets"
            ? "covers the rest"
            : stock != null
              ? `replaces current · ${stock} left`
              : "replaces the current number",
        sendText,
      });
    }
    if (current > 0) {
      const addTargets = [1, 5, 10].filter((qty) => withinStock(current + qty));
      for (const qty of addTargets.slice(0, 2)) {
        const sendText = ticketAddSend(title, qty);
        if (seen.has(sendText)) continue;
        seen.add(sendText);
        const next = current + qty;
        actions.push({
          id: `ticket-add-${title}-${qty}`,
          label: `Add ${qty} more`,
          hint:
            stock != null
              ? `makes ${next} · ${stock} left`
              : `makes ${next} × ${title}`,
          sendText,
        });
      }
      const sendText = removeTicketSend(title);
      if (!seen.has(sendText)) {
        seen.add(sendText);
        actions.push({
          id: `ticket-qty-remove-${title}`,
          label: `Remove ${title}`,
          sendText,
        });
      }
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
  return [...actions.slice(0, 6), ...(typeAction ? [typeAction] : [])];
}

function slotNeedsSeatingPlan(slot: ChatBookingSlot): boolean {
  if (slot.tablePlanDone) return false;
  if (slot.seating === "tickets") return false;
  if (slot.seating !== "tables" && slot.seating !== "both") return false;
  if (!dateOffersTables(slot.date)) return false;
  const tableGuests = slot.tableGuestCount ?? slot.guestCount ?? 0;
  return tableGuests > 0;
}

function slotNeedsTicketPick(slot: ChatBookingSlot): boolean {
  if (slot.seating === "tables") return false;
  if (slot.seating !== "tickets" && slot.seating !== "both") return false;
  if (!dateOffersTickets(slot.date)) return false;
  if (slotNeedsSeatingPlan(slot)) return false;
  if (slotHasTicketOverstock(slot)) return true;
  const picked = slotPickedTicketQty(slot);
  if (slot.ticketsDone) {
    if (picked > 0) return false;
    return slot.seating === "tickets" || !slotHasTablePlan(slot);
  }
  return true;
}

function buildSummaryTurn(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  userName?: string | null;
  includeCouponAsk: boolean;
  depositAvailable?: boolean;
  resumeAfterPayment?: boolean;
}): ChatHostBookingTurn {
  const { brief, choices } = options;
  const nameBit = options.userName?.trim()
    ? `, ${options.userName.trim()}`
    : "";
  const venue = formatEventVenuePhrase(brief);
  const symbol = brief.currencySymbol;
  const estimate = estimateLineTotal(choices, brief);
  const slots = estimate.slots;
  const subTotal =
    estimate.tableTotal + estimate.ticketTotal + estimate.drinkTotal;
  const discountable = estimate.tableTotal + estimate.ticketTotal;
  const percent = brief.coupon?.percentOff;
  const discount =
    choices.couponApplied && percent != null && discountable > 0
      ? Math.round(((discountable * percent) / 100) * 100) / 100
      : 0;
  const total = Math.max(0, subTotal - discount);

  const slotBlocks = slots.map((slot) => {
    const heading = slotHeading(slot);
    const picked = slotPickedTicketQty(slot);
    const guests =
      slot.seating === "tickets"
        ? picked > 0
          ? `${picked} ticket${picked === 1 ? "" : "s"}`
          : ""
        : slot.guestCount != null
          ? `${slot.guestCount} guest${slot.guestCount === 1 ? "" : "s"}`
          : "";
    const meta = [guests, seatingLabel(slot.seating)].filter(Boolean).join(" · ");
    return `**${heading}**${meta ? `\n${meta}` : ""}`;
  });

  const kindBlocks = [
    formatSummaryKindBlock(estimate.items, "table", "Tables"),
    formatSummaryKindBlock(estimate.items, "ticket", "Tickets"),
    formatSummaryKindBlock(estimate.items, "drink", "Drinks"),
  ].filter(Boolean);

  const offerCopy = dateOfferLines(
    slots.map((slot) => slot.date),
    listChatDatesForRoom(brief, choices.pendingRoomId ?? choices.roomId),
  ).trim();

  const totals: string[] = [];
  const couponNotes: string[] = [];
  if (subTotal > 0) {
    totals.push(`**Subtotal:** ${formatChatMoney(subTotal, symbol)}`);
  }
  if (choices.couponApplied && brief.coupon) {
    const badge =
      percent != null
        ? `${percent}% off tables and tickets`
        : brief.coupon.badge || "tables and tickets";
    couponNotes.push(`Coupon applied: **${brief.coupon.code}** · ${badge}`);
    couponNotes.push("Drinks stay full price.");
    if (discount > 0) {
      totals.push(`**Discount:** −${formatChatMoney(discount, symbol)}`);
      totals.push(`**Total:** ${formatChatMoney(total, symbol)}`);
    } else if (subTotal > 0) {
      totals.push(
        `**Total so far:** ${formatChatMoney(subTotal, symbol)} (exact table/ticket saving is confirmed at payment).`,
      );
    }
  } else if (brief.coupon && !choices.couponApplied && !choices.couponSkipped) {
    const badge =
      brief.coupon.badge || (percent != null ? `${percent}% off` : "");
    couponNotes.push(
      `Coupon **${brief.coupon.code}**${badge ? ` · ${badge}` : ""} applies to tables and tickets (drinks stay full price).`,
    );
  }

  const prompt = options.includeCouponAsk && brief.coupon?.code
    ? `Would you like to apply **${brief.coupon.code}**?`
    : options.resumeAfterPayment
      ? "Payment is closed — nothing was charged. Update this booking, or pay when you’re ready."
      : `Ready to pay from here?${
          options.depositAvailable === true
            ? " You can pay in full or pay a table deposit."
            : ""
        }`;

  const body = [
    `Here’s your booking summary${nameBit} — **${brief.title}**${venue}.`,
    slotBlocks.join("\n\n"),
    kindBlocks.join("\n\n"),
    couponNotes.join("\n"),
    totals.join("\n"),
    offerCopy,
  ]
    .filter(Boolean)
    .join("\n\n");

  const summary: ChatBookingSummaryCard = {
    eventTitle: brief.title,
    venue: formatChatLocationLabel(brief) || undefined,
    greeting: `Here’s your booking summary${nameBit}`,
    slots: slots.map((slot) => {
      const picked = slotPickedTicketQty(slot);
      const guests =
        slot.seating === "tickets"
          ? picked > 0
            ? `${picked} ticket${picked === 1 ? "" : "s"}`
            : undefined
          : slot.guestCount != null
            ? `${slot.guestCount} guest${slot.guestCount === 1 ? "" : "s"}`
            : undefined;
      return {
        heading: slotHeading(slot),
        guests,
        seating: seatingLabel(slot.seating),
      };
    }),
    items: estimate.items,
    couponNote: [...couponNotes, offerCopy].filter(Boolean).join(" ").replace(/\*\*/g, "") || undefined,
    subtotal: moneyLabel(subTotal, symbol),
    discount: discount > 0 ? moneyLabel(discount, symbol) : undefined,
    total: moneyLabel(total, symbol),
    prompt,
  };

  return {
    content: `${body}\n\n${prompt}`,
    actions:
      options.includeCouponAsk && brief.coupon?.code
        ? couponActions(brief)
        : [
            ...payActions({
              depositAvailable: options.depositAvailable === true,
            }),
            ...summaryEditActions(brief, slots),
          ],
    summary,
  };
}

export function buildChatPaymentClosedTurn(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  userName?: string | null;
  depositAvailable?: boolean;
}): ChatHostBookingTurn {
  return buildSummaryTurn({
    ...options,
    includeCouponAsk: false,
    resumeAfterPayment: true,
  });
}

function slotsReadyForSummary(
  brief: ChatEventBookingBrief,
  choices: ChatBookingChoices,
): boolean {
  if (choices.slots.length === 0) return false;
  const complete = choices.slots.every((slot) => {
    if (!slot.seating) return false;
    if (slotNeedsGuestCount(slot)) return false;
    if (slot.seating === "tickets" && slotPickedTicketQty(slot) < 1) return false;
    if (slot.seating !== "tickets" && slot.guestCount == null) return false;
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
  paymentGateways?: Array<{ slug: string; label: string }>;
  depositAvailable?: boolean;
  resumeAfterPayment?: boolean;
  venueContact?: ChatVenueContact | null;
}): ChatHostBookingTurn | null {
  const { brief, userText, choices, userName } = options;
  const venueContact = options.venueContact ?? null;
  const nameBit = userName?.trim() ? `, ${userName.trim()}` : "";
  const venue = formatEventVenuePhrase(brief);
  const bookable = listBookableChatRooms(brief);
  const last = userText.trim();
  const active = choices.slots[choices.slots.length - 1];
  const drinks = listChatDrinks(brief, active?.roomId ?? choices.roomId);

  for (const drink of drinks) {
    const change = parseDrinkQtyChange(last, drink);
    if (!change) continue;
    const current = active?.drinkQuantities[drink.title] ?? 0;
    const requested =
      change.mode === "add" ? current + change.qty : change.qty;
    if (requested <= 1) continue;
    const over = overstockDrinkTurn(
      brief,
      drink,
      requested,
      active?.roomId ?? choices.roomId,
    );
    if (over) return over;
  }

  if (isEventInfoQuestion(last) && !asksRoomDifference(last)) {
    const wantsAllRooms = brochureQuestionWantsAllRooms(last);
    const info = buildEventInfoTurn({
      brief,
      userText: last,
      roomId: wantsAllRooms ? null : (active?.roomId ?? choices.roomId),
    });
    if (info) {
      if (active && slotNeedsGuestCount(active)) {
        return {
          content: `${info.content}\n\nWhen you’re ready, how many guests will be attending?`,
          actions: [...info.actions, ...guestChoiceActions(active.date)],
        };
      }
      if (choices.slots.length === 0) {
        const dateActions = buildDateChoiceQuickActions(
          brief,
          choices.pendingRoomId,
        );
        if (dateActions.length > 0) {
          return {
            content: `${info.content}\n\nWhen you’re ready, which date would you like?`,
            actions: [...info.actions, ...dateActions],
          };
        }
      }
      return info;
    }
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
    if (isChangeDateText(last) && dateActions.length > 0) {
      return {
        content: `No problem${nameBit} — which date would you like instead?`,
        actions: dateActions,
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
      content: buildBookingKickoffCopy({ brief, userName }),
      actions: [
        ...dateActions,
        ...(bookable.length >= 2 && chatDatesShowRooms(brief, roomId)
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

  if (
    normalize(last) === normalize(CHAT_ASK_VENUE_SEND) ||
    normalize(last) === normalize(CHAT_RAISE_ENQUIRY_SEND)
  ) {
    const guests = active.guestCount;
    return {
      content: `I can’t book that group${guests != null ? ` of **${guests}**` : ""} on **${slotHeading(active)}** in chat${nameBit}.\n\nAsk the venue — they can check a larger table, another room, or a private hire.${venueContactLines(venueContact)}\n\nRaise an enquiry and the team will get back to you, or use the contact details above.`,
      actions: [
        ...(normalize(last) === normalize(CHAT_RAISE_ENQUIRY_SEND)
          ? []
          : [
              {
                id: "raise-enquiry",
                label: "Raise a venue enquiry",
                sendText: CHAT_RAISE_ENQUIRY_SEND,
              },
            ]),
        {
          id: "enquiry-form",
          label: "Open enquiry form",
          href: "/customer/support/new",
        },
        {
          id: "contact-venue",
          label: "Contact the venue",
          href: "/contact",
        },
        buildVisitEventQuickAction(brief),
      ],
    };
  }

  if (
    dateOffersTables(active.date) &&
    (isChatTableNeedQuestion(last) || isChatTableCapacityQuestion(last))
  ) {
    const requested =
      extractGuestCount(last) ??
      parsePartySizeChange(last, { allowImpliedBare: true })?.qty ??
      active.tableGuestCount ??
      active.guestCount;
    if (requested != null && requested > 0) {
      const recommended = recommendedChatTablePlan(
        active.date.tables,
        requested,
      );
      if (recommended) {
        return {
          content: `For **${requested} guests** on **${slotHeading(active)}** you’d need:\n${formatChatSeatingPlan(recommended)}\n\nI split people using each table’s min–max.`,
          actions: [
            ...(!active.tablePlanDone
              ? [
                  {
                    id: "table-use-plan",
                    label: "Use this seating plan",
                    sendText: CHAT_USE_TABLE_PLAN_SEND,
                  },
                ]
              : []),
            {
              id: "change-guests",
              label: "Change guests",
              sendText: CHAT_CHANGE_GUESTS_SEND,
            },
            {
              id: "change-tables",
              label: "Change tables",
              sendText: CHAT_CHANGE_TABLES_SEND,
            },
          ],
        };
      }
      return seatingCannotFitTurn(active, brief, requested, venueContact);
    }
    const capacity = tableCapacityHostCopy(active, dateGuestCap(active.date));
    return {
      content: `${capacity.body}\n\nHow many guests will be attending?`,
      actions: tableCapacityActions(active.date, brief, capacity.fit),
    };
  }

  if (!active.seating) {
    if (
      choices.slots.length > 1 &&
      !choices.wantsGuestChange &&
      !choices.wantsSeatingChange
    ) {
      const prev = choices.slots[choices.slots.length - 2];
      if (prev?.seating && active.seating == null) {
        const sameBit =
          prev.seating === "tickets" || prev.guestCount == null
            ? `use **${seatingLabel(prev.seating)}** like your last date`
            : `use **${prev.guestCount} guests** and **${seatingLabel(prev.seating)}** like your last date`;
        return {
          content: `Added **${slotHeading(active)}**${nameBit}.\n\nFor this date, ${sameBit}, or change?`,
          actions: [
            {
              id: "same-as-last",
              label: "Same as last date",
              sendText: CHAT_SAME_AS_LAST_SEND,
            },
            ...(prev.seating !== "tickets"
              ? [
                  {
                    id: "change-guests",
                    label: "Change guests",
                    sendText: CHAT_CHANGE_GUESTS_SEND,
                  } satisfies ChatQuickActionDraft,
                ]
              : []),
            {
              id: "change-seating",
              label: "Change seating",
              sendText: CHAT_CHANGE_SEATING_SEND,
            },
          ],
        };
      }
    }
    const seating = seatingActions(active.date);
    return {
      content: `Great${nameBit} — **${brief.title}**${venue} on **${slotHeading(active)}**.\n\n${seating.prose}`,
      actions:
        seating.actions.length > 0
          ? seating.actions
          : [buildVisitEventQuickAction(brief)],
    };
  }

  if (slotNeedsGuestCount(active)) {
    if (isChatTableCapacityQuestion(last) && dateOffersTables(active.date)) {
      const requested = extractGuestCount(last) ?? dateGuestCap(active.date);
      const capacity = tableCapacityHostCopy(active, requested);
      return {
        content: `${capacity.body}\n\nHow many guests will be attending?`,
        actions: tableCapacityActions(active.date, brief, capacity.fit),
      };
    }
    if (/i'?ll type the guest number/i.test(last)) {
      const { maxGuests } = dateOffersTables(active.date)
        ? chatTablesSeatCapacity(active.date.tables)
        : { maxGuests: 0 };
      const maxBit =
        maxGuests > 0
          ? ` This date can seat at most **${maxGuests} guests** with the tables left.`
          : "";
      return {
        content: `No problem${nameBit} — type how many guests will be attending${choices.slots.length > 1 ? ` on **${slotHeading(active)}**` : ""}.${maxBit}`,
        actions: [],
      };
    }
    const typedTooBig = extractGuestCount(last);
    if (
      typedTooBig != null &&
      dateOffersTables(active.date) &&
      !recommendedChatTablePlan(active.date.tables, typedTooBig)
    ) {
      return seatingCannotFitTurn(active, brief, typedTooBig, venueContact);
    }
    return {
      content: `Great${nameBit} — **${brief.title}**${venue} on **${slotHeading(active)}**.\n\nHow many guests will be attending?`,
      actions: guestChoiceActions(active.date),
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

    if (isChatTableCapacityQuestion(last)) {
      const capacity = tableCapacityHostCopy(active, tableGuests);
      if (recommended) {
        return {
          content: `${capacity.body}\n\n**${tableGuests} guests** does fit. I recommend:\n${formatChatSeatingPlan(recommended)}\n\nYou can use this plan, pick one table size, or mix sizes.`,
          actions: [
            {
              id: "table-use-plan",
              label: "Use this seating plan",
              sendText: CHAT_USE_TABLE_PLAN_SEND,
            },
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
      return seatingCannotFitTurn(active, brief, tableGuests, venueContact);
    }

    if (!recommended && typeActions.length === 0) {
      return seatingCannotFitTurn(active, brief, tableGuests, venueContact);
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

  for (const ticket of active.date.tickets) {
    const change = parseTicketQtyChange(last, ticket);
    const current = active.ticketQuantities[ticket.title] ?? 0;
    const stock = ticketStock(ticket);
    let requested: number | null = change
      ? change.mode === "add"
        ? stock != null && current >= stock
          ? current + change.qty
          : current
        : change.qty
      : null;
    if (requested == null && parseTypedTicketQuantity(last) != null) {
      const qty = parseTypedTicketQuantity(last);
      if (qty != null) {
        const pendingMatch =
          Boolean(choices.pendingTicketQtyTitle) &&
          normalize(choices.pendingTicketQtyTitle!) === normalize(ticket.title);
        const justCapped =
          stock != null &&
          qty > stock &&
          current === Math.min(qty, stock);
        if (pendingMatch || justCapped) {
          requested = qty;
        }
      }
    }
    if (requested == null) continue;
    const over = overstockTicketTurn({
      brief,
      ticket,
      requested,
      nameBit,
    });
    if (over) return over;
  }

  const party = resolveSlotTableAndTicketCounts(active);
  const openTicketQty =
    active.seating === "tickets" || active.seating === "both";
  const ticketsNeeded = openTicketQty
    ? slotPickedTicketQty(active)
    : party.ticketQty > 0
      ? party.ticketQty
      : Math.max(0, (active.guestCount ?? 0) - (active.tableGuestCount ?? 0));

  if (choices.pendingTicketQtyTitle) {
    const pendingTitle = choices.pendingTicketQtyTitle;
    const pendingTicket = active.date.tickets.find(
      (item) => normalize(item.title) === normalize(pendingTitle),
    );
    const pendingStock = pendingTicket ? ticketStock(pendingTicket) : null;
    const remainingTypes = ticketChoiceActions(
      active.date.tickets,
      brief.currencySymbol,
      active.ticketTitles,
    );
    if (!pendingTicket || isTicketSoldOut(pendingTicket)) {
      return {
        content: `**${pendingTitle}** is sold out for **${slotHeading(active)}**${nameBit}. ${
          openTicketQty || ticketsNeeded <= 0
            ? "Pick a type that still has stock."
            : `You still need **${ticketsNeeded} tickets** — pick a type that still has stock.`
        }`,
        actions: [
          ...ticketQuantityActions(
            active,
            active.date.tickets,
            null,
            ticketsNeeded,
          ),
          ...(remainingTypes.length > 0
            ? remainingTypes
            : [buildVisitEventQuickAction(brief)]),
        ],
      };
    }
    if (
      /i'?ll type the ticket quantity for /i.test(last)
    ) {
      const stockBit =
        pendingStock != null ? ` There are **${pendingStock}** left.` : "";
      return {
        content: `Type the new total for **${pendingTitle}** on **${slotHeading(active)}** — this replaces the current number.${stockBit}${
          pendingStock != null
            ? ` You can have at most **${pendingStock}**.`
            : ""
        }${
          openTicketQty || ticketsNeeded <= 0
            ? ""
            : ` You still need **${ticketsNeeded}**.`
        }`,
        actions: [],
      };
    }
    if (active.ticketQuantities[pendingTitle] == null) {
      const stockBit =
        pendingStock != null ? ` There are **${pendingStock}** left.` : "";
      return {
        content: `How many **${pendingTitle}** tickets would you like for **${slotHeading(active)}**?${stockBit}${
          pendingStock != null ? ` **Set to …** picks a number up to **${pendingStock}**.` : ""
        }${
          openTicketQty || ticketsNeeded <= 0
            ? ""
            : ` You still need **${ticketsNeeded}**.`
        }`,
        actions: ticketQuantityActions(
          active,
          active.date.tickets,
          pendingTitle,
          ticketsNeeded,
        ),
      };
    }
  }

  if (slotNeedsTicketPick(active)) {
    const tickets = active.date.tickets;
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
      ticketsNeeded,
    );
    const overstocked = selected.filter((title) => {
      const ticket = tickets.find((item) => normalize(item.title) === normalize(title));
      const qty = active.ticketQuantities[title] ?? 0;
      const stock = ticket ? ticketStock(ticket) : null;
      return ticket && stock != null && qty > stock;
    });
    if (selected.length === 0) {
      const tableGuests = active.guestCount ?? party.tableGuests;
      const canSkipTickets =
        active.seating === "both" && slotHasTablePlan(active);
      const ticketLead = canSkipTickets
        ? `Tables are set for **${tableGuests} guests** on **${slotHeading(active)}**${nameBit}. Tickets are optional — pick a type if you want them, or continue with tables only.`
        : active.seating === "both"
          ? `Tables are set for **${tableGuests} guests** on **${slotHeading(active)}**${nameBit}. Tickets are separate — pick a type and how many you want.`
          : `Great${nameBit} — **${brief.title}**${venue} on **${slotHeading(active)}**.`;
      return {
        content: `${ticketLead}\n\nWhich ticket type would you like? Each type shows how many are left.`,
        actions: [
          ...(remainingTypes.length > 0
            ? remainingTypes
            : [buildVisitEventQuickAction(brief)]),
          ...(canSkipTickets ? [noTicketsTablesAction()] : []),
        ],
      };
    }
    const pickedLines = selected
      .map((title) => {
        const ticket = tickets.find((item) => normalize(item.title) === normalize(title));
        const qty = active.ticketQuantities[title] ?? 0;
        const stock = ticket ? ticketStock(ticket) : null;
        if (stock != null && qty > stock) {
          return `- **${qty} × ${title}** — only **${stock}** left`;
        }
        return stock != null
          ? `- **${qty} × ${title}** · ${stock} left`
          : `- **${qty} × ${title}**`;
      })
      .join("\n");
    const have = slotPickedTicketQty(active);
    const stillNeed = Math.max(0, ticketsNeeded - have);
    const listedStock = tickets
      .filter((ticket) => !isTicketSoldOut(ticket))
      .reduce((sum, ticket) => sum + (ticketStock(ticket) ?? 0), 0);
    const stockNote =
      stillNeed > 0 && listedStock > 0 && listedStock < ticketsNeeded
        ? ` Listed stock is **${listedStock}** — add what you can, then go to checkout.`
        : "";
    if (overstocked.length > 0) {
      return {
        content: `I can’t keep that ticket mix for **${slotHeading(active)}**${nameBit}:\n${pickedLines}\n\nRemove the sold-out type or drop the quantity, then I’ll continue.`,
        actions: [
          ...qtyActions,
          ...remainingTypes,
        ],
      };
    }
    const needLine = openTicketQty
      ? have > 0
        ? `That’s **${have}** ticket${have === 1 ? "" : "s"} so far. **Set to …** replaces that number. **Add … more** increases it${
            listedStock > 0 ? `, up to **${listedStock}** left` : ""
          }.`
        : "Pick a quantity for that ticket type."
      : stillNeed > 0
        ? have > 0
          ? `You still need **${stillNeed}** more to cover **${ticketsNeeded} tickets**. You can go to checkout with **${have}** if that’s enough.${stockNote}`
          : `You still need **${stillNeed}** more to cover **${ticketsNeeded} tickets**.${stockNote}`
        : have > ticketsNeeded
          ? `That’s **${have}** tickets for **${ticketsNeeded}** guests — extra tickets are fine if you want them.`
          : `That covers your **${ticketsNeeded} tickets**.`;
    return {
      content: `Tickets so far for **${slotHeading(active)}**${nameBit}:\n${pickedLines}\n\n${needLine}`,
      actions: [
        ...qtyActions,
        ...remainingTypes,
        ...checkoutTicketActions(have),
        ...(slotHasTablePlan(active) ? [noTicketsTablesAction()] : []),
      ],
    };
  }

  if (/i'?ll type the quantity for /i.test(last) && choices.pendingDrinkQtyTitle) {
    return {
        content: `Type the new total for **${choices.pendingDrinkQtyTitle}** — this replaces the current number.`,
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
        content: `Thanks${nameBit} — ${
          active.seating === "tickets"
            ? `**${slotPickedTicketQty(active)} ticket${slotPickedTicketQty(active) === 1 ? "" : "s"}**`
            : `**${active.guestCount} guests**, ${seatingLabel(active.seating)}`
        } on **${slotHeading(active)}**.\n\nWhich drinks would you like? You can add more than one, then set the quantity.`,
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
      content: `Drinks so far for **${slotHeading(active)}**: **${picked}**${nameBit}.\n\n**Set to …** replaces that number. **Add … more** increases it.`,
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
    const showRooms = remainingDates.some((action) => Boolean(action.hint?.trim()));
    return {
      content: `That's **${slotHeading(active)}** noted${nameBit}.\n\n${
        showRooms
          ? "Would you like another date or room? Each date shows its room."
          : "Would you like another date?"
      }`,
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
      depositAvailable: options.depositAvailable,
      resumeAfterPayment: options.resumeAfterPayment,
    });
  }

  if (active) {
    return {
      content: `I’m still booking **${brief.title}**${nameBit}. Tell me the next detail, or open the event page.`,
      actions: [buildVisitEventQuickAction(brief)],
    };
  }

  return null;
}

export function toChatQuickActions(
  actions: ChatQuickActionDraft[],
): ChatQuickActionDraft[] {
  return actions.filter((action) => {
    if (
      action.id === CHAT_PAY_FULL_ID ||
      action.id === CHAT_PAY_DEPOSIT_ID ||
      action.id.startsWith("pay-gateway-")
    ) {
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
