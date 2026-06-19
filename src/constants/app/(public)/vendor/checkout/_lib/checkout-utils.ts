/**
 * Checkout Utility Functions
 *
 * Transforms cart edit store data into checkout API format
 * and provides validation and calculation utilities.
 */

import {
  CheckoutDateData,
  CheckoutRequest,
  CheckoutRoomData,
} from "@/services/customer/checkout";
import { EditableDateData } from "@/store/cart-edit.store";
import type { ApiEventCartData } from "@/lib/types/cart.types";
import {
  extractEventsFromApiResponse,
  findEventBySlug,
  getAllRoomDateKeys,
  getApiDateData,
  getBillableTables,
  getCartRooms,
  hasUnconfirmedTableSeating,
  isRoomBasedCart,
  parseRoomDateKey,
} from "./cart-calculations";
import { formatMoney, resolveCurrencySymbol } from "@/lib/currency-format";
import { useDomainStore } from "@/store/domain.store";

interface DatePaymentTotals {
  dateTotal: number;
  payToday: number;
  payLater: number;
  calculatedDepositAmount: number;
  isDeposit: boolean;
}

function checkoutLogCurrencySymbol(): string {
  if (typeof window !== "undefined") {
    return resolveCurrencySymbol(
      useDomainStore.getState().settings?.currency_symbol,
    );
  }
  return resolveCurrencySymbol(undefined);
}

function calculatePlatformFeeFromApi(
  apiEventData: unknown,
  bookingSubTotal: number,
): { fee: number; label: string | null } {
  const feeMeta = (apiEventData as { vendor_platform_fee?: unknown })
    ?.vendor_platform_fee as
    | { mode?: unknown; value?: unknown }
    | undefined;

  if (!feeMeta || bookingSubTotal <= 0) return { fee: 0, label: null };

  const mode =
    feeMeta.mode === "percentage"
      ? "percentage"
      : feeMeta.mode === "flat"
        ? "flat"
        : null;
  const valueNum =
    typeof feeMeta.value === "number"
      ? feeMeta.value
      : Number.parseFloat(String(feeMeta.value ?? ""));

  if (!mode || !Number.isFinite(valueNum) || valueNum <= 0) {
    return { fee: 0, label: null };
  }

  const rawFee =
    mode === "flat" ? valueNum : (bookingSubTotal * valueNum) / 100;
  const fee = Math.max(0, Number(rawFee.toFixed(2)));

  if (mode === "flat") {
    return { fee, label: "Platform fee" };
  }

  return { fee, label: `Platform fee (${valueNum}%)` };
}

function transformEditableTables(dateData: EditableDateData) {
  return getBillableTables(dateData).map((table) => ({
    id: table.id,
    table_size: table.tableSize || table.maxPersons || 20,
    price_per_person: table.pricePerPerson || table.price,
    no_tables: table.quantity,
    allocation:
      table.allocation && table.allocation.length > 0
        ? table.allocation
        : Array(table.quantity).fill(table.minPersons || 1),
  }));
}

function transformEditableTickets(dateData: EditableDateData) {
  return dateData.tickets
    .filter((ticket) => ticket.quantity > 0)
    .map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description || "",
      price_per_ticket: ticket.price,
      quantity: ticket.quantity,
    }));
}

function transformEditableDrinks(dateData: EditableDateData) {
  return dateData.drinks
    .filter((drink) => drink.quantity > 0)
    .map((drink) => ({
      id: drink.id,
      title: drink.title,
      price: drink.price,
      quantity: drink.quantity,
    }));
}

function sumTableGuestTotal(
  tables: ReturnType<typeof transformEditableTables>,
): number {
  return tables.reduce((sum, table) => {
    const guests = table.allocation.reduce((guestSum, guests) => guestSum + guests, 0);
    return guests > 0 ? sum + table.price_per_person * guests : sum;
  }, 0);
}

function sumTicketTotal(
  tickets: ReturnType<typeof transformEditableTickets>,
): number {
  return tickets.reduce(
    (sum, ticket) => sum + ticket.price_per_ticket * ticket.quantity,
    0,
  );
}

function sumDrinkTotal(
  drinks: ReturnType<typeof transformEditableDrinks>,
): number {
  return drinks.reduce((sum, drink) => sum + drink.price * drink.quantity, 0);
}

function calculateDatePaymentTotals(
  dateData: EditableDateData,
  apiEventData: ApiEventCartData | null,
  dateKey: string,
  tables: ReturnType<typeof transformEditableTables>,
  tickets: ReturnType<typeof transformEditableTickets>,
  drink_package: ReturnType<typeof transformEditableDrinks>,
): DatePaymentTotals {
  const dateTotal =
    sumTableGuestTotal(tables) + sumTicketTotal(tickets) + sumDrinkTotal(drink_package);

  const apiDateData = getApiDateData(apiEventData as ApiEventCartData, dateKey);
  const paymentConfig = apiDateData?.payment;
  const isDepositEnabled = paymentConfig?.is_deposit_enabled ?? false;
  const depositType = paymentConfig?.deposit_type || "amount";
  const depositValue = paymentConfig?.deposit_value || 0;
  const isDeposit = dateData.paymentType === "deposit" && isDepositEnabled;

  if (!isDeposit) {
    return {
      dateTotal,
      payToday: dateTotal,
      payLater: 0,
      calculatedDepositAmount: 0,
      isDeposit: false,
    };
  }

  const tableTotalAmount = sumTableGuestTotal(tables);
  const ticketsAndDrinksAmount = sumTicketTotal(tickets) + sumDrinkTotal(drink_package);

  let calculatedDepositAmount = 0;
  if (depositType === "percentage") {
    calculatedDepositAmount = (tableTotalAmount * depositValue) / 100;
  } else {
    tables.forEach((table) => {
      const guests = table.allocation.reduce((sum, count) => sum + count, 0);
      calculatedDepositAmount += depositValue * guests;
    });
  }

  const tableBalanceLater = Math.max(0, tableTotalAmount - calculatedDepositAmount);
  const payToday = calculatedDepositAmount + ticketsAndDrinksAmount;
  const payLater = tableBalanceLater;

  const sym = checkoutLogCurrencySymbol();
  console.log(`📊 Date ${dateKey} deposit breakdown:`, {
    dateTotal,
    tableTotalAmount,
    calculatedDepositAmount,
    ticketsAndDrinksAmount,
    payToday: formatMoney(payToday, sym),
    payLater: formatMoney(payLater, sym),
    depositType,
    depositValue,
  });

  return {
    dateTotal,
    payToday,
    payLater,
    calculatedDepositAmount,
    isDeposit: true,
  };
}

function buildCheckoutDateData(
  dateKey: string,
  dateData: EditableDateData,
  apiEventData: ApiEventCartData | null,
): { payload: CheckoutDateData; totals: DatePaymentTotals } | null {
  const tables = transformEditableTables(dateData);
  const tickets = transformEditableTickets(dateData);
  const drink_package = transformEditableDrinks(dateData);

  const hasItems =
    tables.length > 0 || tickets.length > 0 || drink_package.length > 0;
  if (!hasItems) return null;

  const { date: eventDate } = parseRoomDateKey(dateKey);
  const totals = calculateDatePaymentTotals(
    dateData,
    apiEventData,
    dateKey,
    tables,
    tickets,
    drink_package,
  );

  const apiDateData = getApiDateData(apiEventData as ApiEventCartData, dateKey);
  const paymentConfig = apiDateData?.payment;

  const payload: CheckoutDateData = {
    event_date: eventDate,
    special_request: dateData.specialRequest || "",
    is_deposit: totals.isDeposit,
    deposit_amount: totals.calculatedDepositAmount,
    amount_per_date: totals.dateTotal,
    tables,
    tickets,
    drink_package,
  };

  if (totals.isDeposit) {
    payload.deposit_type = paymentConfig?.deposit_type;
    payload.deposit_value = paymentConfig?.deposit_value;
  }

  return { payload, totals };
}

function collectCheckoutDates(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiEventData: ApiEventCartData | null,
): {
  dates: CheckoutDateData[];
  subTotal: number;
  payToday: number;
  payLater: number;
} {
  const eventData = editingData[eventSlug];
  if (!eventData) {
    return { dates: [], subTotal: 0, payToday: 0, payLater: 0 };
  }

  const dateKeys = isRoomBasedCart(apiEventData)
    ? getAllRoomDateKeys(apiEventData)
    : Object.keys(eventData);

  let subTotal = 0;
  let payToday = 0;
  let payLater = 0;
  const dates: CheckoutDateData[] = [];

  for (const dateKey of dateKeys) {
    const dateData = eventData[dateKey];
    if (!dateData) continue;

    const built = buildCheckoutDateData(dateKey, dateData, apiEventData);
    if (!built) continue;

    dates.push(built.payload);
    subTotal += built.totals.dateTotal;
    payToday += built.totals.payToday;
    payLater += built.totals.payLater;
  }

  return { dates, subTotal, payToday, payLater };
}

function collectCheckoutRooms(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiEventData: ApiEventCartData | null,
): {
  rooms: CheckoutRoomData[];
  subTotal: number;
  payToday: number;
  payLater: number;
} {
  const eventData = editingData[eventSlug];
  const cartRooms = getCartRooms(apiEventData);
  if (!eventData || cartRooms.length === 0) {
    return { rooms: [], subTotal: 0, payToday: 0, payLater: 0 };
  }

  let subTotal = 0;
  let payToday = 0;
  let payLater = 0;
  const rooms: CheckoutRoomData[] = [];

  for (const room of cartRooms) {
    const roomDates: CheckoutDateData[] = [];
    const roomDateKeys = getAllRoomDateKeys(apiEventData).filter((dateKey) => {
      const { roomId } = parseRoomDateKey(dateKey);
      return roomId === room.room_id;
    });

    for (const dateKey of roomDateKeys) {
      const dateData = eventData[dateKey];
      if (!dateData) continue;

      const built = buildCheckoutDateData(dateKey, dateData, apiEventData);
      if (!built) continue;

      roomDates.push(built.payload);
      subTotal += built.totals.dateTotal;
      payToday += built.totals.payToday;
      payLater += built.totals.payLater;
    }

    if (roomDates.length > 0) {
      rooms.push({
        room_id: room.room_id,
        room_name: room.room_name,
        dates: roomDates,
      });
    }
  }

  return { rooms, subTotal, payToday, payLater };
}

/**
 * Transform cart edit store data into checkout API format.
 */
export function transformCartToCheckout(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiCartData: unknown,
  paymentGateway?: string | number | null,
): CheckoutRequest | null {
  const eventData = editingData[eventSlug];
  if (!eventData) {
    console.error("No event data found for slug:", eventSlug);
    return null;
  }

  const eventsArray = extractEventsFromApiResponse(apiCartData);
  const apiEventData = findEventBySlug(eventsArray, eventSlug);
  const vendorEventId = apiEventData?.vendor_event_id;

  if (!vendorEventId) {
    console.error("No vendor_event_id found in API data for event:", eventSlug);
    return null;
  }

  const gatewayId = Number(paymentGateway);
  if (!Number.isFinite(gatewayId) || gatewayId <= 0) {
    console.error("Invalid payment gateway id:", paymentGateway);
    return null;
  }

  const roomMode = isRoomBasedCart(apiEventData);
  let subTotal = 0;
  let payToday = 0;
  let payLater = 0;
  let checkoutDates: CheckoutDateData[] | undefined;
  let checkoutRooms: CheckoutRoomData[] | undefined;

  if (roomMode) {
    const collected = collectCheckoutRooms(eventSlug, editingData, apiEventData);
    subTotal = collected.subTotal;
    payToday = collected.payToday;
    payLater = collected.payLater;
    checkoutRooms = collected.rooms;
  } else {
    const collected = collectCheckoutDates(eventSlug, editingData, apiEventData);
    subTotal = collected.subTotal;
    payToday = collected.payToday;
    payLater = collected.payLater;
    checkoutDates = collected.dates;
  }

  const hasDates = roomMode
    ? (checkoutRooms?.length ?? 0) > 0
    : (checkoutDates?.length ?? 0) > 0;

  if (!hasDates || subTotal <= 0) {
    console.error("No valid dates found for checkout");
    return null;
  }

  const checkoutPayload: CheckoutRequest = {
    vendor_event_id: vendorEventId,
    event_slug: eventSlug,
    is_rooms: roomMode,
    payment_gateway: gatewayId,
    sub_total: subTotal,
    partial_payment: payLater > 0 ? payLater : null,
    total: payToday,
  };

  if (roomMode) {
    checkoutPayload.rooms = checkoutRooms;
  } else {
    checkoutPayload.dates = checkoutDates;
  }

  console.log("🛒 Generated checkout payload:", {
    vendor_event_id: checkoutPayload.vendor_event_id,
    event_slug: checkoutPayload.event_slug,
    is_rooms: checkoutPayload.is_rooms,
    sub_total: checkoutPayload.sub_total,
    partial_payment: checkoutPayload.partial_payment,
    total: checkoutPayload.total,
    payment_gateway: checkoutPayload.payment_gateway,
    dates_count: roomMode
      ? checkoutPayload.rooms?.reduce(
          (sum: number, room: CheckoutRoomData) => sum + room.dates.length,
          0,
        )
      : checkoutPayload.dates?.length,
  });

  return checkoutPayload;
}

/**
 * Validate checkout requirements before processing
 */
export function validateCheckoutRequirements(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiCartData?: unknown,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const eventData = editingData[eventSlug];

  if (!eventData) {
    errors.push("No event data found");
    return { isValid: false, errors };
  }

  const eventsArray = extractEventsFromApiResponse(apiCartData);
  const apiEventData = findEventBySlug(eventsArray, eventSlug);
  const dateKeys = isRoomBasedCart(apiEventData)
    ? getAllRoomDateKeys(apiEventData)
    : Object.keys(eventData);

  let hasAnyItems = false;
  let hasValidDates = 0;

  dateKeys.forEach((date) => {
    const dateData = eventData[date];
    if (!dateData) return;

    const billableTables = getBillableTables(dateData);
    const hasItems =
      billableTables.length > 0 ||
      dateData.tickets.some((t) => t.quantity > 0) ||
      dateData.drinks.some((d) => d.quantity > 0);

    if (hasItems) {
      hasAnyItems = true;
      hasValidDates++;

      if (hasUnconfirmedTableSeating(dateData)) {
        errors.push(
          `${date}: Please confirm table seating, or remove it to continue with tickets only`,
        );
      }

      const hasTableOrTicket =
        billableTables.length > 0 ||
        dateData.tickets.some((t) => t.quantity > 0);

      if (!hasTableOrTicket) {
        errors.push(
          `${date}: Must have at least one table or ticket (drinks alone are not sufficient)`,
        );
      }

      const selectedTables = billableTables;
      const totalTablesSelected = selectedTables.reduce(
        (sum, table) => sum + table.quantity,
        0,
      );

      if (selectedTables.length > 0 && dateData.peopleCount) {
        let totalMinCapacity = 0;
        let totalMaxCapacity = 0;

        selectedTables.forEach((table) => {
          const minPersons = table.minPersons || 1;
          const maxPersons = table.maxPersons || 999;
          totalMinCapacity += minPersons * table.quantity;
          totalMaxCapacity += maxPersons * table.quantity;
        });

        if (dateData.peopleCount > totalMaxCapacity) {
          errors.push(
            `${date}: Insufficient table capacity! You have ${dateData.peopleCount} guests but selected tables can only accommodate ${totalMaxCapacity} guests maximum. Please add more tables.`,
          );
        }

        if (dateData.peopleCount < totalMinCapacity) {
          errors.push(
            `${date}: Selected tables require at least ${totalMinCapacity} guests, but you have ${dateData.peopleCount} guests. Please select smaller tables or reduce table quantity.`,
          );
        }
      }

      if (totalTablesSelected > 1) {
        selectedTables.forEach((table) => {
          if (!table.allocation || table.allocation.length !== table.quantity) {
            errors.push(`${date}: Guest allocation required for ${table.title}`);
          } else {
            table.allocation.forEach((guestCount, index) => {
              if (guestCount < (table.minPersons || 1)) {
                errors.push(
                  `${date}: ${table.title} Table ${index + 1} needs at least ${table.minPersons} guests`,
                );
              }
              if (guestCount > (table.maxPersons || 999)) {
                errors.push(
                  `${date}: ${table.title} Table ${index + 1} exceeds maximum ${table.maxPersons} guests`,
                );
              }
            });
          }
        });

        if (dateData.peopleCount) {
          let totalAllocated = 0;
          selectedTables.forEach((table) => {
            if (table.allocation) {
              totalAllocated += table.allocation.reduce(
                (sum, guests) => sum + guests,
                0,
              );
            }
          });

          if (totalAllocated !== dateData.peopleCount) {
            errors.push(
              `${date}: Total allocated guests (${totalAllocated}) must equal group size (${dateData.peopleCount})`,
            );
          }
        }
      } else if (totalTablesSelected === 1) {
        const singleTable = selectedTables[0];
        if (dateData.peopleCount && singleTable) {
          const maxCapacity = singleTable.maxPersons || 999;
          const minCapacity = singleTable.minPersons || 1;

          if (dateData.peopleCount > maxCapacity) {
            errors.push(
              `${date}: ${singleTable.title} can only accommodate ${maxCapacity} guests maximum, but you have ${dateData.peopleCount} guests. Please select additional tables or a larger table option.`,
            );
          }

          if (dateData.peopleCount < minCapacity) {
            errors.push(
              `${date}: ${singleTable.title} requires at least ${minCapacity} guests, but you have ${dateData.peopleCount} guests. Please select a smaller table option.`,
            );
          }
        }
      }
    }
  });

  if (!hasAnyItems) {
    errors.push("Cart is empty - please add items to proceed with checkout");
  }

  if (hasValidDates === 0) {
    errors.push(
      "No valid dates found - each date must have at least one table or ticket",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate checkout totals summary for UI display.
 */
export function calculateCheckoutSummary(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiCartData?: unknown,
): {
  subTotal: number;
  platformFee: number;
  platformFeeLabel: string | null;
  grandTotal: number;
  payToday: number;
  payLater: number;
  payTodayWithFee: number;
  dateCount: number;
  itemCount: number;
} {
  const eventsArray = extractEventsFromApiResponse(apiCartData);
  const apiEventData = findEventBySlug(eventsArray, eventSlug);
  const roomMode = isRoomBasedCart(apiEventData);

  let subTotal = 0;
  let payToday = 0;
  let payLater = 0;
  let dateCount = 0;

  if (roomMode) {
    const collected = collectCheckoutRooms(eventSlug, editingData, apiEventData);
    subTotal = collected.subTotal;
    payToday = collected.payToday;
    payLater = collected.payLater;
    dateCount = collected.rooms.reduce(
      (sum, room) => sum + room.dates.length,
      0,
    );
  } else {
    const collected = collectCheckoutDates(eventSlug, editingData, apiEventData);
    subTotal = collected.subTotal;
    payToday = collected.payToday;
    payLater = collected.payLater;
    dateCount = collected.dates.length;
  }

  let itemCount = 0;
  const eventData = editingData[eventSlug];
  if (eventData) {
    const dateKeys = roomMode
      ? getAllRoomDateKeys(apiEventData)
      : Object.keys(eventData);

    dateKeys.forEach((dateKey) => {
      const dateData = eventData[dateKey];
      if (!dateData) return;

      getBillableTables(dateData).forEach((table) => {
        itemCount += table.quantity;
      });
      dateData.tickets
        .filter((t) => t.quantity > 0)
        .forEach((ticket) => {
          itemCount += ticket.quantity;
        });
      dateData.drinks
        .filter((d) => d.quantity > 0)
        .forEach((drink) => {
          itemCount += drink.quantity;
        });
    });
  }

  const { fee: platformFee, label: platformFeeLabel } =
    calculatePlatformFeeFromApi(apiEventData, subTotal);
  const grandTotal = subTotal + platformFee;
  const payTodayWithFee = payToday + platformFee;

  return {
    subTotal,
    platformFee,
    platformFeeLabel,
    grandTotal,
    payToday,
    payLater,
    payTodayWithFee,
    dateCount,
    itemCount,
  };
}
