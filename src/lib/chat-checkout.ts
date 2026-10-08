import { transformCartToCheckout } from "@/app/(public)/vendor/checkout/_lib/checkout-utils";
import {
  buildCartDateLookupKey,
  calculateEditableCartDiscountableTotal,
  extractEventsFromApiResponse,
  findApiCartEventBySlug,
  findEventBySlug,
  getApiDateData,
  isRoomBasedCart,
  apiCartHasBillableSelections,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { hasViableTablePlan } from "@/app/(public)/vendor/checkout/_lib/table-recommendations";
import {
  resolveSlotTableAndTicketCounts,
  type ChatBookingChoices,
  type ChatBookingSlot,
} from "@/lib/chat-booking-choices";
import {
  chatDateNeedsInventoryHydrate,
  chatDateSlotKey,
  chatInventoryFromCartBucket,
  listChatDrinks,
  withChatDateInventory,
  type ChatDateInventory,
  type ChatEventBookingBrief,
} from "@/lib/chat-event-booking";
import { cartService } from "@/services/customer/cart/cart.service";
import { checkoutService } from "@/services/customer/checkout/checkout.service";
import {
  resolveCheckoutPaymentAction,
  type CheckoutPaymentAction,
} from "@/services/customer/checkout/checkout-payment";
import type {
  CheckoutDateData,
  CheckoutRequest,
} from "@/services/customer/checkout/type";
import type { ApiEventCartData } from "@/lib/types/cart.types";
import type { CouponStripSource } from "@/lib/coupon-strip-props";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useCheckoutPaymentUiStore } from "@/store/checkout-payment-ui.store";
import {
  isPaymentAlreadyProcessing,
  PAYMENT_ALREADY_PROCESSING_MESSAGE,
} from "@/lib/payment-already-processing";
import { useCheckoutPromoStore } from "@/store/checkout-promo.store";
import { normalizeSlug } from "@/lib/utils";

export type ChatCheckoutFailureReason =
  | "login"
  | "incomplete"
  | "conflict"
  | "no-gateway"
  | "need-gateway"
  | "capacity"
  | "checkout"
  | "unknown";

export type ChatPaymentGatewayOption = {
  id: number;
  slug: string;
  label: string;
};

export type ChatCheckoutResult =
  | { ok: true; action: CheckoutPaymentAction; payload: CheckoutRequest }
  | {
    ok: false;
    reason: ChatCheckoutFailureReason;
    message: string;
    gateways?: ChatPaymentGatewayOption[];
  };

export type ChatCartSyncResult =
  | {
      ok: true;
      storeSlug: string;
      cartResponse: unknown;
      event: ApiEventCartData;
    }
  | {
      ok: false;
      reason: ChatCheckoutFailureReason;
      message: string;
    };

const CHAT_GATEWAY_LABELS: Record<string, string> = {
  stripe: "Pay with card",
  paypal: "Pay with PayPal",
  worldpay: "Pay with WorldPay",
  klarna: "Pay with Klarna",
  stripe_bank: "Bank Transfer",
};

export function listChatPaymentGateways(
  event: ApiEventCartData | null | undefined,
): ChatPaymentGatewayOption[] {
  const seen = new Set<string>();
  const list: ChatPaymentGatewayOption[] = [];
  for (const gateway of event?.payment_gateways ?? []) {
    const id = Number(gateway.id);
    const slug = String(gateway.slug ?? "").trim().toLowerCase();
    if (
      !Number.isFinite(id) ||
      id <= 0 ||
      !slug ||
      seen.has(slug) ||
      !CHAT_GATEWAY_LABELS[slug]
    ) {
      continue;
    }
    seen.add(slug);
    list.push({
      id,
      slug,
      label: CHAT_GATEWAY_LABELS[slug] ?? `Pay with ${slug}`,
    });
  }
  return list;
}

export function pickPaymentGatewayId(
  event: ApiEventCartData,
  preferredSlug?: string | null,
): number | null {
  const gateways = listChatPaymentGateways(event);
  if (preferredSlug) {
    const match = gateways.find((gateway) => gateway.slug === preferredSlug);
    if (match) return match.id;
  }
  if (gateways.length === 1) return gateways[0].id;
  const stripe = gateways.find((gateway) => gateway.slug === "stripe");
  return stripe?.id ?? gateways[0]?.id ?? null;
}

function couponDiscountAmount(
  coupon: CouponStripSource | null | undefined,
  discountable: number,
): number {
  if (!coupon || !(discountable > 0)) return 0;
  const type = String(
    coupon.discount_type ?? coupon.value_type ?? "",
  ).toLowerCase();
  const raw = Number(coupon.amount ?? coupon.discount_value ?? NaN);
  if (type !== "percentage" || !Number.isFinite(raw) || !(raw > 0)) return 0;
  return (
    Math.round(Math.min(discountable, (discountable * raw) / 100) * 100) / 100
  );
}

function resolveCartCoupon(
  event: ApiEventCartData,
): CouponStripSource | null {
  const nested = event.coupon ?? null;
  const nestedCode = nested?.coupon_code?.trim() ?? "";
  const root =
    typeof event.coupon_code === "string" ? event.coupon_code.trim() : "";
  const code = nestedCode || root;
  if (!code) return nested;
  if (nested) return { ...nested, coupon_code: code };
  return { coupon_code: code };
}

function checkoutSlots(choices: ChatBookingChoices): ChatBookingSlot[] {
  if (choices.slots.length > 0) return choices.slots;
  return choices.dates.map((date) => {
    const slot = {
      roomId: choices.roomId,
      roomName: choices.roomName,
      date,
      guestCount: choices.guestCount,
      seating: choices.seating,
      drinkTitles: choices.drinkTitles,
      drinkQuantities: choices.drinkQuantities,
      drinksDone: true,
      tableGuestCount:
        choices.seating === "tickets" ? 0 : choices.guestCount,
      ticketCount: choices.seating === "tickets" ? choices.guestCount : 0,
      ticketTitles: [] as string[],
      ticketQuantities: {} as Record<string, number>,
      ticketsDone: true,
      tableMix: {} as Record<string, number>,
      tablePlan: [] as ChatBookingSlot["tablePlan"],
      tablePlanDone: true,
      mixingTables: false,
    };
    return slot;
  });
}

export function bookingChoicesReadyForPay(
  brief: ChatEventBookingBrief | null | undefined,
  choices: ChatBookingChoices,
): boolean {
  if (!brief) return false;
  const slots = checkoutSlots(choices);
  if (slots.length === 0) return false;
  return slots.every((slot) => {
    if (brief.hasRooms && (slot.roomId == null || slot.roomId <= 0)) {
      return false;
    }
    if (!slot.date?.date) return false;
    if (!slot.seating) return false;
    const tickets = slot.ticketTitles.reduce(
      (sum, title) => sum + Math.max(0, slot.ticketQuantities[title] ?? 0),
      0,
    );
    const hasTickets = tickets >= 1;
    const hasTables = slot.tablePlan.some((item) => item.quantity > 0);
    if (slot.seating === "tickets") {
      if (!hasTickets) return false;
    } else if (slot.seating === "tables") {
      if (slot.guestCount == null || slot.guestCount < 1) return false;
      if (!hasTables) return false;
    } else if (slot.seating === "both") {
      if (!hasTables && !hasTickets) return false;
      if (hasTables && (slot.guestCount == null || slot.guestCount < 1)) {
        return false;
      }
    } else {
      return false;
    }
    return true;
  });
}

function sameCatalogTitle(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function pricesMatch(catalog: number, quoted: number): boolean {
  return (
    Number.isFinite(catalog) &&
    Number.isFinite(quoted) &&
    Math.abs(catalog - quoted) <= 0.02
  );
}

export function chatBookingFingerprint(
  choices: ChatBookingChoices,
  payMode: "full" | "deposit",
): string {
  const slots = checkoutSlots(choices).map((slot) => ({
    date: slot.date.date.slice(0, 10),
    roomId: slot.roomId ?? null,
    seating: slot.seating,
    guests: slot.guestCount,
    tables: slot.tablePlan
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        id: item.tableId,
        qty: item.quantity,
        min: item.minPersons,
        max: item.maxPersons,
      })),
    tickets: slot.ticketTitles
      .map((title) => ({
        title,
        qty: Math.max(0, slot.ticketQuantities[title] ?? 0),
      }))
      .filter((item) => item.qty > 0),
    drinks: slot.drinkTitles
      .map((title) => ({
        title,
        qty: Math.max(0, slot.drinkQuantities[title] ?? 0),
      }))
      .filter((item) => item.qty > 0),
  }));
  return JSON.stringify({
    payMode,
    coupon: Boolean(choices.couponApplied),
    slots,
  });
}

export function chatChoicesMatchCatalog(
  brief: ChatEventBookingBrief,
  choices: ChatBookingChoices,
): { ok: true } | { ok: false; reason: ChatCheckoutFailureReason; message: string } {
  for (const slot of checkoutSlots(choices)) {
    const date = slot.date;
    if (slot.seating === "tickets" || slot.seating === "both") {
      let picked = 0;
      for (const title of slot.ticketTitles) {
        const qty = Math.max(0, slot.ticketQuantities[title] ?? 0);
        if (qty < 1) continue;
        const ticket = date.tickets.find((item) =>
          sameCatalogTitle(item.title, title),
        );
        if (!ticket) {
          return {
            ok: false,
            reason: "incomplete",
            message:
              "That ticket type isn’t listed for this date, so I can’t take payment for it.",
          };
        }
        if (ticket.remaining != null && qty > ticket.remaining) {
          return {
            ok: false,
            reason: "capacity",
            message: `We only have **${ticket.remaining}** ${ticket.title} left — I can’t book ${qty}.`,
          };
        }
        picked += qty;
      }
      if (picked < 1) {
        return {
          ok: false,
          reason: "incomplete",
          message: "Pick how many tickets you want before I can take payment.",
        };
      }
    }
    if (slot.seating === "tables" || slot.seating === "both") {
      const tables = slot.tablePlan.filter((item) => item.quantity > 0);
      if (tables.length === 0) {
        return {
          ok: false,
          reason: "incomplete",
          message: "Choose a table plan before I can take payment.",
        };
      }
      for (const item of tables) {
        const table = date.tables.find(
          (row) =>
            row.id === item.tableId ||
            (row.minPersons === item.minPersons &&
              row.maxPersons === item.maxPersons),
        );
        if (!table) {
          return {
            ok: false,
            reason: "incomplete",
            message:
              "That table type isn’t listed for this date, so I can’t take payment for it.",
          };
        }
        if (table.remaining != null && item.quantity > table.remaining) {
          return {
            ok: false,
            reason: "capacity",
            message: `We only have **${table.remaining}** of that table left — I can’t book ${item.quantity}.`,
          };
        }
      }
    }
    const drinks = listChatDrinks(brief, slot.roomId);
    for (const title of slot.drinkTitles) {
      const qty = Math.max(0, slot.drinkQuantities[title] ?? 0);
      if (qty < 1) continue;
      const drink = drinks.find((item) => sameCatalogTitle(item.title, title));
      if (!drink) {
        return {
          ok: false,
          reason: "incomplete",
          message:
            "That drink package isn’t listed for this booking, so I can’t take payment for it.",
        };
      }
      if (drink.availableQuantity != null && qty > drink.availableQuantity) {
        return {
          ok: false,
          reason: "capacity",
          message: `We only have **${drink.availableQuantity}** ${drink.title} left — I can’t add ${qty}.`,
        };
      }
    }
  }
  return { ok: true };
}

function iterateCheckoutPayloadDates(
  payload: CheckoutRequest,
  visit: (dateData: CheckoutDateData, roomId: number | null) => string | null,
): string | null {
  if (payload.is_rooms) {
    for (const room of payload.rooms ?? []) {
      for (const dateData of room.dates) {
        const error = visit(dateData, room.room_id);
        if (error) return error;
      }
    }
    return null;
  }
  for (const dateData of payload.dates ?? []) {
    const error = visit(dateData, null);
    if (error) return error;
  }
  return null;
}

function assertPayloadUsesCatalogPrices(
  payload: CheckoutRequest,
  event: ApiEventCartData,
): string | null {
  return iterateCheckoutPayloadDates(payload, (dateData, roomId) => {
    const iso = String(dateData.event_date ?? "").slice(0, 10);
    const bucket = cartBucketForChatSlot(event, iso, roomId);
    if (!bucket) {
      return "A date in this payment isn’t on the venue list.";
    }
    for (const ticket of dateData.tickets ?? []) {
      const catalog = bucket.tickets.find((item) => item.id === ticket.id);
      if (!catalog) {
        return "A ticket in this payment isn’t listed for that date.";
      }
      if (!pricesMatch(Number(catalog.price), ticket.price_per_ticket)) {
        return "Ticket prices didn’t match the venue list, so I can’t take payment.";
      }
    }
    for (const table of dateData.tables ?? []) {
      const catalog = bucket.tables.find((item) => item.id === table.id);
      if (!catalog) {
        return "A table in this payment isn’t listed for that date.";
      }
      if (!pricesMatch(Number(catalog.price), table.price_per_person)) {
        return "Table prices didn’t match the venue list, so I can’t take payment.";
      }
    }
    for (const drink of dateData.drink_package ?? []) {
      const catalogDrinks = [
        ...(event.drinks ?? []),
        ...(event.rooms ?? []).flatMap((room) => room.drinks ?? []),
      ];
      const catalogDrink = catalogDrinks.find(
        (item) =>
          item.id === drink.id ||
          sameCatalogTitle(String(item.title ?? ""), drink.title),
      );
      if (!catalogDrink) {
        return "A drink package in this payment isn’t listed for this event.";
      }
      if (!pricesMatch(Number(catalogDrink.price), drink.price)) {
        return "Drink prices didn’t match the venue list, so I can’t take payment.";
      }
    }
    return null;
  });
}

function liveCartEditStore() {
  return useCartEditStore.getState();
}

function findChatCartEvent(
  apiCartData: unknown,
  slug: string,
): ApiEventCartData | null {
  const events = extractEventsFromApiResponse(apiCartData);
  const want = normalizeSlug(slug);
  return (
    findApiCartEventBySlug(apiCartData, slug) ??
    findEventBySlug(events, slug) ??
    events.find((event) => normalizeSlug(event.event_slug) === want) ??
    null
  );
}

export function chatCartConflictsWithEvent(
  apiCartData: unknown,
  eventSlug: string,
): boolean {
  const want = normalizeSlug(eventSlug);
  const events = extractEventsFromApiResponse(apiCartData);
  if (events.length === 0) return false;
  return events.some((event) => normalizeSlug(event.event_slug) !== want);
}

function cartBucketForChatSlot(
  event: ApiEventCartData,
  isoDate: string,
  roomId: number | null | undefined,
) {
  const dateKey =
    isRoomBasedCart(event) && roomId != null && roomId > 0
      ? buildCartDateLookupKey(isoDate, roomId)
      : isoDate;
  return getApiDateData(event, dateKey);
}

/** Same rule as checkout: table deposit only when the date enables it. */
export function chatTableDepositAvailable(
  event: ApiEventCartData | null | undefined,
  choices: ChatBookingChoices,
): boolean | null {
  if (!event) return null;
  const slots = checkoutSlots(choices);
  const tableSlots = slots.filter((slot) => slot.seating !== "tickets");
  if (tableSlots.length === 0) return false;

  let sawBucket = false;
  for (const slot of tableSlots) {
    const hasTables =
      slot.tablePlan.some((item) => item.quantity > 0) ||
      Object.values(slot.tableMix).some((qty) => qty > 0);
    if (!hasTables) continue;
    const bucket = cartBucketForChatSlot(
      event,
      slot.date.date.slice(0, 10),
      slot.roomId,
    );
    const payment = bucket?.payment;
    if (!payment) continue;
    sawBucket = true;
    if (payment.is_deposit_enabled || payment.type === "deposit") {
      return true;
    }
  }
  return sawBucket ? false : null;
}

/**
 * Table/ticket types live on the cart date bucket, not the public event page.
 * Seed that bucket (empty, like a date-card click) so chat can ask which types.
 */
export async function hydrateChatBriefCatalogs(
  brief: ChatEventBookingBrief,
  slots: ChatBookingSlot[],
): Promise<ChatEventBookingBrief> {
  const pending = slots.filter((slot) =>
    chatDateNeedsInventoryHydrate(slot.date),
  );
  if (pending.length === 0) return brief;

  const slug = normalizeSlug(brief.eventSlug);
  const catalogs = new Map<string, ChatDateInventory>();
  const markEmpty = (slot: ChatBookingSlot) => {
    catalogs.set(chatDateSlotKey(slot.date), {
      tables: [],
      tickets: [],
      loaded: true,
    });
  };

  let cartResponse: unknown = null;
  try {
    cartResponse = await cartService.getCartData();
  } catch {
    for (const slot of pending) markEmpty(slot);
    return withChatDateInventory(brief, catalogs);
  }

  if (chatCartConflictsWithEvent(cartResponse, brief.eventSlug)) {
    if (!apiCartHasBillableSelections(cartResponse)) {
      try {
        await cartService.deleteCartData("all");
        cartResponse = await cartService.getCartData();
      } catch {
        for (const slot of pending) markEmpty(slot);
        return withChatDateInventory(brief, catalogs);
      }
    } else {
      for (const slot of pending) markEmpty(slot);
      return withChatDateInventory(brief, catalogs);
    }
  }

  let event = findChatCartEvent(cartResponse, slug);

  for (const slot of pending) {
    const isoDate = slot.date.date.slice(0, 10);
    const key = chatDateSlotKey(slot.date);
    let bucket = event ? cartBucketForChatSlot(event, isoDate, slot.roomId) : null;

    if (!bucket) {
      try {
        await cartService.storeEventBooking(
          {
            slug,
            event_date: isoDate,
            ...(slot.roomId != null && slot.roomId > 0
              ? { room_id: slot.roomId }
              : {}),
            drink_package: [],
            tables: [],
            tickets: [],
          },
          { suppressSuccessToast: true, suppressErrorToast: true },
        );
        cartResponse = await cartService.getCartData();
        if (chatCartConflictsWithEvent(cartResponse, brief.eventSlug)) {
          catalogs.set(key, { tables: [], tickets: [], loaded: true });
          continue;
        }
        event = findChatCartEvent(cartResponse, slug);
        bucket = event
          ? cartBucketForChatSlot(event, isoDate, slot.roomId)
          : null;
      } catch {
        catalogs.set(key, { tables: [], tickets: [], loaded: true });
        continue;
      }
    }

    catalogs.set(key, chatInventoryFromCartBucket(bucket));
  }

  return withChatDateInventory(brief, catalogs);
}

function cartRequestHasLineItems(cartData: {
  tables: unknown[];
  tickets: unknown[];
  drink_package: unknown[];
}): boolean {
  return (
    cartData.tables.length > 0 ||
    cartData.tickets.length > 0 ||
    cartData.drink_package.length > 0
  );
}

function resolveChatCartDateKey(
  eventSlug: string,
  isoDate: string,
  roomId: number | null | undefined,
): string | null {
  const store = liveCartEditStore();
  const roomKey = buildCartDateLookupKey(isoDate, roomId);
  if (store.getDateData(eventSlug, roomKey)) return roomKey;
  if (store.getDateData(eventSlug, isoDate)) return isoDate;
  return null;
}

function authFailureFromCartError(
  error: unknown,
): { ok: false; reason: ChatCheckoutFailureReason; message: string } | null {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  if (status === 401 || status === 403) {
    return {
      ok: false,
      reason: "login",
      message:
        "Please log in with a customer account so I can take payment here.",
    };
  }
  return null;
}

function applyChatSlotsToStore(options: {
  storeSlug: string;
  slots: ChatBookingSlot[];
  payMode: "full" | "deposit";
  fillUnpickedTickets: boolean;
}): { ok: true } | { ok: false; reason: ChatCheckoutFailureReason; message: string } {
  const { storeSlug, slots, payMode, fillUnpickedTickets } = options;
  const store = liveCartEditStore();

  for (const slot of slots) {
    const isoDate = slot.date.date.slice(0, 10);
    const dateKey = resolveChatCartDateKey(storeSlug, isoDate, slot.roomId);
    const seeded = dateKey ? store.getDateData(storeSlug, dateKey) : null;
    if (!dateKey || !seeded) {
      return {
        ok: false,
        reason: "unknown",
        message:
          "I couldn’t prepare tables and tickets for that date. Visit the event page to finish.",
      };
    }

    const catalogTables = seeded.tables ?? [];
    const catalogTickets = seeded.tickets ?? [];
    const catalogHasTables = catalogTables.length > 0;
    const catalogHasTickets = catalogTickets.length > 0;
    const guests = slot.guestCount ?? 0;
    let { tableGuests, ticketQty } = resolveSlotTableAndTicketCounts(slot);
    if (!catalogHasTables) {
      if (tableGuests > 0) {
        ticketQty = Math.max(ticketQty, tableGuests);
        tableGuests = 0;
      } else if (ticketQty === 0 && guests > 0 && catalogHasTickets) {
        ticketQty = guests;
      }
    }

    if (tableGuests > 0) {
      store.updatePeopleCount(storeSlug, dateKey, tableGuests);
    } else if (slot.guestCount != null) {
      store.updatePeopleCount(storeSlug, dateKey, slot.guestCount);
    }

    if (tableGuests <= 0) {
      store.skipTableSeating(storeSlug, dateKey);
    } else if (slot.tablePlan.length > 0) {
      const tables = store.getDateData(storeSlug, dateKey)?.tables ?? [];
      for (const item of slot.tablePlan) {
        const table =
          tables.find((row) => row.id === item.tableId) ??
          tables.find(
            (row) =>
              row.minPersons === item.minPersons &&
              row.maxPersons === item.maxPersons,
          );
        if (!table) continue;
        const remaining = table.maxQuantity;
        if (remaining != null && item.quantity > remaining) {
          return {
            ok: false,
            reason: "capacity",
            message: `We only have **${remaining}** ${table.title} available — I can’t book ${item.quantity}.`,
          };
        }
        store.updateQuantity(storeSlug, dateKey, "table", table.id, item.quantity);
        store.confirmTableSeating(storeSlug, dateKey, table.id, item.allocation);
      }
    } else if (fillUnpickedTickets) {
      const tables = store.getDateData(storeSlug, dateKey)?.tables ?? [];
      if (tables.length > 0 && !hasViableTablePlan(tables, tableGuests)) {
        const remaining = tables.reduce(
          (sum, table) =>
            sum + (table.maxQuantity ?? 0) * (table.maxPersons ?? 0),
          0,
        );
        return {
          ok: false,
          reason: "capacity",
          message:
            remaining > 0
              ? `We can seat about **${remaining}** guests on the tables listed for that date — I can’t book **${tableGuests}** as tables.`
              : `I can’t seat **${tableGuests}** guests on the tables listed for that date.`,
        };
      }
      store.applyBestTableMatch(storeSlug, dateKey);
      const allocated = store.getDateData(storeSlug, dateKey);
      for (const table of allocated?.tables ?? []) {
        if (table.quantity > 0) {
          store.confirmTableSeating(
            storeSlug,
            dateKey,
            table.id,
            table.allocation ?? [],
          );
        }
      }
    }

    if (
      tableGuests > 0 &&
      (fillUnpickedTickets || slot.tablePlan.length > 0)
    ) {
      const seated = store
        .getDateData(storeSlug, dateKey)
        ?.tables.some((table) => table.quantity > 0);
      if (!seated) {
        return {
          ok: false,
          reason: "capacity",
          message: `I can’t seat **${tableGuests}** guests on the tables listed for that date.`,
        };
      }
    }

    const tickets = store.getDateData(storeSlug, dateKey)?.tickets ?? [];
    const pickedTitles = slot.ticketTitles.filter(
      (title) => Math.max(0, slot.ticketQuantities[title] ?? 0) > 0,
    );
    if (pickedTitles.length > 0) {
      for (const title of pickedTitles) {
        const ticket = tickets.find(
          (item) =>
            item.title.trim().toLowerCase() === title.trim().toLowerCase(),
        );
        const qty = Math.max(0, slot.ticketQuantities[title] ?? 0);
        if (!ticket || qty < 1) continue;
        const remaining = ticket.maxQuantity;
        if (remaining != null && qty > remaining) {
          return {
            ok: false,
            reason: "capacity",
            message: `We only have **${remaining}** ${ticket.title} available for that date — I can’t book ${qty}.`,
          };
        }
        store.updateQuantity(storeSlug, dateKey, "ticket", ticket.id, qty);
      }
    } else if (fillUnpickedTickets && ticketQty > 0) {
      const ticket = tickets[0];
      const remaining = ticket?.maxQuantity;
      if (!ticket) {
        return {
          ok: false,
          reason: "incomplete",
          message:
            "This date doesn’t have tickets I can add. Choose another date, or visit the event page.",
        };
      }
      if (remaining != null && ticketQty > remaining) {
        return {
          ok: false,
          reason: "capacity",
          message: `We only have **${remaining}** ${ticket.title} available for that date — I can’t book ${ticketQty}.`,
        };
      }
      store.updateQuantity(storeSlug, dateKey, "ticket", ticket.id, ticketQty);
    }

    const drinkCatalog = store.getDateData(storeSlug, dateKey)?.drinks ?? [];
    for (const title of slot.drinkTitles) {
      const drink = drinkCatalog.find(
        (item) =>
          item.title.trim().toLowerCase() === title.trim().toLowerCase(),
      );
      if (!drink) continue;
      const qty = Math.max(1, slot.drinkQuantities[title] ?? 1);
      const remaining = drink.maxQuantity;
      if (remaining != null && qty > remaining) {
        return {
          ok: false,
          reason: "capacity",
          message: `We only have **${remaining}** ${drink.title} available — I can’t add ${qty}.`,
        };
      }
      store.updateQuantity(storeSlug, dateKey, "drink", drink.id, qty);
    }

    store.updatePaymentType(
      storeSlug,
      dateKey,
      payMode === "deposit" && tableGuests > 0 ? "deposit" : "full",
    );
  }

  return { ok: true };
}

/**
 * Write the current chat picks into the customer cart so Checkout shows
 * the same tickets/tables/drinks. Empty leftover date shells are cleared
 * when they belong to a different event.
 */
export async function syncChatBookingToCart(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  payMode?: "full" | "deposit";
  fillUnpickedTickets?: boolean;
  requireLineItems?: boolean;
}): Promise<ChatCartSyncResult> {
  const {
    brief,
    choices,
    payMode = "full",
    fillUnpickedTickets = false,
    requireLineItems = false,
  } = options;
  const slug = normalizeSlug(brief.eventSlug);
  const slots = checkoutSlots(choices);
  if (slots.length === 0) {
    return {
      ok: false,
      reason: "incomplete",
      message: "I still need a date before I can save this booking.",
    };
  }

  await hydrateChatBriefCatalogs(brief, slots);

  let cartResponse: unknown;
  try {
    cartResponse = await cartService.getCartData();
  } catch (error) {
    return (
      authFailureFromCartError(error) ?? {
        ok: false,
        reason: "unknown",
        message:
          "I couldn’t load your booking just now. You can finish on the event page instead.",
      }
    );
  }

  if (chatCartConflictsWithEvent(cartResponse, brief.eventSlug)) {
    if (!apiCartHasBillableSelections(cartResponse)) {
      try {
        await cartService.deleteCartData("all");
        await hydrateChatBriefCatalogs(brief, slots);
        cartResponse = await cartService.getCartData();
      } catch (error) {
        return (
          authFailureFromCartError(error) ?? {
            ok: false,
            reason: "unknown",
            message:
              "I couldn’t prepare this booking just now. You can finish on the event page instead.",
          }
        );
      }
    }
  }

  if (
    chatCartConflictsWithEvent(cartResponse, brief.eventSlug) &&
    apiCartHasBillableSelections(cartResponse)
  ) {
    return {
      ok: false,
      reason: "conflict",
      message:
        "You already have another event in Checkout. Open Checkout to remove it, then I can continue here.",
    };
  }

  let event = findChatCartEvent(cartResponse, slug);
  if (!event) {
    try {
      for (const slot of slots) {
        const isoDate = slot.date.date.slice(0, 10);
        await cartService.storeEventBooking(
          {
            slug,
            event_date: isoDate,
            ...(slot.roomId != null && slot.roomId > 0
              ? { room_id: slot.roomId }
              : {}),
            people_quantity: slot.guestCount ?? undefined,
            drink_package: [],
            tables: [],
            tickets: [],
          },
          { suppressSuccessToast: true, suppressErrorToast: true },
        );
      }
      cartResponse = await cartService.getCartData();
      event = findChatCartEvent(cartResponse, slug);
    } catch (error) {
      return (
        authFailureFromCartError(error) ?? {
          ok: false,
          reason: "unknown",
          message:
            "I couldn’t prepare this booking just now. You can finish on the event page instead.",
        }
      );
    }
  }

  if (!event) {
    return {
      ok: false,
      reason: "unknown",
      message:
        "I couldn’t load your booking just now. You can finish on the event page instead.",
    };
  }

  const storeSlug = event.event_slug?.trim() || slug;
  const store = liveCartEditStore();
  store.clearEditingData(storeSlug);
  if (storeSlug !== slug) store.clearEditingData(slug);
  store.initializeFromAPI(storeSlug, event as unknown as Record<string, unknown>);

  const applied = applyChatSlotsToStore({
    storeSlug,
    slots,
    payMode,
    fillUnpickedTickets,
  });
  if (!applied.ok) return applied;

  try {
    let wroteLineItems = false;
    for (const slot of slots) {
      const isoDate = slot.date.date.slice(0, 10);
      const dateKey = resolveChatCartDateKey(storeSlug, isoDate, slot.roomId);
      if (!dateKey) {
        if (requireLineItems) {
          return {
            ok: false,
            reason: "incomplete",
            message:
              "I couldn’t add tables, tickets, or drinks for that date. Visit the event page to finish.",
          };
        }
        continue;
      }
      const cartData = liveCartEditStore().getItemsForAPI(
        storeSlug,
        dateKey,
        slot.roomId ?? undefined,
      );
      if (!cartRequestHasLineItems(cartData)) {
        if (requireLineItems) {
          return {
            ok: false,
            reason: "incomplete",
            message:
              "I couldn’t add tables, tickets, or drinks for that date. Visit the event page to finish.",
          };
        }
        continue;
      }
      await cartService.storeEventBooking(
        {
          ...cartData,
          slug: storeSlug,
        },
        { suppressSuccessToast: true, suppressErrorToast: true },
      );
      wroteLineItems = true;
    }
    if (requireLineItems && !wroteLineItems) {
      return {
        ok: false,
        reason: "incomplete",
        message:
          "I couldn’t add tables, tickets, or drinks for that date. Visit the event page to finish.",
      };
    }
  } catch (error) {
    return (
      authFailureFromCartError(error) ?? {
        ok: false,
        reason: "unknown",
        message:
          "I couldn’t save this booking just now. You can finish on the event page instead.",
      }
    );
  }

  try {
    cartResponse = await cartService.getCartData();
  } catch {
    // Checkout can still use the in-memory cart if GET is stale.
  }

  const syncedEvent = findChatCartEvent(cartResponse, storeSlug) ?? event;
  return {
    ok: true,
    storeSlug,
    cartResponse,
    event: syncedEvent,
  };
}

export async function runChatCheckout(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  payMode: "full" | "deposit";
  gatewaySlug?: string | null;
  gatewayId?: number | null;
}): Promise<ChatCheckoutResult> {
  const { brief, choices, payMode } = options;
  if (!bookingChoicesReadyForPay(brief, choices)) {
    return {
      ok: false,
      reason: "incomplete",
      message:
        "I still need the date and the tables or tickets you picked before I can take payment.",
    };
  }

  const catalog = chatChoicesMatchCatalog(brief, choices);
  if (!catalog.ok) return catalog;

  const synced = await syncChatBookingToCart({
    brief,
    choices,
    payMode,
    fillUnpickedTickets: false,
    requireLineItems: true,
  });
  if (!synced.ok) return synced;

  const { storeSlug, event, cartResponse } = synced;
  const gateways = listChatPaymentGateways(event);
  if (gateways.length === 0) {
    return {
      ok: false,
      reason: "no-gateway",
      message:
        "Payment isn’t available in chat for this event. Visit the event page to finish.",
    };
  }

  const preferredSlug = options.gatewaySlug?.trim().toLowerCase() || null;
  const hasExplicitGateway =
    (options.gatewayId != null && options.gatewayId > 0) || Boolean(preferredSlug);
  if (gateways.length > 1 && !hasExplicitGateway) {
    return {
      ok: false,
      reason: "need-gateway",
      gateways,
      message: "How would you like to pay? Choose a payment method to continue.",
    };
  }

  const gatewayId =
    options.gatewayId != null && options.gatewayId > 0
      ? options.gatewayId
      : pickPaymentGatewayId(event, preferredSlug);
  if (gatewayId == null) {
    return {
      ok: false,
      reason: "no-gateway",
      message:
        "Payment isn’t available in chat for this event. Visit the event page to finish.",
    };
  }

  if (payMode === "deposit" && chatTableDepositAvailable(event, choices) === false) {
    return {
      ok: false,
      reason: "checkout",
      message:
        "Table deposit isn’t available for this booking. Pay in full, or visit the event page.",
    };
  }

  const couponSource = resolveCartCoupon(event);
  const officialCoupon = couponSource?.coupon_code?.trim().toUpperCase() || null;
  const couponCode =
    choices.couponApplied && officialCoupon ? officialCoupon : null;
  if (couponCode) {
    useCheckoutPromoStore.getState().setCouponCode(couponCode);
  } else {
    useCheckoutPromoStore.getState().clearCoupon();
  }

  const checkoutEvent = findChatCartEvent(cartResponse, storeSlug) ?? event;
  const getEditableDate = (key: string) =>
    liveCartEditStore().getDateData(storeSlug, key);
  const discountable = calculateEditableCartDiscountableTotal(
    checkoutEvent,
    getEditableDate,
  );
  const discountAmount =
    couponCode && couponSource
      ? couponDiscountAmount(couponSource, discountable)
      : 0;

  const payload = transformCartToCheckout(
    storeSlug,
    liveCartEditStore().editingData,
    cartResponse,
    gatewayId,
    {
      couponCode,
      discountAmount,
    },
  );

  if (!payload) {
    return {
      ok: false,
      reason: "checkout",
      message:
        "I couldn’t build the payment for this booking. Visit the event page to finish.",
    };
  }

  const catalogPriceError = assertPayloadUsesCatalogPrices(payload, checkoutEvent);
  if (catalogPriceError) {
    return { ok: false, reason: "checkout", message: catalogPriceError };
  }

  const validation = checkoutService.validateCheckoutData(payload);
  if (!validation.isValid) {
    return {
      ok: false,
      reason: "checkout",
      message:
        "This booking couldn’t be verified against the venue list. Visit the event page to finish.",
    };
  }

  const fingerprint = chatBookingFingerprint(choices, payMode);
  const payStore = useCheckoutPaymentUiStore.getState();
  const pendingNumber = event.pending_payment?.booking_number?.trim();
  const storedNumber = payStore.stripePaymentSession?.bookingNumber?.trim();
  const resumeCandidate =
    pendingNumber &&
    !payStore.isBookingCompleted(pendingNumber) &&
    !payStore.isPendingPaymentExpired(pendingNumber)
      ? pendingNumber
      : storedNumber &&
          !payStore.isBookingCompleted(storedNumber) &&
          !payStore.isPendingPaymentExpired(storedNumber)
        ? storedNumber
        : null;
  const sameOrder =
    Boolean(payStore.chatCheckoutFingerprint) &&
    payStore.chatCheckoutFingerprint === fingerprint;
  const resumeNumber = sameOrder ? resumeCandidate : null;
  if (resumeCandidate && !sameOrder) {
    payStore.clearPaymentSession();
  }

  try {
    const response = resumeNumber
      ? await checkoutService.resumeCheckout({
          booking_number: resumeNumber,
          payment_gateway: gatewayId,
        })
      : await checkoutService.processCheckout(payload);
    if (!response.status || !response.data) {
      return {
        ok: false,
        reason: "checkout",
        message:
          response.message ||
          "Payment couldn’t be started. Visit the event page to finish.",
      };
    }
    const action = resolveCheckoutPaymentAction(response.data);
    if (!action) {
      return {
        ok: false,
        reason: "checkout",
        message: "Payment couldn’t be started. Visit the event page to finish.",
      };
    }
    const charged = Number(response.data.amount);
    if (Number.isFinite(charged) && charged + 0.05 < payload.total) {
      return {
        ok: false,
        reason: "checkout",
        message:
          "The payment amount didn’t match this booking, so I didn’t open the form. Try again, or finish on the event page.",
      };
    }
    payStore.setChatCheckoutFingerprint(fingerprint);
    if (action.type === "stripe") {
      action.session.clientQuotedAmount = payload.total;
    }
    return { ok: true, action, payload };
  } catch (error) {
    if (isPaymentAlreadyProcessing(error)) {
      return {
        ok: false,
        reason: "checkout",
        message: PAYMENT_ALREADY_PROCESSING_MESSAGE,
      };
    }
    const message =
      error instanceof Error
        ? error.message
        : "Payment couldn’t be started. Visit the event page to finish.";
    return { ok: false, reason: "checkout", message };
  }
}
