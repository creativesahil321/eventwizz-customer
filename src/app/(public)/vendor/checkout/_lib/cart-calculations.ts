/**
 * Professional cart calculation utilities
 * Following DRY principles - shared logic between CartManager and OrderSummary
 * Updated to handle partial payment system
 */

import { CART_METADATA_KEYS_SET } from "@/lib/constants/cart-meta-keys";
import {
  ApiEventCartData,
  ApiDateData,
  ApiTableData,
  ApiRoomCartData,
  ApiEventRoomCatalogItem,
} from "@/lib/types/cart.types";
import type { EditableDateData } from "@/store/cart-edit.store";

type CartApiTableBucket = ApiTableData & {
  no_tables?: number;
  allocation?: number[];
};

/**
 * Calculate total items and amount from API cart data
 * Items = number of dates with data, Amount = sum of all prices
 * Updated to handle new API structure with selected_drinks
 */
function sumApiDateBucketAmount(dateData: ApiDateData | null): number {
  if (!dateData) return 0;

  let amount = 0;

  if (dateData.selected_drinks?.length) {
    dateData.selected_drinks.forEach((drink) => {
      const quantity = Number(drink.quantity) || 0;
      if (quantity <= 0) return;
      amount += parseFloat(String(drink.price || "0")) * quantity;
    });
  }

  if (dateData.tables?.length) {
    dateData.tables.forEach((rawTable) => {
      const table = rawTable as CartApiTableBucket;
      const qty = Number(table.no_tables ?? 0);
      if (qty <= 0) return;
      const pricePerPerson = parseFloat(String(table.price || 0));
      if (table.allocation?.length) {
        amount += pricePerPerson * table.allocation.reduce(
          (sum, guests) => sum + guests,
          0,
        );
      } else {
        amount += pricePerPerson * (table.min_persons || 1) * qty;
      }
    });
  }

  if (dateData.tickets?.length) {
    dateData.tickets.forEach((ticket) => {
      const quantity = Number(
        (ticket as unknown as { quantity?: number }).quantity ?? 0,
      );
      if (quantity <= 0) return;
      amount += parseFloat(String(ticket.price || 0)) * quantity;
    });
  }

  return amount;
}

export function calculateCartTotals(eventData: ApiEventCartData | null) {
  if (!eventData) {
    return { totalItems: 0, totalAmount: 0 };
  }

  const dateKeys = isRoomBasedCart(eventData)
    ? getAllRoomDateKeys(eventData)
    : Object.keys(eventData).filter((key) => !CART_METADATA_KEYS_SET.has(key));

  let amount = 0;

  dateKeys.forEach((dateKey) => {
    amount += sumApiDateBucketAmount(getApiDateData(eventData, dateKey));
  });

  return {
    totalItems: dateKeys.length,
    totalAmount: amount,
  };
}

/**
 * Calculate payment amounts based on per-date payment selections
 * Each date can have its own payment type (full or deposit)
 */
export function calculatePaymentAmounts(
  eventData: ApiEventCartData | null,
  selectedPaymentTypes: Record<string, "full" | "deposit">,
  eventSlug?: string, // Event slug for edit store
  getDateData?: (eventSlug: string, date: string) => unknown // Edit store function
) {
  if (!eventData) {
    return {
      totalAmount: 0,
      amountToPay: 0,
      balanceAmount: 0,
      paymentBreakdown: [],
      balanceDueDates: [],
    };
  }

  const dateKeys = isRoomBasedCart(eventData)
    ? getAllRoomDateKeys(eventData)
    : Object.keys(eventData).filter(
        (key) => !CART_METADATA_KEYS_SET.has(key),
      );

  let totalAmount = 0;
  let amountToPay = 0;
  let balanceAmount = 0;
  const paymentBreakdown: Array<{
    date: string;
    dateAmount: number;
    paymentType: "full" | "deposit";
    amountToPay: number;
    balanceAmount: number;
    balanceDueDate: string | null;
  }> = [];
  const balanceDueDates: string[] = [];

  dateKeys.forEach((dateKey) => {
    const dateData = getApiDateData(eventData, dateKey);
    const selectedPaymentType = selectedPaymentTypes[dateKey] || "full";

    // Calculate date amount from ACTUAL SELECTED ITEMS
    let dateAmount = 0;

    // Try to get actual selected items from edit store first
    if (getDateData) {
      const editStoreData = getDateData(eventSlug || "", dateKey) as {
        drinks?: Array<{ price: number; quantity: number }>;
        tables?: Array<{ price: number; quantity: number }>;
        tickets?: Array<{ price: number; quantity: number }>;
      };

      if (editStoreData) {
        // Calculate amount from selected drinks
        if (editStoreData.drinks && Array.isArray(editStoreData.drinks)) {
          editStoreData.drinks.forEach((drink) => {
            const quantity = drink.quantity || 0;
            const price = drink.price || 0;
            dateAmount += price * quantity;
          });
        }

        // Calculate amount from selected tables
        if (editStoreData.tables && Array.isArray(editStoreData.tables)) {
          editStoreData.tables.forEach((table) => {
            const quantity = table.quantity || 0;
            const price = table.price || 0;
            dateAmount += price * quantity;
          });
        }

        // Calculate amount from selected tickets
        if (editStoreData.tickets && Array.isArray(editStoreData.tickets)) {
          editStoreData.tickets.forEach((ticket) => {
            const quantity = ticket.quantity || 0;
            const price = ticket.price || 0;
            dateAmount += price * quantity;
          });
        }
      }
    }

    // Supplement from API when edit store is missing drink lines (common after room cart hydrate)
    const editDrinkTotal =
      getDateData && eventSlug
        ? (
            getDateData(eventSlug, dateKey) as {
              drinks?: Array<{ price: number; quantity: number }>;
            }
          )?.drinks?.reduce(
            (sum, drink) => sum + (drink.price || 0) * (drink.quantity || 0),
            0,
          ) ?? 0
        : 0;

    if (editDrinkTotal === 0 && dateData?.selected_drinks?.length) {
      dateData.selected_drinks.forEach((drink) => {
        const quantity = Number(drink.quantity) || 0;
        if (quantity <= 0) return;
        dateAmount += parseFloat(String(drink.price || "0")) * quantity;
      });
    }

    // Only use full API fallback if edit store data is completely unavailable
    if (dateAmount === 0 && (!getDateData || !eventSlug)) {
      dateAmount += sumApiDateBucketAmount(dateData);
    } else if (dateAmount === 0 && dateData) {
      // Edit store exists but empty — use API bucket for tables/tickets too
      const apiTablesTickets =
        sumApiDateBucketAmount(dateData) -
        (dateData.selected_drinks?.reduce((sum, drink) => {
          const quantity = Number(drink.quantity) || 0;
          if (quantity <= 0) return sum;
          return sum + parseFloat(String(drink.price || "0")) * quantity;
        }, 0) ?? 0);
      dateAmount += apiTablesTickets;
    }

    totalAmount += dateAmount;

    // Calculate payment amounts for this date
    const paymentInfo = dateData?.payment || {
      type: "full",
      is_deposit_enabled: false,
      deposit_type: "amount",
      deposit_value: 0,
      balance_due_date: null,
    };

    // Extract deposit configuration
    const isDepositEnabled = paymentInfo.is_deposit_enabled ?? false;
    const depositType = paymentInfo.deposit_type || "amount";
    const depositValue = paymentInfo.deposit_value || 0;

    // Calculate total deposit amount based on deposit type
    // We need to get the number of people from the ACTUAL SELECTED ITEMS
    let totalPeople = 0;
    let tableTotalAmount = 0;

    // Try to get actual selected items from edit store first
    if (getDateData) {
      const editStoreData = getDateData(eventSlug || "", dateKey) as {
        drinks?: Array<{ quantity?: number; price?: number }>;
        tables?: Array<{
          quantity?: number;
          minPersons?: number;
          allocation?: number[];
          pricePerPerson?: number;
          price?: number;
        }>;
        tickets?: Array<{ quantity?: number }>;
        peopleCount?: number; // Group size from "People in group" field
      };
      if (editStoreData) {
        // Use the actual group size from "People in group" field
        if (editStoreData.peopleCount && editStoreData.peopleCount > 0) {
          totalPeople = editStoreData.peopleCount;
        } else {
          // Fallback: Count from selected items if no group size set
          // Count people from selected drinks
          if (editStoreData.drinks && Array.isArray(editStoreData.drinks)) {
            editStoreData.drinks.forEach((drink) => {
              const quantity = drink.quantity || 0;
              totalPeople += quantity; // Each drink = 1 person
            });
          }

          // Count people from selected tables using allocation
          if (editStoreData.tables && Array.isArray(editStoreData.tables)) {
            editStoreData.tables.forEach((table) => {
              if (table.allocation && table.allocation.length > 0) {
                // Use actual guest allocation
                const totalGuests = table.allocation.reduce(
                  (sum, guests) => sum + guests,
                  0
                );
                totalPeople += totalGuests;

                // Calculate table amount for percentage-based deposits
                const pricePerPerson = table.pricePerPerson || table.price || 0;
                tableTotalAmount += pricePerPerson * totalGuests;
              } else {
                // Fallback if no allocation
                const quantity = table.quantity || 0;
                const tableCapacity = table.minPersons || 1;
                totalPeople += quantity * tableCapacity;

                const pricePerPerson = table.pricePerPerson || table.price || 0;
                tableTotalAmount += pricePerPerson * quantity * tableCapacity;
              }
            });
          }

          // Count people from selected tickets
          if (editStoreData.tickets && Array.isArray(editStoreData.tickets)) {
            editStoreData.tickets.forEach((ticket) => {
              const quantity = ticket.quantity || 0;
              totalPeople += quantity; // 1 person per ticket
            });
          }
        }
      }
    }

    // Fallback: Count from API data if edit store data not available
    if (totalPeople === 0) {
      // Count people from selected drinks (each drink = 1 person)
      if (
        dateData?.selected_drinks &&
        Array.isArray(dateData.selected_drinks)
      ) {
        dateData.selected_drinks.forEach((drink) => {
          const quantity = drink.quantity || 1;
          totalPeople += quantity; // Each drink = 1 person
        });
      }

      // Count people from tables (assume 1 table = min_persons people)
      if (dateData?.tables && Array.isArray(dateData.tables)) {
        dateData.tables.forEach((table) => {
          const minPersons = table.min_persons || 1;
          totalPeople += minPersons;

          // Calculate table amount for percentage-based deposits
          const pricePerPerson = parseFloat(String(table.price || 0));
          tableTotalAmount += pricePerPerson * minPersons;
        });
      }

      // Count people from tickets (1 person per ticket)
      if (dateData?.tickets && Array.isArray(dateData.tickets)) {
        totalPeople += dateData.tickets.length; // 1 person per ticket
      }

      // If still no items found, default to 1 person (minimum booking)
      if (totalPeople === 0) {
        totalPeople = 1;
      }
    }

    // Calculate total deposit based on deposit type
    let totalDepositAmount = 0;

    if (selectedPaymentType === "deposit" && isDepositEnabled) {
      if (depositType === "percentage") {
        // Percentage: calculate % of table total amount
        totalDepositAmount = (tableTotalAmount * depositValue) / 100;
      } else {
        // Amount: multiply deposit value by guest count
        totalDepositAmount = depositValue * totalPeople;
      }
    }

    const dateAmountToPay =
      selectedPaymentType === "full" ? dateAmount : totalDepositAmount;
    const dateBalanceAmount = dateAmount - totalDepositAmount;

    amountToPay += dateAmountToPay;
    balanceAmount += dateBalanceAmount;

    paymentBreakdown.push({
      date: dateKey,
      dateAmount,
      paymentType: selectedPaymentType,
      amountToPay: dateAmountToPay,
      balanceAmount: dateBalanceAmount,
      balanceDueDate: paymentInfo.balance_due_date,
    });

    if (selectedPaymentType === "deposit" && paymentInfo.balance_due_date) {
      balanceDueDates.push(paymentInfo.balance_due_date);
    }
  });

  return {
    totalAmount,
    amountToPay,
    balanceAmount,
    paymentBreakdown,
    balanceDueDates: [...new Set(balanceDueDates)], // Remove duplicates
  };
}

/**
 * Process raw API response to extract events array
 */
export function extractEventsFromApiResponse(
  apiCartData: unknown
): ApiEventCartData[] {
  if (Array.isArray(apiCartData)) {
    return apiCartData;
  }

  if (apiCartData && typeof apiCartData === "object" && "data" in apiCartData) {
    const data = (apiCartData as { data: unknown }).data;

    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === "object" && "data" in data) {
      const nestedData = (data as { data: unknown }).data;
      if (Array.isArray(nestedData)) {
        return nestedData;
      }
    }
  }

  return [];
}

/**
 * Find matching event by slug from events array
 */
export function findEventBySlug(
  events: ApiEventCartData[],
  eventSlug: string
): ApiEventCartData | null {
  const matchingEvents = events.filter(
    (event) => event.event_slug === eventSlug
  );
  return matchingEvents.length > 0 ? matchingEvents[0] : null;
}

/**
 * Get available dates from event data
 */
export function getAvailableDates(
  eventData: ApiEventCartData | null
): string[] {
  if (!eventData) {
    return [];
  }

  const dateKeys = Object.keys(eventData).filter(
    (key) => !CART_METADATA_KEYS_SET.has(key)
  );

  return dateKeys.sort();
}

/**
 * Extract current event data from API response
 * Centralized logic to avoid duplication between CartManager and OrderSummary
 */
export function extractCurrentEventData(apiCartData: unknown): {
  currentEventSlug: string | null;
  currentEventApiData: ApiEventCartData | null;
  firstDate: string | null;
} {
  if (!apiCartData) {
    return {
      currentEventSlug: null,
      currentEventApiData: null,
      firstDate: null,
    };
  }

  const eventsArray = extractEventsFromApiResponse(apiCartData);

  if (eventsArray.length === 0) {
    return {
      currentEventSlug: null,
      currentEventApiData: null,
      firstDate: null,
    };
  }

  // Get the first event (most recent or primary event)
  const firstEvent = eventsArray[0];
  const eventSlug = firstEvent.event_slug;

  // Get the first available date for this event
  const firstAvailableDate = isRoomBasedCart(firstEvent)
    ? getAllRoomDateKeys(firstEvent)[0] ?? null
    : getAvailableDates(firstEvent)[0] ?? null;

  return {
    currentEventSlug: eventSlug,
    currentEventApiData: firstEvent,
    firstDate: firstAvailableDate,
  };
}

/**
 * Calculate total for a specific date
 * Includes drinks, tables, and tickets for that date
 */
export function calculateDateTotal(
  eventData: ApiEventCartData,
  dateKey: string,
): number {
  return sumApiDateBucketAmount(getApiDateData(eventData, dateKey));
}

export function hasUnconfirmedTableSeating(
  dateData:
    | Pick<EditableDateData, "tables" | "confirmedTableIds" | "tableSeatingSkipped">
    | null
    | undefined,
): boolean {
  if (!dateData || dateData.tableSeatingSkipped) return false;
  const activeTables = dateData.tables.filter((table) => table.quantity > 0);
  if (activeTables.length === 0) return false;
  const confirmed = new Set(dateData.confirmedTableIds ?? []);
  return activeTables.some((table) => !confirmed.has(table.id));
}

/** Tables count toward totals and API only after the customer confirms seating. */
export function isTableSeatingConfirmed(
  dateData: Pick<EditableDateData, "confirmedTableIds">,
  table: { id: number; quantity: number },
): boolean {
  if (table.quantity <= 0) return false;
  return (dateData.confirmedTableIds ?? []).includes(table.id);
}

export function getBillableTables(
  dateData: Pick<EditableDateData, "tables" | "confirmedTableIds">,
): EditableDateData["tables"] {
  return dateData.tables.filter((table) =>
    isTableSeatingConfirmed(dateData, table),
  );
}

/** Saved cart tables from GET — billable when quantity and allocation exist. */
export function hasApiBillableTables(apiDate: ApiDateData | null): boolean {
  if (!apiDate?.tables?.length) return false;
  return apiDate.tables.some((table) => {
    const bucket = table as CartApiTableBucket;
    const qty = Number(bucket.no_tables ?? 0);
    const allocation = bucket.allocation ?? [];
    return qty > 0 && allocation.length > 0;
  });
}

/** Deposit/full payment options when deposit is enabled and tables are billable. */
export function isDepositChoiceAvailable(
  paymentInfo: ApiDateData["payment"] | null | undefined,
  editStoreData: Pick<EditableDateData, "tables" | "confirmedTableIds"> | null,
  apiDate: ApiDateData | null,
): boolean {
  if (!paymentInfo) return false;
  const depositEnabled =
    paymentInfo.is_deposit_enabled || paymentInfo.type === "deposit";
  if (!depositEnabled) return false;

  const storeBillable =
    getBillableTables(
      editStoreData ?? { tables: [], confirmedTableIds: [] },
    ).length > 0;
  return storeBillable || hasApiBillableTables(apiDate);
}

function tableLineTotal(table: EditableDateData["tables"][number]): number {
  const pricePerPerson = table.pricePerPerson || table.price;
  if (table.allocation?.length) {
    const guests = table.allocation.reduce((sum, g) => sum + g, 0);
    return pricePerPerson * guests;
  }
  return pricePerPerson * (table.minPersons || 1) * table.quantity;
}

/** Sum tickets, confirmed tables, and drinks for one editable date bucket. */
export function calculateEditableDateTotal(
  dateData:
    | Pick<EditableDateData, "tables" | "tickets" | "drinks" | "confirmedTableIds">
    | null
    | undefined,
): number {
  if (!dateData) return 0;

  let total = 0;

  for (const table of getBillableTables(dateData)) {
    total += tableLineTotal(table);
  }

  for (const ticket of dateData.tickets) {
    if (ticket.quantity > 0) {
      total += ticket.price * ticket.quantity;
    }
  }

  for (const drink of dateData.drinks) {
    if (drink.quantity > 0) {
      total += drink.price * drink.quantity;
    }
  }

  return total;
}

/** Per-room subtotal — prefers live Zustand edits, falls back to API date buckets. */
export function calculateRoomSubtotal(
  eventData: ApiEventCartData | null,
  roomId: number,
  options?: {
    eventSlug?: string;
    getDateData?: (
      eventSlug: string,
      dateKey: string,
    ) => EditableDateData | null;
  },
): number {
  if (!eventData) return 0;

  const room = getCartRooms(eventData).find((entry) => entry.room_id === roomId);
  const apiSubtotal = Number(room?.room_subtotal);
  if (apiSubtotal > 0 && !options?.eventSlug) {
    return apiSubtotal;
  }

  const dates = getRoomDates(eventData, roomId);
  const { eventSlug, getDateData } = options ?? {};

  return dates.reduce((sum, date) => {
    const dateKey = buildRoomDateKey(roomId, date);
    if (eventSlug && getDateData) {
      const editable = getDateData(eventSlug, dateKey);
      if (editable) {
        return sum + calculateEditableDateTotal(editable);
      }
    }
    return sum + calculateDateTotal(eventData, dateKey);
  }, 0);
}

// ─── Room-Based Cart Helpers ───────────────────────────────────────────────────

/** True when API cart payload uses the multi-room system (`is_rooms` may be 1 or true). */
export function isRoomBasedApiRecord(
  apiData: ApiEventCartData | Record<string, unknown> | null | undefined,
): boolean {
  if (!apiData) return false;
  const flag = (apiData as Record<string, unknown>).is_rooms;
  if (flag === 0 || flag === "0" || flag === false) return false;
  const rooms = (apiData as ApiEventCartData).rooms;
  return Boolean(flag && Array.isArray(rooms) && rooms.length > 0);
}

/** Check if the cart event uses the multi-room system. */
export function isRoomBasedCart(eventData: ApiEventCartData | null): boolean {
  return isRoomBasedApiRecord(eventData);
}

/** Get the rooms array from event data (empty array if not room-based). */
export function getCartRooms(
  eventData: ApiEventCartData | null,
): ApiRoomCartData[] {
  if (!eventData || !isRoomBasedCart(eventData)) return [];
  return eventData.rooms ?? [];
}

/** Room catalog from cart API (`event_rooms`), if provided. */
export function getEventRoomCatalog(
  eventData: ApiEventCartData | null,
): ApiEventRoomCatalogItem[] {
  if (!eventData?.event_rooms?.length) return [];
  return eventData.event_rooms.filter(
    (room) => Number(room.room_id) > 0 && Boolean(room.room_name),
  );
}

/** True when the event has at least one room not yet represented in the cart. */
export function hasRoomsAvailableToAdd(
  cartRooms: ApiRoomCartData[],
  catalog: ApiEventRoomCatalogItem[],
): boolean {
  if (catalog.length === 0) return false;
  const cartRoomIds = new Set(cartRooms.map((room) => room.room_id));
  return catalog.some((room) => !cartRoomIds.has(room.room_id));
}

/** Total bookable rooms — prefers `event_rooms` from cart GET, else rooms in cart. */
export function getTotalEventRoomCount(
  eventData: ApiEventCartData | null,
): number {
  const catalog = getEventRoomCatalog(eventData);
  if (catalog.length > 0) return catalog.length;
  return getCartRooms(eventData).length;
}

/** Room-specific drink section label; falls back to event-level title. */
export function getRoomDrinkTitle(
  eventData: ApiEventCartData | null,
  roomId: number | null,
): string {
  if (!eventData) return "Drinks";
  if (roomId != null && isRoomBasedCart(eventData)) {
    const room = getCartRooms(eventData).find((entry) => entry.room_id === roomId);
    if (room?.drink_title?.trim()) return room.drink_title.trim();
  }
  return eventData.drink_title?.trim() || "Drinks";
}

/** Drink catalog for a room (or event-level catalog for flat carts). */
export function getRoomDrinkCatalog(
  eventData: ApiEventCartData | null,
  roomId: number | null,
): ApiRoomCartData["drinks"] {
  if (!eventData) return [];
  if (roomId != null && isRoomBasedCart(eventData)) {
    const room = getCartRooms(eventData).find((entry) => entry.room_id === roomId);
    return room?.drinks ?? [];
  }
  return eventData.drinks ?? [];
}

/** Get available dates for a specific room. */
export function getRoomDates(
  eventData: ApiEventCartData | null,
  roomId: number,
): string[] {
  const rooms = getCartRooms(eventData);
  const room = rooms.find((r) => r.room_id === roomId);
  if (!room || !room.dates) return [];
  return Object.keys(room.dates).sort();
}

/**
 * Build composite key for Zustand store: "roomId:date".
 * For non-room carts the key is just the ISO date string.
 */
export function buildRoomDateKey(roomId: number, date: string): string {
  return `${roomId}:${date}`;
}

/** Parse a composite key back into roomId and date. Returns null roomId for flat keys. */
export function parseRoomDateKey(key: string): {
  roomId: number | null;
  date: string;
} {
  const colonIndex = key.indexOf(":");
  if (colonIndex === -1 || colonIndex > 6) {
    return { roomId: null, date: key };
  }
  const maybeRoomId = Number(key.slice(0, colonIndex));
  if (!Number.isFinite(maybeRoomId) || maybeRoomId <= 0) {
    return { roomId: null, date: key };
  }
  return { roomId: maybeRoomId, date: key.slice(colonIndex + 1) };
}

/** Zustand / lookup key for a date (composite `roomId:date` when room-scoped). */
export function buildCartDateLookupKey(
  date: string,
  roomId?: number | null,
): string {
  if (roomId != null && Number(roomId) > 0) {
    return buildRoomDateKey(Number(roomId), date);
  }
  return date;
}

function normalizeEventSlugForMatch(eventSlug: string): string {
  try {
    return decodeURIComponent(eventSlug);
  } catch {
    return eventSlug;
  }
}

/** Find one event in GET /customer/event payload by slug. */
export function findApiCartEventBySlug(
  apiCartData: unknown,
  eventSlug: string,
): ApiEventCartData | null {
  const normalized = normalizeEventSlugForMatch(eventSlug);
  return (
    extractEventsFromApiResponse(apiCartData).find(
      (event) =>
        normalizeEventSlugForMatch(event.event_slug) === normalized,
    ) ?? null
  );
}

/** Whether a date is already in the API cart for an optional room scope. */
export function isDateInApiCart(
  eventData: ApiEventCartData | null | undefined,
  date: string,
  roomId?: number | null,
): boolean {
  if (!eventData || !date) return false;

  if (roomId != null && Number(roomId) > 0) {
    const room = getCartRooms(eventData).find(
      (entry) => entry.room_id === Number(roomId),
    );
    return Boolean(room?.dates?.[date]);
  }

  if (isRoomBasedCart(eventData)) {
    return false;
  }

  const bucket = eventData[date];
  return bucket != null && typeof bucket === "object" && !Array.isArray(bucket);
}

/** Human-readable selection summary for a date row, e.g. "2 tables · group of 20 · 2 drinks". */
export function buildDateSelectionSummary(dateData: {
  tables: Array<{
    quantity: number;
    allocation?: number[];
    minPersons?: number;
  }>;
  tickets: Array<{ quantity: number }>;
  drinks: Array<{ quantity: number }>;
}): string {
  const parts: string[] = [];

  const activeTables = dateData.tables.filter((t) => t.quantity > 0);
  if (activeTables.length > 0) {
    const tableCount = activeTables.reduce((sum, t) => sum + t.quantity, 0);
    parts.push(`${tableCount} table${tableCount !== 1 ? "s" : ""}`);

    const guests = activeTables.reduce((sum, t) => {
      if (t.allocation && t.allocation.length > 0) {
        return sum + t.allocation.reduce((a, g) => a + g, 0);
      }
      return sum + (t.minPersons || 1) * t.quantity;
    }, 0);
    if (guests > 0) {
      parts.push(`group of ${guests}`);
    }
  }

  const activeTickets = dateData.tickets.filter((t) => t.quantity > 0);
  if (activeTickets.length > 0) {
    const ticketCount = activeTickets.reduce((sum, t) => sum + t.quantity, 0);
    parts.push(`${ticketCount} ticket${ticketCount !== 1 ? "s" : ""}`);
  }

  const activeDrinks = dateData.drinks.filter((d) => d.quantity > 0);
  if (activeDrinks.length > 0) {
    const drinkCount = activeDrinks.reduce((sum, d) => sum + d.quantity, 0);
    parts.push(`${drinkCount} drink${drinkCount !== 1 ? "s" : ""}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "No items selected yet";
}

/** Best-effort per-person price label for a room header. */
export function getRoomPricePerPersonLabel(
  room: ApiRoomCartData,
): number | null {
  for (const bucket of Object.values(room.dates ?? {})) {
    const table = bucket.tables?.find((t) => Number(t.price) > 0);
    if (table) return Number(table.price);

    const ticket = bucket.tickets?.find((t) => Number(t.price) > 0);
    if (ticket) return Number(ticket.price);
  }
  return null;
}

export function getAllRoomDateKeys(
  eventData: ApiEventCartData | null,
): string[] {
  if (!isRoomBasedCart(eventData)) {
    return getAvailableDates(eventData);
  }
  const rooms = getCartRooms(eventData);
  const keys: string[] = [];
  for (const room of rooms) {
    if (!room.dates) continue;
    for (const date of Object.keys(room.dates).sort()) {
      keys.push(buildRoomDateKey(room.room_id, date));
    }
  }
  return keys;
}

/** Resolve API date bucket from flat or composite cart key. */
export function getApiDateData(
  eventData: ApiEventCartData,
  dateKey: string,
): ApiDateData | null {
  if (isRoomBasedCart(eventData)) {
    const { roomId, date } = parseRoomDateKey(dateKey);
    if (roomId == null) return null;
    const room = getCartRooms(eventData).find((r) => r.room_id === roomId);
    return (room?.dates?.[date] as ApiDateData | undefined) ?? null;
  }
  return (eventData[dateKey] as ApiDateData | undefined) ?? null;
}

/** All cart date keys — composite `roomId:date` for room carts, ISO dates otherwise. */
export function getApiCartDateKeys(
  eventData: ApiEventCartData | null,
): string[] {
  if (!eventData) return [];
  if (isRoomBasedCart(eventData)) {
    return getAllRoomDateKeys(eventData);
  }
  return getAvailableDates(eventData);
}

/** Count dates in cart (used by header badge and conflict modal). */
export function countEventCartDates(
  eventData: ApiEventCartData | null,
): number {
  return getApiCartDateKeys(eventData).length;
}

/** Count dates that have tables, tickets, or drinks in the API payload. */
export function countActiveDates(eventData: ApiEventCartData | null): number {
  if (!eventData) return 0;

  return getApiCartDateKeys(eventData).filter((dateKey) => {
    const dateData = getApiDateData(eventData, dateKey);
    const hasDrinks = Boolean(
      dateData?.selected_drinks?.some((drink) => Number(drink.quantity) > 0),
    );
    const hasTables = Boolean(
      dateData?.tables?.some(
        (table) => Number((table as CartApiTableBucket).no_tables ?? 0) > 0,
      ),
    );
    const hasTickets = Boolean(
      dateData?.tickets?.some(
        (ticket) => Number((ticket as { quantity?: number }).quantity ?? 0) > 0,
      ),
    );
    return hasDrinks || hasTables || hasTickets;
  }).length;
}
