import { transformCartToCheckout } from "@/app/(public)/vendor/checkout/_lib/checkout-utils";
import {
  buildCartDateLookupKey,
  calculateEditableCartDiscountableTotal,
  extractEventsFromApiResponse,
  findEventBySlug,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { hasViableTablePlan } from "@/app/(public)/vendor/checkout/_lib/table-recommendations";
import type { ChatBookingChoices } from "@/lib/chat-booking-choices";
import type { ChatEventBookingBrief } from "@/lib/chat-event-booking";
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

export function bookingChoicesReadyForPay(
  brief: ChatEventBookingBrief | null | undefined,
  choices: ChatBookingChoices,
): boolean {
  if (!brief) return false;
  if (brief.hasRooms && choices.roomId == null) return false;
  if (choices.dates.length === 0) return false;
  if (choices.guestCount == null || choices.guestCount < 1) return false;
  if (!choices.seating) return false;
  return true;
}

function listChatDrinksForCheckout(
  brief: ChatEventBookingBrief,
  choices: ChatBookingChoices,
) {
  const pool =
    brief.hasRooms && choices.roomId != null
      ? (brief.rooms.find((room) => room.roomId === choices.roomId)?.drinks ??
        [])
      : brief.drinks;
  return choices.drinkTitles
    .map((title) => {
      const drink = pool.find(
        (item) =>
          item.title.trim().toLowerCase() === title.trim().toLowerCase(),
      );
      if (!drink || drink.id <= 0) return null;
      const qty = Math.max(1, choices.drinkQuantities[title] ?? 1);
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
  const isoDate = choices.dates[0]?.date.slice(0, 10);
  if (!isoDate) {
    return {
      ok: false,
      reason: "incomplete",
      message: "I still need a date before I can take payment.",
    };
  }

  const drinksPayload = listChatDrinksForCheckout(brief, choices);

  try {
    await cartService.storeEventBooking({
      slug,
      event_date: isoDate,
      ...(choices.roomId != null && choices.roomId > 0
        ? { room_id: choices.roomId }
        : {}),
      people_quantity: choices.guestCount ?? undefined,
      drink_package: drinksPayload,
      tables: [],
      tickets: [],
    });
  } catch (error) {
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
    return {
      ok: false,
      reason: "unknown",
      message:
        "I couldn’t prepare this booking just now. You can finish on the event page instead.",
    };
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

  const event = findEventBySlug(
    extractEventsFromApiResponse(cartResponse),
    slug,
  );
  if (!event) {
    return {
      ok: false,
      reason: "unknown",
      message:
        "I couldn’t load your booking just now. You can finish on the event page instead.",
    };
  }

  const gatewayId = pickPaymentGatewayId(event);
  if (gatewayId == null) {
    return {
      ok: false,
      reason: "no-gateway",
      message:
        "Payment isn’t available in chat for this event. Visit the event page to finish.",
    };
  }

  const dateKey = buildCartDateLookupKey(isoDate, choices.roomId);
  const store = useCartEditStore.getState();
  store.clearEditingData(slug);
  store.initializeFromAPI(slug, event as unknown as Record<string, unknown>);

  const seeded = store.getDateData(slug, dateKey);
  if (!seeded) {
    return {
      ok: false,
      reason: "unknown",
      message:
        "I couldn’t prepare tables and tickets for that date. Visit the event page to finish.",
    };
  }

  if (choices.guestCount != null) {
    store.updatePeopleCount(slug, dateKey, choices.guestCount);
  }

  if (choices.seating === "tickets") {
    store.skipTableSeating(slug, dateKey);
    const tickets = store.getDateData(slug, dateKey)?.tickets ?? [];
    const ticket = tickets[0];
    const qty = choices.guestCount ?? 1;
    const remaining = ticket?.maxQuantity;
    if (ticket && remaining != null && qty > remaining) {
      return {
        ok: false,
        reason: "capacity",
        message: `We only have **${remaining}** ${ticket.title} available for that date — I can’t book ${qty}.`,
      };
    }
    if (ticket) {
      store.updateQuantity(slug, dateKey, "ticket", ticket.id, qty);
    }
  } else {
    const tables = store.getDateData(slug, dateKey)?.tables ?? [];
    const guests = choices.guestCount ?? 0;
    if (tables.length > 0 && guests > 0 && !hasViableTablePlan(tables, guests)) {
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
            ? `We can seat about **${remaining}** guests on the tables listed for that date — I can’t book **${guests}** as tables.`
            : `I can’t seat **${guests}** guests on the tables listed for that date.`,
      };
    }
    store.applyBestTableMatch(slug, dateKey);
    const allocated = store.getDateData(slug, dateKey);
    for (const table of allocated?.tables ?? []) {
      if (table.quantity > 0) {
        store.confirmTableSeating(
          slug,
          dateKey,
          table.id,
          table.allocation ?? [],
        );
      }
    }
  }

  const drinkCatalog = store.getDateData(slug, dateKey)?.drinks ?? [];
  for (const title of choices.drinkTitles) {
    const drink = drinkCatalog.find(
      (item) =>
        item.title.trim().toLowerCase() === title.trim().toLowerCase(),
    );
    if (!drink) continue;
    const qty = Math.max(1, choices.drinkQuantities[title] ?? 1);
    const remaining = drink.maxQuantity;
    if (remaining != null && qty > remaining) {
      return {
        ok: false,
        reason: "capacity",
        message: `We only have **${remaining}** ${drink.title} available — I can’t add ${qty}.`,
      };
    }
    store.updateQuantity(slug, dateKey, "drink", drink.id, qty);
  }

  store.updatePaymentType(
    slug,
    dateKey,
    payMode === "deposit" ? "deposit" : "full",
  );

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

  const getEditableDate = (key: string) => store.getDateData(slug, key);
  const discountable = calculateEditableCartDiscountableTotal(
    event,
    getEditableDate,
  );
  const discountAmount =
    couponCode && couponSource
      ? couponDiscountAmount(couponSource, discountable)
      : 0;

  const payload = transformCartToCheckout(
    slug,
    store.editingData,
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
