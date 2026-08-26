import { transformCartToCheckout } from "@/app/(public)/vendor/checkout/_lib/checkout-utils";
import {
  buildCartDateLookupKey,
  calculateEditableCartDiscountableTotal,
  extractEventsFromApiResponse,
  findApiCartEventBySlug,
  findEventBySlug,
  getApiDateData,
  isRoomBasedCart,
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
import type { CheckoutRequest } from "@/services/customer/checkout/type";
import type { ApiEventCartData } from "@/lib/types/cart.types";
import type { CouponStripSource } from "@/lib/coupon-strip-props";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useCheckoutPromoStore } from "@/store/checkout-promo.store";
import { normalizeSlug } from "@/lib/utils";

export type ChatCheckoutFailureReason =
  | "login"
  | "incomplete"
  | "no-gateway"
  | "capacity"
  | "checkout"
  | "unknown";

export type ChatCheckoutResult =
  | { ok: true; action: CheckoutPaymentAction; payload: CheckoutRequest }
  | {
    ok: false;
    reason: ChatCheckoutFailureReason;
    message: string;
  };

function pickPaymentGatewayId(event: ApiEventCartData): number | null {
  const gateways = event.payment_gateways ?? [];
  const stripe = gateways.find((gateway) =>
    /stripe/i.test(String(gateway.slug ?? "")),
  );
  const id = Number((stripe ?? gateways[0])?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
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
    if (slot.guestCount == null || slot.guestCount < 1) return false;
    return Boolean(slot.seating);
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
    for (const slot of pending) markEmpty(slot);
    return withChatDateInventory(brief, catalogs);
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

function authFailureFromCartError(error: unknown): ChatCheckoutResult | null {
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

function listChatDrinksForCheckout(
  brief: ChatEventBookingBrief,
  slot: ChatBookingSlot,
) {
  const pool =
    brief.hasRooms && slot.roomId != null
      ? (brief.rooms.find((room) => room.roomId === slot.roomId)?.drinks ?? [])
      : brief.drinks;
  return slot.drinkTitles
    .map((title) => {
      const drink = pool.find(
        (item) =>
          item.title.trim().toLowerCase() === title.trim().toLowerCase(),
      );
      if (!drink || drink.id <= 0) return null;
      const qty = Math.max(1, slot.drinkQuantities[title] ?? 1);
      return {
        id: drink.id,
        title: drink.title,
        price: drink.price ?? 0,
        quantity: qty,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);
}

export async function runChatCheckout(options: {
  brief: ChatEventBookingBrief;
  choices: ChatBookingChoices;
  payMode: "full" | "deposit";
}): Promise<ChatCheckoutResult> {
  const { brief, choices, payMode } = options;
  if (!bookingChoicesReadyForPay(brief, choices)) {
    return {
      ok: false,
      reason: "incomplete",
      message:
        "I still need a room, date, guest count and seating before I can take payment.",
    };
  }

  const slug = normalizeSlug(brief.eventSlug);
  const slots = checkoutSlots(choices);
  if (slots.length === 0) {
    return {
      ok: false,
      reason: "incomplete",
      message: "I still need a date before I can take payment.",
    };
  }

  try {
    for (const slot of slots) {
      const isoDate = slot.date.date.slice(0, 10);
      await cartService.storeEventBooking({
        slug,
        event_date: isoDate,
        ...(slot.roomId != null && slot.roomId > 0
          ? { room_id: slot.roomId }
          : {}),
        people_quantity: slot.guestCount ?? undefined,
        drink_package: listChatDrinksForCheckout(brief, slot),
        tables: [],
        tickets: [],
      });
    }
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

  let cartResponse: unknown;
  try {
    cartResponse = await cartService.getCartData();
  } catch {
    return {
      ok: false,
      reason: "unknown",
      message:
        "I couldn’t load your booking just now. You can finish on the event page instead.",
    };
  }

  const event = findChatCartEvent(cartResponse, slug);
  if (!event) {
    return {
      ok: false,
      reason: "unknown",
      message:
        "I couldn’t load your booking just now. You can finish on the event page instead.",
    };
  }

  const storeSlug = event.event_slug?.trim() || slug;

  const gatewayId = pickPaymentGatewayId(event);
  if (gatewayId == null) {
    return {
      ok: false,
      reason: "no-gateway",
      message:
        "Payment isn’t available in chat for this event. Visit the event page to finish.",
    };
  }

  const store = liveCartEditStore();
  store.clearEditingData(storeSlug);
  if (storeSlug !== slug) store.clearEditingData(slug);
  store.initializeFromAPI(storeSlug, event as unknown as Record<string, unknown>);

  for (const slot of slots) {
    const isoDate = slot.date.date.slice(0, 10);
    const dateKey = resolveChatCartDateKey(storeSlug, isoDate, slot.roomId);
    const seeded = dateKey
      ? store.getDateData(storeSlug, dateKey)
      : null;
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
    } else {
      const tables = store.getDateData(storeSlug, dateKey)?.tables ?? [];
      if (slot.tablePlan.length > 0) {
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
      } else {
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
    }

    if (tableGuests > 0) {
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

    if (ticketQty > 0) {
      const tickets = store.getDateData(storeSlug, dateKey)?.tickets ?? [];
      if (slot.ticketTitles.length > 0) {
        for (const title of slot.ticketTitles) {
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
      } else {
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

  const couponSource = resolveCartCoupon(event);
  const couponCode = choices.couponApplied
    ? couponSource?.coupon_code?.trim().toUpperCase() ||
    brief.coupon?.code?.trim().toUpperCase() ||
    null
    : null;
  if (couponCode) {
    useCheckoutPromoStore.getState().setCouponCode(couponCode);
  } else {
    useCheckoutPromoStore.getState().clearCoupon();
  }

  try {
    for (const slot of slots) {
      const isoDate = slot.date.date.slice(0, 10);
      const dateKey = resolveChatCartDateKey(
        storeSlug,
        isoDate,
        slot.roomId,
      );
      if (!dateKey) {
        return {
          ok: false,
          reason: "incomplete",
          message:
            "I couldn’t add tables, tickets, or drinks for that date. Visit the event page to finish.",
        };
      }
      const cartData = liveCartEditStore().getItemsForAPI(
        storeSlug,
        dateKey,
        slot.roomId ?? undefined,
      );
      if (!cartRequestHasLineItems(cartData)) {
        return {
          ok: false,
          reason: "incomplete",
          message:
            "I couldn’t add tables, tickets, or drinks for that date. Visit the event page to finish.",
        };
      }
      await cartService.storeEventBooking({
        ...cartData,
        slug: storeSlug,
      });
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
    // Checkout still uses the in-memory cart; a stale GET must not block pay.
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

  try {
    const response = await checkoutService.processCheckout(payload);
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
    return { ok: true, action, payload };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment couldn’t be started. Visit the event page to finish.";
    return { ok: false, reason: "checkout", message };
  }
}
