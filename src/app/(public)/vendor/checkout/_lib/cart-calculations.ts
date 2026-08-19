/**
 * Professional cart calculation utilities
 * Following DRY principles - shared logic between CartManager and OrderSummary
 * Updated to handle partial payment system
 */

import { CART_METADATA_KEYS_SET } from "@/lib/constants/cart-meta-keys";
import {
  ApiEventCartData,
  ApiEventCartDateBucket,
  ApiDateData,
  ApiTableData,
  ApiRoomCartData,
  ApiEventRoomCatalogItem,
} from "@/lib/types/cart.types";
import type { EditableDateData } from "@/store/cart-edit.store";

type CartApiTableBucket = ApiTableData & {
  no_tables?: number;
  quantity?: number;
  allocation?: number[];
};

function getApiTableOrderQty(
  table: CartApiTableBucket,
): number {
  return Number(table.no_tables ?? table.quantity ?? 0);
}

function getApiTicketOrderQty(ticket: unknown): number {
  const row = ticket as {
    quantity?: number | string;
    selected_quantity?: number | string;
  };
  return Number(row.quantity ?? row.selected_quantity ?? 0);
}

function getApiDrinkRows(dateData: ApiDateData): Array<{
  price?: string | number;
  quantity?: string | number;
}> {
  if (dateData.selected_drinks?.length) {
    return dateData.selected_drinks;
  }
  return dateData.drinks ?? [];
}

/**
 * Calculate total items and amount from API cart data
 * Items = number of dates with data, Amount = sum of all prices
 * Updated to handle new API structure with selected_drinks
 */
function sumApiDateBucketAmount(dateData: ApiDateData | null): number {
  if (!dateData) return 0;

  let amount = 0;

  getApiDrinkRows(dateData).forEach((drink) => {
    const quantity = Number(drink.quantity) || 0;
    if (quantity <= 0) return;
    amount += parseFloat(String(drink.price || "0")) * quantity;
  });

  if (dateData.tables?.length) {
    dateData.tables.forEach((rawTable) => {
      const table = rawTable as CartApiTableBucket;
      const qty = getApiTableOrderQty(table);
      const allocation = table.allocation ?? [];
      const allocatedGuests = allocation.reduce(
        (sum, guests) => sum + Number(guests),
        0,
      );
      if (qty <= 0 && allocatedGuests <= 0) return;

      const pricePerPerson = parseFloat(String(table.price || 0));
      if (allocatedGuests > 0) {
        amount += pricePerPerson * allocatedGuests;
      } else {
        amount += pricePerPerson * (table.min_persons || 1) * qty;
      }
    });
  }

  if (dateData.tickets?.length) {
    dateData.tickets.forEach((ticket) => {
      const quantity = getApiTicketOrderQty(ticket);
      if (quantity <= 0) return;
      amount += parseFloat(String(ticket.price || 0)) * quantity;
    });
  }

  return amount;
}

/** Billable total for one API date bucket (tables, tickets, drinks). */
export function getApiDateBucketAmount(
  dateData: ApiDateData | null | undefined,
): number {
  return sumApiDateBucketAmount(dateData ?? null);
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

/** Guest count for display — only when table seating is active and billable. */
export function getDateGuestCount(
  dateData: Pick<
    EditableDateData,
    "tables" | "confirmedTableIds" | "peopleCount" | "tableSeatingSkipped"
  >,
): number {
  if (dateData.tableSeatingSkipped) return 0;

  const billableTables = getBillableTables(dateData);
  if (billableTables.length === 0) return 0;

  const fromTables = billableTables.reduce((sum, table) => {
    if (table.allocation?.length) {
      return sum + table.allocation.reduce((s, g) => s + g, 0);
    }
    return sum + (table.minPersons || 1) * table.quantity;
  }, 0);
  if (fromTables > 0) return fromTables;

  const peopleCount = dateData.peopleCount ?? 0;
  return peopleCount > 0 ? peopleCount : 0;
}

/** Saved cart tables from GET — billable when quantity and allocation exist. */
export function hasApiBillableTables(apiDate: ApiDateData | null): boolean {
  if (!apiDate?.tables?.length) return false;
  return apiDate.tables.some((table) => {
    const bucket = table as CartApiTableBucket;
    const qty = getApiTableOrderQty(bucket);
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

type EditableDateBillableSlice = Pick<
  EditableDateData,
  "tables" | "tickets" | "drinks" | "confirmedTableIds"
>;

/** Drink package total only — never included in discount / coupon bases. */
export function calculateEditableDateDrinksTotal(
  dateData: EditableDateBillableSlice | null | undefined,
): number {
  if (!dateData) return 0;

  let total = 0;
  for (const drink of dateData.drinks) {
    if (drink.quantity > 0) {
      total += drink.price * drink.quantity;
    }
  }
  return total;
}

/** Confirmed table seating total only (used by flat per-person table offers). */
export function calculateEditableDateTablesTotal(
  dateData: EditableDateBillableSlice | null | undefined,
): number {
  if (!dateData) return 0;

  let total = 0;
  for (const table of getBillableTables(dateData)) {
    total += tableLineTotal(table);
  }
  return total;
}

/** Ticket lines only. */
export function calculateEditableDateTicketsTotal(
  dateData: EditableDateBillableSlice | null | undefined,
): number {
  if (!dateData) return 0;

  let total = 0;
  for (const ticket of dateData.tickets) {
    if (ticket.quantity > 0) {
      total += ticket.price * ticket.quantity;
    }
  }
  return total;
}

/**
 * Tables + tickets only. Percentage offers and coupon codes use
 * this base — drink packages are always excluded.
 */
export function calculateEditableDateDiscountableTotal(
  dateData: EditableDateBillableSlice | null | undefined,
): number {
  if (!dateData) return 0;
  return (
    calculateEditableDateTablesTotal(dateData) +
    calculateEditableDateTicketsTotal(dateData)
  );
}

/** Sum tickets, confirmed tables, and drinks for one editable date bucket. */
export function calculateEditableDateTotal(
  dateData: EditableDateBillableSlice | null | undefined,
): number {
  if (!dateData) return 0;
  return (
    calculateEditableDateDiscountableTotal(dateData) +
    calculateEditableDateDrinksTotal(dateData)
  );
}

/** Cart-wide discountable subtotal (tables + tickets across all dates). */
export function calculateEditableCartDiscountableTotal(
  eventData: ApiEventCartData | null | undefined,
  getEditableDate: (dateKey: string) => EditableDateData | null | undefined,
): number {
  if (!eventData) return 0;
  return getApiCartDateKeys(eventData).reduce((sum, dateKey) => {
    return (
      sum + calculateEditableDateDiscountableTotal(getEditableDate(dateKey))
    );
  }, 0);
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

/** Whether editable cart state has tables, tickets, or drinks selected. */
export function hasEditableCartSelections(
  dateData:
    | Pick<EditableDateData, "tables" | "tickets" | "drinks">
    | null
    | undefined,
): boolean {
  if (!dateData) return false;

  return (
    dateData.tables.some((table) => table.quantity > 0) ||
    dateData.tickets.some((ticket) => ticket.quantity > 0) ||
    dateData.drinks.some((drink) => drink.quantity > 0)
  );
}

/** Whether an API date bucket has billable selections (not just an empty shell). */
export function hasActiveApiDateSelections(
  dateData: ApiDateData | null | undefined,
): boolean {
  if (!dateData) return false;

  const subtotal = Number(
    (dateData as ApiDateData & { date_subtotal?: number }).date_subtotal ?? 0,
  );
  if (subtotal > 0) return true;
  if (getApiDateBucketAmount(dateData) > 0) return true;

  return hasApiBillableTables(dateData);
}

/** Whether a date bucket exists in the API cart (including empty initialized shells). */
export function isDateInApiCartShell(
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

/** Whether a date is in the API cart with actual selections (not an empty shell). */
export function isDateInApiCart(
  eventData: ApiEventCartData | null | undefined,
  date: string,
  roomId?: number | null,
): boolean {
  if (!isDateInApiCartShell(eventData, date, roomId)) return false;

  const storeKey = buildCartDateLookupKey(date, roomId);
  const apiDate = eventData ? getApiDateData(eventData, storeKey) : null;
  return hasActiveApiDateSelections(apiDate);
}

/** Per-date cart state for event page date cards and checkout navigation. */
export type DateCartStatus = {
  /** Billable items selected (tables / tickets / drinks with qty > 0). */
  hasSelections: boolean;
  /** Date bucket exists in API or local store (includes empty initialized shells). */
  hasSession: boolean;
};

/** Whether local/API editable state represents an initialized cart session. */
export function hasInitializedEditableDateSession(
  dateData: EditableDateData | null | undefined,
): boolean {
  if (!dateData) return false;
  if (dateData.hasChanges) return true;
  if (hasEditableCartSelections(dateData)) return true;

  if (dateData.tables.some((table) => table.quantity > 0)) return true;
  if ((dateData.confirmedTableIds?.length ?? 0) > 0) return true;

  return false;
}

/** Whether a local date bucket should remain in persisted cart-edit storage. */
export function shouldPersistEditableDate(dateData: EditableDateData): boolean {
  return hasInitializedEditableDateSession(dateData);
}

/** Resolve cart status for one event date (API + optional local overlay). */
export function resolveDateCartStatus(params: {
  date: string;
  roomId?: number | null;
  cartEventData: ApiEventCartData | null | undefined;
  localData: EditableDateData | null | undefined;
}): DateCartStatus {
  const { date, roomId, cartEventData, localData } = params;
  const eventData = cartEventData ?? null;

  return {
    hasSelections:
      hasEditableCartSelections(localData) ||
      isDateInApiCart(eventData, date, roomId),
    hasSession:
      hasInitializedEditableDateSession(localData) ||
      isDateInApiCartShell(eventData, date, roomId),
  };
}

/** Whether the event page date card should show the VIEW CART label. */
export function shouldShowViewCartOnDateCard(status: DateCartStatus): boolean {
  return status.hasSelections || status.hasSession;
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

/** Per-date automatic discount from GET /customer/event (flat or room cart). */
export function getApiDateDiscount(
  eventData: ApiEventCartData | null | undefined,
  dateKey: string,
) {
  if (!eventData) return null;
  const bucket = getApiDateData(eventData, dateKey) as
    | (ApiDateData & {
        discount?: ApiEventCartDateBucket["discount"];
      })
    | null;
  return bucket?.discount ?? null;
}

export type CartDateDiscountStatus = "applied" | "locked" | "expired";

export type CartDateDiscountRow = {
  dateKey: string;
  valueLabel: string;
  amount: number;
  status: CartDateDiscountStatus;
  guestCount: number;
  minPeople: number | null;
  unlockHint: string | null;
  dateSubtotal: number;
};

function roundDiscountMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

function isApiDateDiscountExpired(
  expiresAt: string | null | undefined,
): boolean {
  const raw = expiresAt?.trim();
  if (!raw) return false;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T23:59:59`
    : raw;
  const end = new Date(normalized);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
}

export function getDateDiscountMinPeople(
  discount: ApiEventCartDateBucket["discount"] | null | undefined,
): number | null {
  const n = Number(discount?.min_people);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** True when flat offer is per seated guest (table offer). */
export function isFlatPerPersonDateDiscount(
  discount: ApiEventCartDateBucket["discount"] | null | undefined,
): boolean {
  return (
    discount?.discount_type === "flat" && discount.flat_mode === "per_person"
  );
}

export type DateDiscountEligibilityInput = {
  /** Table seating guests (allocation / peopleCount). */
  guestCount: number;
  /** Tables + tickets total (never drinks). */
  discountableTotal: number;
  /** Confirmed table seating total only. */
  tableTotal: number;
};

/**
 * Eligibility by offer mode:
 * - flat per_person (table offer): guestCount > 0, meets min_people, tableTotal > 0
 * - percentage: discountableTotal (tables + tickets) > 0
 * - flat off total is no longer supported
 */
export function isDateDiscountEligible(
  discount: ApiEventCartDateBucket["discount"] | null | undefined,
  guestCountOrInput: number | DateDiscountEligibilityInput,
  discountableTotal = 0,
  tableTotal = 0,
): boolean {
  if (!discount) return false;
  if (isApiDateDiscountExpired(discount.expires_at)) return false;
  const amount = Number(discount.amount);
  if (!Number.isFinite(amount) || !(amount > 0)) return false;

  const guestCount =
    typeof guestCountOrInput === "number"
      ? guestCountOrInput
      : guestCountOrInput.guestCount;
  const discountable =
    typeof guestCountOrInput === "number"
      ? discountableTotal
      : guestCountOrInput.discountableTotal;
  const tables =
    typeof guestCountOrInput === "number"
      ? tableTotal
      : guestCountOrInput.tableTotal;

  if (isFlatPerPersonDateDiscount(discount)) {
    if (!(tables > 0) || guestCount <= 0) return false;
    const minPeople = getDateDiscountMinPeople(discount);
    if (minPeople != null && guestCount < minPeople) return false;
    return true;
  }

  if (discount.discount_type === "percentage") {
    return discountable > 0;
  }

  return false;
}

/**
 * Savings by offer mode (drinks never included):
 * - percentage → % of tables + tickets
 * - flat per_person → amount × guests, capped by table total only
 */
export function computeDateDiscountAmount(
  discount: ApiEventCartDateBucket["discount"] | null | undefined,
  dateSubtotalOrInput: number | DateDiscountEligibilityInput,
  guestCount = 0,
  tableTotal = 0,
): number {
  if (!discount) return 0;

  const input: DateDiscountEligibilityInput =
    typeof dateSubtotalOrInput === "number"
      ? {
          discountableTotal: dateSubtotalOrInput,
          guestCount,
          tableTotal:
            tableTotal > 0 ? tableTotal : dateSubtotalOrInput,
        }
      : dateSubtotalOrInput;

  if (!isDateDiscountEligible(discount, input)) return 0;

  const amount = Number(discount.amount);
  if (!Number.isFinite(amount) || !(amount > 0)) return 0;

  // Percentage → tables + tickets (not drinks)
  if (discount.discount_type === "percentage") {
    if (!(input.discountableTotal > 0)) return 0;
    return roundDiscountMoney(
      Math.min(
        input.discountableTotal,
        (input.discountableTotal * amount) / 100,
      ),
    );
  }

  if (discount.discount_type === "flat") {
    // Table offer: £X OFF / person × seated guests, capped by table total
    if (isFlatPerPersonDateDiscount(discount)) {
      if (!(input.tableTotal > 0) || input.guestCount <= 0) return 0;
      return roundDiscountMoney(
        Math.min(input.tableTotal, amount * input.guestCount),
      );
    }
  }

  return 0;
}

/**
 * Resolve every date offer in the cart with eligibility + savings amount.
 * `getEditableDate` should return live cart-edit store data for guest counts.
 */
export function resolveCartDateDiscounts(
  eventData: ApiEventCartData | null | undefined,
  getEditableDate: (dateKey: string) => EditableDateData | null | undefined,
): CartDateDiscountRow[] {
  if (!eventData) return [];
  const rows: CartDateDiscountRow[] = [];

  for (const dateKey of getApiCartDateKeys(eventData)) {
    const discount = getApiDateDiscount(eventData, dateKey);
    const label = discount?.value_label?.trim();
    if (!discount || !label) continue;

    const editable = getEditableDate(dateKey) ?? null;
    const tableTotal = editable
      ? calculateEditableDateTablesTotal(editable)
      : 0;
    const dateSubtotal = editable
      ? calculateEditableDateDiscountableTotal(editable)
      : 0;
    const guestCount = editable ? getDateGuestCount(editable) : 0;
    const minPeople = getDateDiscountMinPeople(discount);
    const expired = isApiDateDiscountExpired(discount.expires_at);
    const eligibilityInput: DateDiscountEligibilityInput = {
      guestCount,
      discountableTotal: dateSubtotal,
      tableTotal,
    };

    let status: CartDateDiscountStatus = "applied";
    let unlockHint: string | null = null;

    if (expired) {
      status = "expired";
      unlockHint = "This offer has expired";
    } else if (isFlatPerPersonDateDiscount(discount)) {
      if (guestCount <= 0 || !(tableTotal > 0)) {
        status = "locked";
        unlockHint = minPeople
          ? `Confirm table seating with at least ${minPeople} guests to unlock`
          : "Confirm table seating to unlock this offer";
      } else if (minPeople != null && guestCount < minPeople) {
        status = "locked";
        const needed = minPeople - guestCount;
        unlockHint = `Add ${needed} more guest${needed === 1 ? "" : "s"} (min ${minPeople}) to unlock`;
      }
    } else if (discount.discount_type === "percentage" && !(dateSubtotal > 0)) {
      status = "locked";
      unlockHint = "Add tables or tickets to use this offer (drinks excluded)";
    }

    const amount =
      status === "applied"
        ? computeDateDiscountAmount(discount, eligibilityInput)
        : 0;

    // Hide zero-savings "applied" rows when nothing discountable is selected yet.
    if (status === "applied" && amount <= 0) {
      const hasBase =
        isFlatPerPersonDateDiscount(discount)
          ? tableTotal > 0
          : dateSubtotal > 0;
      if (!hasBase) continue;
    }

    rows.push({
      dateKey,
      valueLabel: label,
      amount,
      status,
      guestCount,
      minPeople,
      unlockHint,
      dateSubtotal,
    });
  }

  return rows;
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

/** Count all date buckets in the API cart (including empty initialized shells). */
export function countDatesInEventCart(
  eventData: ApiEventCartData | null,
): number {
  if (!eventData) return 0;
  return getApiCartDateKeys(eventData).length;
}

/** Count dates with billable selections (conflict modal, payment totals). */
export function countEventCartDates(
  eventData: ApiEventCartData | null,
): number {
  return countActiveDates(eventData);
}

/** Count dates that have tables, tickets, or drinks in the API payload. */
export function countActiveDates(eventData: ApiEventCartData | null): number {
  if (!eventData) return 0;

  return getApiCartDateKeys(eventData).filter((dateKey) =>
    hasActiveApiDateSelections(getApiDateData(eventData, dateKey)),
  ).length;
}

/** True when GET cart returns no event rows (fully empty cart). */
export function isApiCartResponseEmpty(apiCartData: unknown): boolean {
  if (apiCartData == null) return false;
  if (typeof apiCartData !== "object") return true;
  if (Array.isArray(apiCartData)) return apiCartData.length === 0;

  const events = extractEventsFromApiResponse(apiCartData);
  return events.length === 0;
}

function countZustandCartDates(
  editingData: Record<string, Record<string, EditableDateData>>,
): { totalDates: number; totalEvents: number } {
  let totalDates = 0;
  let totalEvents = 0;

  Object.values(editingData).forEach((eventData) => {
    const dateCount = Object.keys(eventData).length;
    if (dateCount > 0) {
      totalDates += dateCount;
      totalEvents++;
    }
  });

  return { totalDates, totalEvents };
}

export type CartDatesSummary = {
  totalDates: number;
  totalEvents: number;
  hasItems: boolean;
  /** Header badge — prefers date count, falls back to event count when dates are missing. */
  badgeCount: number;
};

function buildCartDatesSummary(
  totalDates: number,
  totalEvents: number,
): CartDatesSummary {
  const hasItems = totalDates > 0 || totalEvents > 0;
  const badgeCount =
    totalDates > 0 ? totalDates : totalEvents > 0 ? totalEvents : 0;

  return { totalDates, totalEvents, hasItems, badgeCount };
}

/** Header / badge counts — all cart dates (shells + selections), merged with Zustand. */
export function summarizeCartDates(
  apiCartData: unknown,
  editingData: Record<
    string,
    Record<string, EditableDateData>
  >,
): CartDatesSummary {
  const zustandCounts = countZustandCartDates(editingData);

  if (apiCartData == null) {
    return buildCartDatesSummary(
      zustandCounts.totalDates,
      zustandCounts.totalEvents,
    );
  }

  if (isApiCartResponseEmpty(apiCartData)) {
    return buildCartDatesSummary(0, 0);
  }

  const eventsArray = extractEventsFromApiResponse(apiCartData);
  let totalDatesFromAPI = 0;

  eventsArray.forEach((event) => {
    totalDatesFromAPI += countDatesInEventCart(event);
  });

  const totalDates = Math.max(totalDatesFromAPI, zustandCounts.totalDates);
  const totalEvents = Math.max(eventsArray.length, zustandCounts.totalEvents);

  return buildCartDatesSummary(totalDates, totalEvents);
}
