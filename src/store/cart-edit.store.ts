/**
 * Professional Cart Edit Store
 * Handles temporary cart editing state before API sync
 * Separate from main cart data to maintain clean architecture
 *
 * ⚠️ SECURITY WARNING: This store persists to localStorage and contains pricing data.
 * This creates a security vulnerability where users can manipulate prices client-side.
 * See: docs/CART_SYSTEM_SECURITY_ANALYSIS.md for details and recommended fixes.
 *
 * TODO: Refactor to store only quantities/selections, never prices or totals.
 * All pricing calculations should be server-side only.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

const CART_EDIT_STORAGE_KEY = "cart-edit-storage";
import {
  resolveBestTableSelection,
  type ResolvedTableSelection,
} from "@/app/(public)/vendor/checkout/_lib/table-recommendations";
import {
  buildRoomDateKey,
  getApiCartDateKeys,
  getBillableTables,
  hasUnconfirmedTableSeating,
  isRoomBasedApiRecord,
  parseRoomDateKey,
} from "@/app/(public)/vendor/checkout/_lib/cart-calculations";
import { formatTableCapacityTitle } from "@/app/(public)/vendor/checkout/_lib/table-labels";
import type { ApiEventCartData } from "@/lib/types/cart.types";

// Payment calculation utility
function calculatePaymentAmounts(
  dateData: EditableDateData,
  paymentType: "full" | "deposit"
): { todayAmount: number; laterAmount: number } {
  let todayAmount = 0;
  let laterAmount = 0;

  if (paymentType === "full") {
    const billableTables = getBillableTables(dateData);
    const activeItems = [
      ...billableTables,
      ...dateData.tickets.filter((ticket) => ticket.quantity > 0),
      ...dateData.drinks.filter((drink) => drink.quantity > 0),
    ];

    activeItems.forEach((item) => {
      if (item.type === "table") {
        // For tables: calculate based on actual guest allocation
        const pricePerPerson = item.pricePerPerson || item.price;

        if (item.allocation && item.allocation.length > 0) {
          // Use actual guest allocation
          const totalGuests = item.allocation.reduce(
            (sum, guests) => sum + guests,
            0
          );
          todayAmount += pricePerPerson * totalGuests;
        } else {
          // No allocation = no cost (0 guests)
          // This ensures tables with no guest allocation show £0 cost
          todayAmount += 0;
        }
      } else {
        // For tickets/drinks: use regular pricing
        todayAmount += item.price * item.quantity;
      }
    });

    laterAmount = 0;
  } else {
    const billableTables = getBillableTables(dateData);
    const activeItems = [
      ...billableTables,
      ...dateData.tickets.filter((ticket) => ticket.quantity > 0),
      ...dateData.drinks.filter((drink) => drink.quantity > 0),
    ];

    // Check if deposit is enabled for this date
    const isDepositEnabled = dateData.isDepositEnabled ?? false;
    const depositType = dateData.depositType || "amount";
    const depositValue = dateData.depositValue || 0;

    // Calculate table totals first (needed for percentage deposits)
    let tableTotalAmount = 0;
    let totalGuests = 0;

    activeItems.forEach((item) => {
      if (item.type === "table") {
        const pricePerPerson = item.pricePerPerson || item.price;

        if (item.allocation && item.allocation.length > 0) {
          const guests = item.allocation.reduce((sum, count) => sum + count, 0);
          totalGuests += guests;
          tableTotalAmount += pricePerPerson * guests;
        }
      }
    });

    // Calculate deposit based on type
    let depositAmount = 0;
    if (isDepositEnabled) {
      if (depositType === "percentage") {
        // Percentage: calculate % of table total
        depositAmount = (tableTotalAmount * depositValue) / 100;
      } else {
        // Amount: multiply by guest count
        depositAmount = depositValue * totalGuests;
      }
    }

    // Now calculate today/later amounts
    activeItems.forEach((item) => {
      if (item.type === "table") {
        const pricePerPerson = item.pricePerPerson || item.price;

        if (item.allocation && item.allocation.length > 0) {
          const guests = item.allocation.reduce((sum, count) => sum + count, 0);
          const fullAmount = pricePerPerson * guests;
          // Deposit is calculated globally above, so here we just split
          // the table's portion proportionally
          const tableDepositPortion = isDepositEnabled
            ? (fullAmount / tableTotalAmount) * depositAmount
            : 0;

          todayAmount += tableDepositPortion;
          laterAmount += fullAmount - tableDepositPortion;
        } else {
          // No allocation = no cost (0 guests)
          todayAmount += 0;
          laterAmount += 0;
        }
      } else {
        // For tickets/drinks: pay full amount (no deposit option)
        const fullAmount = item.price * item.quantity;
        todayAmount += fullAmount;
        laterAmount += 0;
      }
    });
  }

  return { todayAmount, laterAmount };
}

function clampItemQuantity(quantity: number, maxQuantity?: number): number {
  const safe = Math.max(0, quantity);
  if (maxQuantity == null || !Number.isFinite(maxQuantity) || maxQuantity < 0) {
    return safe;
  }
  return Math.min(safe, maxQuantity);
}

function mapApiTablesToEditable(
  tables: Array<Record<string, unknown>> | undefined,
  depositAmount: number,
): EditableItem[] {
  return (
    tables?.map((table) => ({
      id: Number(table.id),
      title: formatTableCapacityTitle(
        Number(table.min_persons),
        Number(table.max_persons),
      ),
      description: `Seating for ${table.min_persons} to ${table.max_persons} people`,
      price: Number(table.price),
      quantity: Number(table.no_tables || 0),
      maxQuantity: Number(table.total_tables),
      type: "table" as const,
      depositAmount,
      allocation: (table.allocation as number[]) || [],
      minPersons: Number(table.min_persons),
      maxPersons: Number(table.max_persons),
      tableSize: Number(table.max_persons),
      pricePerPerson: Number(table.price),
    })) || []
  );
}

function mapApiTicketsToEditable(
  tickets: Array<Record<string, unknown>> | undefined,
  depositAmount: number,
): EditableItem[] {
  return (
    tickets?.map((ticket) => {
      const capacity = Number(ticket.total_capacity);
      const maxQuantity =
        Number.isFinite(capacity) && capacity >= 0 ? capacity : undefined;

      return {
        id: Number(ticket.id),
        title: String(ticket.title),
        description: String(ticket.description),
        price: Number(ticket.price),
        quantity: Number(ticket.quantity || 0),
        maxQuantity,
        type: "ticket" as const,
        depositAmount,
      };
    }) || []
  );
}

function hasActiveDrinkSelection(drinks: EditableItem[]): boolean {
  return drinks.some((drink) => drink.quantity > 0);
}

function mapApiDrinksToEditable(
  drinkCatalog: Array<Record<string, unknown>>,
  selectedDrinks: Array<Record<string, unknown>> | undefined,
  depositAmount: number,
): EditableItem[] {
  const selectedById = new Map<number, number>();
  const selectedByTitle = new Map<string, number>();
  (selectedDrinks ?? []).forEach((drink) => {
    const quantity = parseInt(String(drink.quantity)) || 0;
    const id = Number(drink.id);
    if (Number.isFinite(id) && id > 0) {
      selectedById.set(id, quantity);
    }
    if (drink.title) {
      selectedByTitle.set(String(drink.title), quantity);
    }
  });

  return drinkCatalog.map((drink) => {
    const id = Number(drink.id);
    const title = String(drink.title);
    const description =
      drink.description != null && String(drink.description).trim() !== ""
        ? String(drink.description)
        : undefined;
    const availableRaw =
      drink.available_quantity ?? drink.available_drinks ?? drink.quantity;
    const maxQuantity = Number(availableRaw);
    const parsedMax =
      Number.isFinite(maxQuantity) && maxQuantity >= 0 ? maxQuantity : undefined;

    return {
      id,
      title,
      description,
      price: parseFloat(String(drink.price)) || 0,
      quantity:
        selectedById.get(id) ?? selectedByTitle.get(title) ?? 0,
      maxQuantity: parsedMax,
      type: "drink" as const,
      depositAmount,
    };
  });
}

function derivePeopleCountFromApiDate(
  dateData: Record<string, unknown>,
  tables: EditableItem[],
): number {
  const fromApi = Number(dateData.people_quantity);
  if (Number.isFinite(fromApi) && fromApi >= 1) {
    return Math.min(500, Math.floor(fromApi));
  }

  let total = 0;
  for (const table of tables) {
    if (table.quantity <= 0) continue;
    if (table.allocation?.length) {
      total += table.allocation.reduce((sum, guests) => sum + guests, 0);
    } else {
      total += (table.minPersons || 1) * table.quantity;
    }
  }

  return total > 0 ? Math.min(500, total) : 20;
}

/** Map one API date bucket (flat or per-room) into Zustand editable state. */
function mapApiDateBucketToEditableDate(
  dateData: Record<string, unknown>,
  drinkCatalog: Array<Record<string, unknown>>,
): EditableDateData {
  const paymentConfig = (dateData.payment as Record<string, unknown>) || {};
  const depositAmount = Number(paymentConfig.deposit_amount || 0);
  const balanceDueDate = paymentConfig.balance_due_date
    ? String(paymentConfig.balance_due_date)
    : null;
  const isDepositEnabled = Boolean(paymentConfig.is_deposit_enabled ?? false);
  const depositType =
    (paymentConfig.deposit_type as "amount" | "percentage") || "amount";
  const depositValue = Number(paymentConfig.deposit_value || 0);

  const tables = mapApiTablesToEditable(
    dateData.tables as Array<Record<string, unknown>> | undefined,
    depositAmount,
  );
  const tickets = mapApiTicketsToEditable(
    dateData.tickets as Array<Record<string, unknown>> | undefined,
    depositAmount,
  );
  const drinks = mapApiDrinksToEditable(
    drinkCatalog,
    dateData.selected_drinks as Array<Record<string, unknown>> | undefined,
    depositAmount,
  );

  return {
    tables,
    tickets,
    drinks,
    hasChanges: false,
    peopleCount: derivePeopleCountFromApiDate(dateData, tables),
    specialRequest: String(dateData.special_request ?? "").trim(),
    confirmedTableIds: tables
      .filter(
        (table) => table.quantity > 0 && (table.allocation?.length ?? 0) > 0,
      )
      .map((table) => table.id),
    tableSeatingSkipped:
      !tables.some((table) => table.quantity > 0) && tickets.length > 0,
    paymentType: "full",
    depositAmount,
    balanceDueDate,
    isDepositEnabled,
    depositType,
    depositValue,
  };
}

function itemsSnapshotEqual(a: EditableItem[], b: EditableItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].quantity !== b[i].quantity) return false;
    const allocA = a[i].allocation ?? [];
    const allocB = b[i].allocation ?? [];
    if (allocA.length !== allocB.length) return false;
    for (let j = 0; j < allocA.length; j++) {
      if (allocA[j] !== allocB[j]) return false;
    }
  }
  return true;
}

/**
 * Merge API catalog fields (price, capacity) while keeping user selections
 * (quantity, allocation) from the local edit session.
 */
function mergeEditableItemsFromApi(
  existing: EditableItem[],
  mapped: EditableItem[],
): EditableItem[] {
  const existingById = new Map(existing.map((item) => [item.id, item]));

  const merged = mapped.map((item) => {
    const prev = existingById.get(item.id);
    if (!prev) return item;
    return {
      ...item,
      quantity: clampItemQuantity(prev.quantity, item.maxQuantity),
      allocation: prev.allocation ?? item.allocation,
    };
  });

  for (const item of existing) {
    if (!mapped.some((mappedItem) => mappedItem.id === item.id)) {
      merged.push(item);
    }
  }

  return merged;
}

function editableDatesEqual(
  a: EditableDateData,
  b: EditableDateData,
): boolean {
  return (
    a.peopleCount === b.peopleCount &&
    a.specialRequest === b.specialRequest &&
    a.paymentType === b.paymentType &&
    a.depositAmount === b.depositAmount &&
    a.balanceDueDate === b.balanceDueDate &&
    a.isDepositEnabled === b.isDepositEnabled &&
    a.depositType === b.depositType &&
    a.depositValue === b.depositValue &&
    a.tableSeatingSkipped === b.tableSeatingSkipped &&
    itemsSnapshotEqual(a.tables, b.tables) &&
    itemsSnapshotEqual(a.tickets, b.tickets) &&
    itemsSnapshotEqual(a.drinks, b.drinks)
  );
}

/** Merge API snapshot into saved local state — quantities stay client-authoritative. */
function mergeReconciledSavedDate(
  existing: EditableDateData,
  mapped: EditableDateData,
): EditableDateData {
  return {
    ...mapped,
    tables: mergeEditableItemsFromApi(existing.tables, mapped.tables),
    tickets: mergeEditableItemsFromApi(existing.tickets, mapped.tickets),
    drinks: mergeEditableItemsFromApi(existing.drinks, mapped.drinks),
    peopleCount: existing.peopleCount,
    specialRequest: existing.specialRequest,
    paymentType: existing.paymentType,
    confirmedTableIds:
      (existing.confirmedTableIds?.length ?? 0) > 0
        ? existing.confirmedTableIds
        : mapped.confirmedTableIds,
    tableSeatingSkipped:
      existing.tableSeatingSkipped ?? mapped.tableSeatingSkipped,
    hasChanges: false,
  };
}

function allocationsEqual(a?: number[], b?: number[]): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function tablesAlreadyMatchSelection(
  tables: EditableItem[],
  selection: ResolvedTableSelection | null,
): boolean {
  if (!selection) {
    return tables.every(
      (table) =>
        table.quantity === 0 && allocationsEqual(table.allocation, []),
    );
  }

  const selectionById = new Map(
    selection.items.map((item) => [item.tableId, item]),
  );

  return tables.every((table) => {
    const item = selectionById.get(table.id);
    if (item) {
      return (
        table.quantity === item.quantity &&
        allocationsEqual(table.allocation, item.allocation)
      );
    }
    return (
      table.quantity === 0 && allocationsEqual(table.allocation, [])
    );
  });
}

function forEachApiDateBucket(
  apiData: Record<string, unknown>,
  visit: (params: {
    storeKey: string;
    dateData: Record<string, unknown>;
    drinkCatalog: Array<Record<string, unknown>>;
  }) => void,
): void {
  if (isRoomBasedApiRecord(apiData)) {
    const rooms = apiData.rooms as Array<Record<string, unknown>>;
    for (const room of rooms) {
      const roomId = Number(room.room_id);
      const roomDrinks =
        (room.drinks as Array<Record<string, unknown>>) || [];
      const dates =
        (room.dates as Record<string, Record<string, unknown>>) || {};

      for (const [dateKey, dateData] of Object.entries(dates)) {
        if (!dateData) continue;
        visit({
          storeKey: buildRoomDateKey(roomId, dateKey),
          dateData,
          drinkCatalog: roomDrinks,
        });
      }
    }
    return;
  }

  const globalDrinks =
    (apiData.drinks as Array<Record<string, unknown>>) || [];

  for (const dateKey of getApiCartDateKeys(apiData as ApiEventCartData)) {
    const dateData = apiData[dateKey] as Record<string, unknown> | undefined;
    if (!dateData) continue;
    visit({ storeKey: dateKey, dateData, drinkCatalog: globalDrinks });
  }
}

// Types for editing state
export interface EditableItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number; // User-selected quantity
  maxQuantity?: number; // Available capacity
  type: "table" | "ticket" | "drink";
  // NEW: Payment-related fields
  depositAmount?: number; // Calculated deposit per person/item
  // NEW: Guest allocation fields
  allocation?: number[]; // Guest distribution per table [12, 15, 10]
  minPersons?: number; // Minimum capacity per table
  maxPersons?: number; // Maximum capacity per table
  tableSize?: number; // Maximum table size for API
  pricePerPerson?: number; // Price per person for API
}

export interface EditableDateData {
  tables: EditableItem[];
  tickets: EditableItem[];
  drinks: EditableItem[];
  hasChanges: boolean; // Track if this date has unsaved changes
  peopleCount?: number; // Number of people for table recommendations
  specialRequest?: string; // Special requests for support team
  /** Table type IDs with seating confirmed via "Confirm Seating". */
  confirmedTableIds?: number[];
  /** Customer opted out of table seating (tickets-only booking). */
  tableSeatingSkipped?: boolean;

  // NEW: Payment selection per date
  paymentType: "full" | "deposit";
  depositAmount: number; // From API payment.deposit_amount (LEGACY - kept for compatibility)
  balanceDueDate: string | null; // From API payment.balance_due_date
  // NEW: Dynamic deposit configuration
  isDepositEnabled: boolean; // From API payment.is_deposit_enabled
  depositType: "amount" | "percentage"; // From API payment.deposit_type
  depositValue: number; // From API payment.deposit_value
}

export interface CartEditState {
  // Current editing data per event and date
  editingData: Record<string, Record<string, EditableDateData>>; // [eventSlug][date]

  // Actions
  initializeFromAPI: (
    eventSlug: string,
    apiData: Record<string, unknown>
  ) => void;
  syncNewDatesFromAPI: (
    eventSlug: string,
    apiData: Record<string, unknown>
  ) => void;
  reconcileSavedDatesFromAPI: (
    eventSlug: string,
    apiData: Record<string, unknown>
  ) => void;
  updateQuantity: (
    eventSlug: string,
    date: string,
    itemType: "table" | "ticket" | "drink",
    itemId: number,
    quantity: number
  ) => void;
  addItem: (
    eventSlug: string,
    date: string,
    itemType: "table" | "ticket" | "drink",
    item: EditableItem
  ) => void;
  removeItem: (
    eventSlug: string,
    date: string,
    itemType: "table" | "ticket" | "drink",
    itemId: number
  ) => void;
  markDateAsSaved: (eventSlug: string, date: string) => void;
  hasUnsavedChanges: (eventSlug: string, date: string) => boolean;
  getDateData: (eventSlug: string, date: string) => EditableDateData | null;
  clearEditingData: (eventSlug: string) => void;
  updatePeopleCount: (
    eventSlug: string,
    date: string,
    peopleCount: number
  ) => void;
  updateSpecialRequest: (
    eventSlug: string,
    date: string,
    specialRequest: string
  ) => void;

  // Validation functions
  validateDateRequirements: (
    eventSlug: string,
    date: string
  ) => {
    isValid: boolean;
    hasTableOrTicket: boolean;
    errorMessage?: string;
  };
  hasValidItemSelection: (eventSlug: string, date: string) => boolean;

  // Cart conflict detection
  hasExistingCart: () => boolean;
  getCurrentCartEventSlug: () => string | null;
  getCurrentCartEventInfo: () => {
    slug: string;
    name: string;
    dateCount: number;
  } | null;
  wouldCreateConflict: (newEventSlug: string) => boolean;
  clearAllCarts: () => void;

  // Debug and utility functions
  debugUnsavedState: (eventSlug: string) => void;
  forceMarkAllSaved: (eventSlug: string) => void;
  getNewDatesFromAPI: (
    eventSlug: string,
    apiData: Record<string, unknown>
  ) => string[];

  // Utility getters
  getTotalQuantity: (
    eventSlug: string,
    date: string,
    itemType: "table" | "ticket" | "drink",
    itemId: number
  ) => number;
  getItemsForAPI: (
    eventSlug: string,
    date: string,
    roomId?: number,
  ) => {
    slug: string;
    event_date: string;
    room_id?: number;
    tables: Array<{
      id: number;
      table_size: number;
      price_per_person: number;
      no_tables: number;
      allocation?: number[];
    }>;
    tickets: Array<{
      id: number;
      title: string;
      description: string;
      price_per_ticket: number;
      quantity: number;
    }>;
    drink_package: Array<{
      id: number;
      title: string;
      price: number;
      quantity: number;
    }>;
    people_quantity?: number;
    special_request?: string;
  };

  /** Auto-select best table match and distribute guests (no manual picker). */
  applyBestTableMatch: (eventSlug: string, date: string) => void;

  // NEW: Guest allocation methods
  updateTableAllocation: (
    eventSlug: string,
    date: string,
    tableId: number,
    allocation: number[]
  ) => void;
  confirmTableSeating: (
    eventSlug: string,
    date: string,
    tableId: number,
    allocation: number[],
  ) => void;
  hasPendingTableConfirmation: (eventSlug: string, date: string) => boolean;
  skipTableSeating: (eventSlug: string, date: string) => void;
  resumeTableSeating: (eventSlug: string, date: string) => void;
  validateGuestAllocation: (
    eventSlug: string,
    date: string
  ) => {
    isValid: boolean;
    totalAllocated: number;
    totalRequired: number;
    errors: string[];
  };
  getSelectedTablesWithAllocation: (
    eventSlug: string,
    date: string
  ) => Array<EditableItem & { allocation: number[] }>;

  // Delete actions with API sync
  removeDate: (eventSlug: string, date: string) => void;
  removeAllDates: (eventSlug: string) => void;

  // Cart synchronization methods
  setFromApi: (eventSlug: string, apiData: Record<string, unknown>) => void;
  getCurrentEventSlug: () => string | null;
  syncWithServer: (eventSlug: string) => Promise<boolean>;

  // NEW: Payment management methods
  updatePaymentType: (
    eventSlug: string,
    date: string,
    paymentType: "full" | "deposit"
  ) => void;
  getPaymentAmounts: (
    eventSlug: string,
    date: string
  ) => { todayAmount: number; laterAmount: number };
  getTotalPaymentBreakdown: (eventSlug: string) => {
    totalToday: number;
    totalLater: number;
    depositDates: string[];
    fullPaymentDates: string[];
  };
}

export const useCartEditStore = create<CartEditState>()(
  persist(
    (set, get) => ({
      editingData: {},

      initializeFromAPI: (
        eventSlug: string,
        apiData: Record<string, unknown>
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (!newEditingData[eventSlug]) {
            newEditingData[eventSlug] = {};
          }

          forEachApiDateBucket(apiData, ({ storeKey, dateData, drinkCatalog }) => {
            const existing = newEditingData[eventSlug][storeKey];
            const mapped = mapApiDateBucketToEditableDate(dateData, drinkCatalog);

            if (!existing) {
              newEditingData[eventSlug][storeKey] = mapped;
              return;
            }

            if (existing.hasChanges) return;

            newEditingData[eventSlug][storeKey] = mergeReconciledSavedDate(
              existing,
              mapped,
            );
          });

          return { editingData: newEditingData };
        });
      },

      syncNewDatesFromAPI: (
        eventSlug: string,
        apiData: Record<string, unknown>
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (!newEditingData[eventSlug]) {
            // If no data exists for this event, initialize it
            newEditingData[eventSlug] = {};
          }

          // Get existing dates in the store
          const existingDates = Object.keys(newEditingData[eventSlug]);

          const apiDates = getApiCartDateKeys(apiData as ApiEventCartData);
          const newDates = apiDates.filter(
            (date) => !existingDates.includes(date),
          );

          if (newDates.length === 0) {
            return { editingData: newEditingData };
          }

          const newDateSet = new Set(newDates);

          forEachApiDateBucket(apiData, ({ storeKey, dateData, drinkCatalog }) => {
            if (!newDateSet.has(storeKey)) return;
            newEditingData[eventSlug][storeKey] =
              mapApiDateBucketToEditableDate(dateData, drinkCatalog);
          });

          return { editingData: newEditingData };
        });
      },

      reconcileSavedDatesFromAPI: (
        eventSlug: string,
        apiData: Record<string, unknown>,
      ) => {
        set((state) => {
          const eventDates = state.editingData[eventSlug];
          if (!eventDates) return state;

          const newEditingData = { ...state.editingData };
          let didUpdate = false;

          forEachApiDateBucket(apiData, ({ storeKey, dateData, drinkCatalog }) => {
            const existing = newEditingData[eventSlug][storeKey];
            if (!existing) return;

            const mapped = mapApiDateBucketToEditableDate(
              dateData,
              drinkCatalog,
            );

            // Unsaved local edits are authoritative — never merge API data mid-edit.
            if (existing.hasChanges) {
              return;
            }

            if (!editableDatesEqual(existing, mapped)) {
              newEditingData[eventSlug][storeKey] = mergeReconciledSavedDate(
                existing,
                mapped,
              );
              didUpdate = true;
            }
          });

          if (!didUpdate) return state;

          return { editingData: newEditingData };
        });
      },

      updateQuantity: (
        eventSlug: string,
        date: string,
        itemType: "table" | "ticket" | "drink",
        itemId: number,
        quantity: number
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            const dateData = { ...newEditingData[eventSlug][date] };
            const items = [
              ...dateData[
              itemType === "drink"
                ? "drinks"
                : (`${itemType}s` as "tables" | "tickets")
              ],
            ];

            const itemIndex = items.findIndex(
              (item: EditableItem) => item.id === itemId
            );
            if (itemIndex >= 0) {
              const item = items[itemIndex];
              const cappedQuantity = clampItemQuantity(
                quantity,
                item.maxQuantity,
              );
              const updatedItem = {
                ...items[itemIndex],
                quantity: cappedQuantity,
              };

              // Auto-handle guest allocation for tables
              if (itemType === "table") {
                if (quantity === 0) {
                  // Clear allocation when table is removed
                  updatedItem.allocation = [];
                  console.log(
                    `🔄 Cleared allocation for removed table ${itemId}`
                  );
                } else if (quantity > 0) {
                  // Calculate total tables after this update
                  const otherTables = dateData.tables.filter(
                    (t) => t.id !== itemId
                  );
                  const totalTablesAfterUpdate =
                    otherTables.reduce((sum, t) => sum + t.quantity, 0) +
                    quantity;

                  // For single table selection, auto-allocate people count
                  if (
                    totalTablesAfterUpdate === 1 &&
                    dateData.peopleCount &&
                    dateData.peopleCount > 0
                  ) {
                    // Validate and clamp people count to reasonable limits
                    const validatedPeopleCount = Math.min(
                      Math.max(1, Math.floor(dateData.peopleCount)),
                      500
                    );
                    updatedItem.allocation = [validatedPeopleCount];
                    console.log(
                      `🔄 Auto-allocated ${validatedPeopleCount} people to single table ${itemId}`
                    );

                    if (dateData.peopleCount !== validatedPeopleCount) {
                      console.warn(
                        `🚨 People count ${dateData.peopleCount} was clamped to ${validatedPeopleCount} (max: 500)`
                      );
                    }
                  } else if (
                    totalTablesAfterUpdate === 1 &&
                    (!dateData.peopleCount || dateData.peopleCount === 0)
                  ) {
                    // If no people count set, use minimum table capacity
                    updatedItem.allocation = [updatedItem.minPersons || 1];
                    console.log(
                      `🔄 Auto-allocated ${updatedItem.minPersons || 1
                      } people (min capacity) to single table ${itemId}`
                    );
                  } else if (totalTablesAfterUpdate > 1) {
                    // Keep allocation array in sync with quantity when multiple tables are selected.
                    // Preserve existing values and fill new slots with minimum allowed guests.
                    const existingAllocation = Array.isArray(updatedItem.allocation)
                      ? updatedItem.allocation
                      : [];
                    const minGuestsPerTable = updatedItem.minPersons || 1;
                    const normalizedAllocation = Array.from(
                      { length: quantity },
                      (_, index) => existingAllocation[index] ?? minGuestsPerTable
                    );
                    updatedItem.allocation = normalizedAllocation;
                    console.log(
                      `🔄 Multiple tables (${totalTablesAfterUpdate}) - manual allocation required`
                    );
                  }
                }
              }

              items[itemIndex] = updatedItem;

              if (itemType === "table")
                dateData.tables = items as EditableItem[];
              else if (itemType === "ticket")
                dateData.tickets = items as EditableItem[];
              else dateData.drinks = items as EditableItem[];

              // Auto-adjust payment type based on selected items
              const hasTables = dateData.tables.some((t) => t.quantity > 0);
              if (!hasTables && dateData.paymentType === "deposit") {
                dateData.paymentType = "full";
              }

              if (itemType === "table") {
                dateData.confirmedTableIds = [];
                if (quantity > 0) {
                  dateData.tableSeatingSkipped = false;
                }
              }
              dateData.hasChanges = true;
              newEditingData[eventSlug][date] = dateData;
            }
          }

          return { editingData: newEditingData };
        });
      },

      addItem: (
        eventSlug: string,
        date: string,
        itemType: "table" | "ticket" | "drink",
        item: EditableItem
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            const dateData = { ...newEditingData[eventSlug][date] };

            if (itemType === "table") {
              const existingIndex = dateData.tables.findIndex(
                (t) => t.id === item.id
              );
              if (existingIndex >= 0) {
                dateData.tables[existingIndex].quantity += 1;
              } else {
                dateData.tables.push({ ...item, quantity: 1 });
              }
            } else if (itemType === "ticket") {
              const existingIndex = dateData.tickets.findIndex(
                (t) => t.id === item.id
              );
              if (existingIndex >= 0) {
                dateData.tickets[existingIndex].quantity += 1;
              } else {
                dateData.tickets.push({ ...item, quantity: 1 });
              }
            }

            dateData.hasChanges = true;
            newEditingData[eventSlug][date] = dateData;
          }

          return { editingData: newEditingData };
        });
      },

      removeItem: (
        eventSlug: string,
        date: string,
        itemType: "table" | "ticket" | "drink",
        itemId: number
      ) => {
        get().updateQuantity(eventSlug, date, itemType, itemId, 0);
      },

      markDateAsSaved: (eventSlug: string, date: string) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            newEditingData[eventSlug][date] = {
              ...newEditingData[eventSlug][date],
              hasChanges: false,
            };
          }

          return { editingData: newEditingData };
        });
      },

      hasUnsavedChanges: (eventSlug: string, date: string) => {
        return get().editingData[eventSlug]?.[date]?.hasChanges || false;
      },

      getDateData: (eventSlug: string, date: string) => {
        return get().editingData[eventSlug]?.[date] || null;
      },

      clearEditingData: (eventSlug: string) => {
        set((state) => {
          const newEditingData = { ...state.editingData };
          delete newEditingData[eventSlug];
          return { editingData: newEditingData };
        });
      },

      updatePeopleCount: (
        eventSlug: string,
        date: string,
        peopleCount: number
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            const currentDateData = newEditingData[eventSlug][date];
            const currentPeopleCount = currentDateData.peopleCount || 0;

            // Validate people count - must be between 1 and 500
            const validatedPeopleCount = Math.min(
              Math.max(1, Math.floor(peopleCount)),
              500
            );

            if (peopleCount !== validatedPeopleCount) {
              console.warn(
                `🚨 People count ${peopleCount} is invalid. Clamped to ${validatedPeopleCount} (min: 1, max: 500)`
              );
            }

            // Skip when nothing changed — avoids hasChanges + autosave on blur-without-edit
            if (validatedPeopleCount === currentPeopleCount) {
              return state;
            }

            newEditingData[eventSlug][date] = {
              ...currentDateData,
              peopleCount: validatedPeopleCount,
              confirmedTableIds: [],
              hasChanges: true,
            };
          }

          return { editingData: newEditingData };
        });

        if (!get().getDateData(eventSlug, date)?.tableSeatingSkipped) {
          get().applyBestTableMatch(eventSlug, date);
        }
      },

      updateSpecialRequest: (
        eventSlug: string,
        date: string,
        specialRequest: string
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            newEditingData[eventSlug][date] = {
              ...newEditingData[eventSlug][date],
              specialRequest,
              // Do not set hasChanges — special requests are sent only on Pay now
              // via the checkout payload, not via cart auto-save while typing.
            };
          }

          return { editingData: newEditingData };
        });
      },

      // Validation functions
      validateDateRequirements: (eventSlug: string, date: string) => {
        const dateData = get().getDateData(eventSlug, date);

        if (!dateData) {
          return {
            isValid: true, // No data means no validation needed
            hasTableOrTicket: false,
          };
        }

        // Check if user has any items at all for this date
        const hasAnyItems =
          getBillableTables(dateData).length > 0 ||
          dateData.tickets.some((t) => t.quantity > 0) ||
          dateData.drinks.some((d) => d.quantity > 0);

        // If no items at all, validation passes (empty cart is okay)
        if (!hasAnyItems) {
          return {
            isValid: true,
            hasTableOrTicket: false,
          };
        }

        // If user has items, they must have at least one table OR ticket
        const hasTable = getBillableTables(dateData).length > 0;
        const hasTicket = dateData.tickets.some((t) => t.quantity > 0);
        const hasTableOrTicket = hasTable || hasTicket;

        if (!hasTableOrTicket) {
          return {
            isValid: false,
            hasTableOrTicket: false,
            errorMessage:
              "Please select at least one table or ticket for this date",
          };
        }

        // Validate table capacity if tables are selected and not skipped
        const selectedTables = dateData.tables.filter((t) => t.quantity > 0);
        if (
          !dateData.tableSeatingSkipped &&
          selectedTables.length > 0 &&
          dateData.peopleCount
        ) {
          let totalMinCapacity = 0;
          let totalMaxCapacity = 0;

          selectedTables.forEach((table) => {
            const minPersons = table.minPersons || 1;
            const maxPersons = table.maxPersons || 999;
            totalMinCapacity += minPersons * table.quantity;
            totalMaxCapacity += maxPersons * table.quantity;
          });

          // Check if selected tables can accommodate the group
          if (dateData.peopleCount > totalMaxCapacity) {
            return {
              isValid: false,
              hasTableOrTicket: true,
              errorMessage: `Insufficient table capacity! You have ${dateData.peopleCount} guests but selected tables can only accommodate ${totalMaxCapacity} guests maximum. Please add more tables.`,
            };
          }

          // Check if group size is too small for selected tables
          if (dateData.peopleCount < totalMinCapacity) {
            return {
              isValid: false,
              hasTableOrTicket: true,
              errorMessage: `Selected tables require at least ${totalMinCapacity} guests, but you have ${dateData.peopleCount} guests. Please select smaller tables or reduce table quantity.`,
            };
          }
        }

        if (hasUnconfirmedTableSeating(dateData)) {
          return {
            isValid: false,
            hasTableOrTicket: true,
            errorMessage:
              "Please confirm table seating, or remove it to continue with tickets only",
          };
        }

        return {
          isValid: true,
          hasTableOrTicket: true,
        };
      },

      hasValidItemSelection: (eventSlug: string, date: string) => {
        return get().validateDateRequirements(eventSlug, date).isValid;
      },

      // Cart conflict detection functions
      hasExistingCart: () => {
        const state = get();
        return Object.keys(state.editingData).length > 0;
      },

      getCurrentCartEventSlug: () => {
        const state = get();
        const eventSlugs = Object.keys(state.editingData);

        // Find the event with cart data (even if quantities are 0)
        // The presence of the event structure indicates cart existence
        for (const eventSlug of eventSlugs) {
          const eventData = state.editingData[eventSlug];
          const hasDates = Object.keys(eventData).length > 0;

          if (hasDates) {
            return eventSlug;
          }
        }

        return null;
      },

      // Get current cart event info with metadata
      getCurrentCartEventInfo: () => {
        const state = get();
        const currentEventSlug = get().getCurrentCartEventSlug();

        if (!currentEventSlug || !state.editingData[currentEventSlug]) {
          return null;
        }

        const eventData = state.editingData[currentEventSlug];
        const dateCount = Object.keys(eventData).length;

        return {
          slug: currentEventSlug,
          name: currentEventSlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          dateCount,
        };
      },

      // Check if adding to a different event would create conflict
      wouldCreateConflict: (newEventSlug: string) => {
        const currentEventSlug = get().getCurrentCartEventSlug();
        if (!currentEventSlug) return false;

        // Normalize both slugs for comparison (handle URL encoding)
        const normalizedCurrentSlug = decodeURIComponent(currentEventSlug);
        const normalizedNewSlug = decodeURIComponent(newEventSlug);

        return normalizedCurrentSlug !== normalizedNewSlug;
      },

      clearAllCarts: () => {
        set({ editingData: {} });
        // Explicitly remove the persisted key so a page reload (e.g. after
        // payment) never rehydrates stale cart data ahead of the Zustand write.
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(CART_EDIT_STORAGE_KEY);
          } catch {
            // private browsing / storage quota — safe to ignore
          }
        }
      },

      debugUnsavedState: (eventSlug: string) => {
        const state = get();
        const eventData = state.editingData[eventSlug];

        if (!eventData) {
          return;
        }

        Object.keys(eventData).forEach((date) => {
          const dateData = eventData[date];
          // Debug: Check if date has items
          const hasItems =
            dateData.tables.some((t) => t.quantity > 0) ||
            dateData.tickets.some((t) => t.quantity > 0) ||
            dateData.drinks.some((d) => d.quantity > 0);
          console.log(`Date ${date} has items:`, hasItems);
        });
      },

      forceMarkAllSaved: (eventSlug: string) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]) {
            Object.keys(newEditingData[eventSlug]).forEach((date) => {
              newEditingData[eventSlug][date] = {
                ...newEditingData[eventSlug][date],
                hasChanges: false,
              };
            });
          }

          return { editingData: newEditingData };
        });
      },

      getNewDatesFromAPI: (
        eventSlug: string,
        apiData: Record<string, unknown>
      ) => {
        const state = get();
        const existingDates = Object.keys(state.editingData[eventSlug] || {});

        const apiDates = getApiCartDateKeys(apiData as ApiEventCartData);
        return apiDates.filter((date) => !existingDates.includes(date));
      },

      getTotalQuantity: (
        eventSlug: string,
        date: string,
        itemType: "table" | "ticket" | "drink",
        itemId: number
      ) => {
        const dateData = get().getDateData(eventSlug, date);
        if (!dateData) return 0;

        const items =
          itemType === "drink"
            ? dateData.drinks
            : itemType === "table"
              ? dateData.tables
              : dateData.tickets;

        const item = items.find((item) => item.id === itemId);
        return item?.quantity || 0;
      },

      getItemsForAPI: (eventSlug: string, date: string, explicitRoomId?: number) => {
        const dateData = get().getDateData(eventSlug, date);

        const parsed = parseRoomDateKey(date);
        const actualDate = parsed.date;
        const resolvedRoomId =
          parsed.roomId != null && parsed.roomId > 0
            ? parsed.roomId
            : explicitRoomId != null && explicitRoomId > 0
              ? explicitRoomId
              : undefined;

        if (!dateData)
          return {
            slug: eventSlug,
            event_date: actualDate,
            ...(resolvedRoomId != null ? { room_id: resolvedRoomId } : {}),
            tables: [],
            tickets: [],
            drink_package: [],
            people_quantity: undefined,
            special_request: undefined,
          };

        return {
          slug: eventSlug,
          event_date: actualDate,
          ...(resolvedRoomId != null ? { room_id: resolvedRoomId } : {}),
          tables: getBillableTables(dateData)
            .map((table) => ({
              id: table.id,
              table_size: table.tableSize || table.maxPersons || 20,
              price_per_person:
                table.pricePerPerson || table.price / (table.maxPersons || 20),
              no_tables: table.quantity,
              allocation:
                table.allocation && table.allocation.length > 0
                  ? table.allocation
                  : undefined,
            })),

          tickets: dateData.tickets
            .filter((ticket) => ticket.quantity > 0)
            .map((ticket) => ({
              id: ticket.id,
              title: ticket.title,
              description: ticket.description || "",
              price_per_ticket: ticket.price,
              quantity: ticket.quantity,
            })),

          drink_package: dateData.drinks
            .filter((drink) => drink.quantity > 0)
            .map((drink) => ({
              id: drink.id,
              title: drink.title,
              price: drink.price,
              quantity: drink.quantity,
            })),

          people_quantity: dateData.peopleCount,
          special_request: dateData.specialRequest || "",
        };
      },

      // Delete actions with Zustand sync
      removeDate: (eventSlug: string, date: string) => {
        set((state) => {
          const newEditingData = { ...state.editingData };
          if (newEditingData[eventSlug]) {
            delete newEditingData[eventSlug][date];

            // If no dates left for this event, remove the event entirely
            if (Object.keys(newEditingData[eventSlug]).length === 0) {
              delete newEditingData[eventSlug];
            }
          }
          return { editingData: newEditingData };
        });
      },

      removeAllDates: (eventSlug: string) => {
        set((state) => {
          const newEditingData = { ...state.editingData };
          delete newEditingData[eventSlug];
          return { editingData: newEditingData };
        });
      },

      // NEW: Payment management methods
      updatePaymentType: (
        eventSlug: string,
        date: string,
        paymentType: "full" | "deposit"
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            const dateData = newEditingData[eventSlug][date];

            // If no tables are selected, force payment type to "full"
            const hasTables = dateData.tables.some((t) => t.quantity > 0);
            const finalPaymentType = hasTables ? paymentType : "full";

            newEditingData[eventSlug][date] = {
              ...dateData,
              paymentType: finalPaymentType,
              // Checkout preference only — not sent on cart POST; avoid autosave.
            };
          }

          return { editingData: newEditingData };
        });
      },

      getPaymentAmounts: (eventSlug: string, date: string) => {
        const dateData = get().getDateData(eventSlug, date);
        if (!dateData) return { todayAmount: 0, laterAmount: 0 };

        return calculatePaymentAmounts(dateData, dateData.paymentType);
      },

      getTotalPaymentBreakdown: (eventSlug: string) => {
        const eventData = get().editingData[eventSlug];
        if (!eventData)
          return {
            totalToday: 0,
            totalLater: 0,
            depositDates: [],
            fullPaymentDates: [],
          };

        let totalToday = 0;
        let totalLater = 0;
        const depositDates: string[] = [];
        const fullPaymentDates: string[] = [];

        Object.entries(eventData).forEach(([date, dateData]) => {
          const amounts = get().getPaymentAmounts(eventSlug, date);
          totalToday += amounts.todayAmount;
          totalLater += amounts.laterAmount;

          if (dateData.paymentType === "deposit") {
            depositDates.push(date);
          } else {
            fullPaymentDates.push(date);
          }
        });

        return { totalToday, totalLater, depositDates, fullPaymentDates };
      },

      applyBestTableMatch: (eventSlug: string, date: string) => {
        set((state) => {
          const dateData = state.editingData[eventSlug]?.[date];
          if (!dateData?.tables?.length || dateData.tableSeatingSkipped) {
            return state;
          }

          const peopleCount = dateData.peopleCount || 20;
          const selection = resolveBestTableSelection(
            dateData.tables,
            peopleCount,
          );

          if (tablesAlreadyMatchSelection(dateData.tables, selection)) {
            return state;
          }

          if (!selection) {
            const clearedTables = dateData.tables.map((table) => ({
              ...table,
              quantity: 0,
              allocation: [],
            }));

            return {
              editingData: {
                ...state.editingData,
                [eventSlug]: {
                  ...state.editingData[eventSlug],
                  [date]: {
                    ...dateData,
                    tables: clearedTables,
                    confirmedTableIds: [],
                    // Keep seating active so UI can show "no tables for group size"
                    tableSeatingSkipped: false,
                    hasChanges: true,
                  },
                },
              },
            };
          }

          const selectionById = new Map(
            selection.items.map((item) => [item.tableId, item]),
          );

          const updatedTables = dateData.tables.map((table) => {
            const item = selectionById.get(table.id);
            if (item) {
              return {
                ...table,
                quantity: item.quantity,
                allocation: item.allocation,
              };
            }
            return { ...table, quantity: 0, allocation: [] };
          });

          return {
            editingData: {
              ...state.editingData,
              [eventSlug]: {
                ...state.editingData[eventSlug],
                [date]: {
                  ...dateData,
                  tables: updatedTables,
                  confirmedTableIds: [],
                  tableSeatingSkipped: false,
                  hasChanges: true,
                },
              },
            },
          };
        });
      },

      // NEW: Guest allocation methods
      updateTableAllocation: (
        eventSlug: string,
        date: string,
        tableId: number,
        allocation: number[]
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (newEditingData[eventSlug]?.[date]) {
            const dateData = { ...newEditingData[eventSlug][date] };
            const tables = [...dateData.tables];

            const tableIndex = tables.findIndex(
              (table) => table.id === tableId
            );
            if (tableIndex >= 0) {
              // Validate each allocation value - max 500 people per table
              const validatedAllocation = allocation.map((count) => {
                const validatedCount = Math.min(
                  Math.max(0, Math.floor(count)),
                  500
                );
                if (count !== validatedCount) {
                  console.warn(
                    `🚨 Table allocation ${count} was clamped to ${validatedCount} (max: 500 per table)`
                  );
                }
                return validatedCount;
              });

              tables[tableIndex] = {
                ...tables[tableIndex],
                allocation: validatedAllocation,
              };

              dateData.tables = tables;
              dateData.hasChanges = true;
              newEditingData[eventSlug][date] = dateData;
            }
          }

          return { editingData: newEditingData };
        });
      },

      confirmTableSeating: (
        eventSlug: string,
        date: string,
        tableId: number,
        allocation: number[],
      ) => {
        set((state) => {
          const newEditingData = { ...state.editingData };

          if (!newEditingData[eventSlug]?.[date]) {
            return state;
          }

          const dateData = { ...newEditingData[eventSlug][date] };
          const tables = [...dateData.tables];
          const tableIndex = tables.findIndex((table) => table.id === tableId);

          if (tableIndex < 0) return state;

          const validatedAllocation = allocation.map((count) =>
            Math.min(Math.max(0, Math.floor(count)), 500),
          );

          tables[tableIndex] = {
            ...tables[tableIndex],
            allocation: validatedAllocation,
          };

          const confirmed = new Set(dateData.confirmedTableIds ?? []);
          confirmed.add(tableId);

          newEditingData[eventSlug][date] = {
            ...dateData,
            tables,
            confirmedTableIds: Array.from(confirmed),
            tableSeatingSkipped: false,
            hasChanges: true,
          };

          return { editingData: newEditingData };
        });
      },

      hasPendingTableConfirmation: (eventSlug: string, date: string) => {
        const dateData = get().getDateData(eventSlug, date);
        if (dateData?.tableSeatingSkipped) return false;
        return hasUnconfirmedTableSeating(dateData);
      },

      skipTableSeating: (eventSlug: string, date: string) => {
        set((state) => {
          const dateData = state.editingData[eventSlug]?.[date];
          if (!dateData) return state;

          const clearedTables = dateData.tables.map((table) => ({
            ...table,
            quantity: 0,
            allocation: [],
          }));

          return {
            editingData: {
              ...state.editingData,
              [eventSlug]: {
                ...state.editingData[eventSlug],
                [date]: {
                  ...dateData,
                  tables: clearedTables,
                  confirmedTableIds: [],
                  tableSeatingSkipped: true,
                  hasChanges: true,
                },
              },
            },
          };
        });
      },

      resumeTableSeating: (eventSlug: string, date: string) => {
        set((state) => {
          const dateData = state.editingData[eventSlug]?.[date];
          if (!dateData) return state;

          return {
            editingData: {
              ...state.editingData,
              [eventSlug]: {
                ...state.editingData[eventSlug],
                [date]: {
                  ...dateData,
                  tableSeatingSkipped: false,
                },
              },
            },
          };
        });
      },

      validateGuestAllocation: (eventSlug: string, date: string) => {
        const dateData = get().getDateData(eventSlug, date);
        if (!dateData) {
          return {
            isValid: true,
            totalAllocated: 0,
            totalRequired: 0,
            errors: [],
          };
        }

        const selectedTables = dateData.tables.filter(
          (table) => table.quantity > 0
        );
        const peopleCount = dateData.peopleCount || 0;
        const errors: string[] = [];

        // Calculate total tables selected
        const totalTablesSelected = selectedTables.reduce(
          (sum, table) => sum + table.quantity,
          0
        );

        // Only validate guest allocation for multiple tables
        if (totalTablesSelected <= 1) {
          return {
            isValid: true,
            totalAllocated: peopleCount,
            totalRequired: peopleCount,
            errors: [],
          };
        }

        let totalAllocated = 0;

        // Check each table's allocation (only for multiple tables)
        selectedTables.forEach((table) => {
          if (!table.allocation || table.allocation.length !== table.quantity) {
            errors.push(
              `${table.title} needs guest allocation for ${table.quantity
              } table${table.quantity > 1 ? "s" : ""}`
            );
            return;
          }

          // Validate each table's guest count
          table.allocation.forEach((guestCount, index) => {
            if (guestCount < (table.minPersons || 1)) {
              errors.push(
                `${table.title} Table ${index + 1}: minimum ${table.minPersons
                } guests required`
              );
            }
            if (guestCount > (table.maxPersons || 999)) {
              errors.push(
                `${table.title} Table ${index + 1}: maximum ${table.maxPersons
                } guests allowed`
              );
            }
            totalAllocated += guestCount;
          });
        });

        // Check total allocation
        if (selectedTables.length > 0 && totalAllocated !== peopleCount) {
          errors.push(
            `Total allocated guests (${totalAllocated}) must equal group size (${peopleCount})`
          );
        }

        return {
          isValid: errors.length === 0,
          totalAllocated,
          totalRequired: peopleCount,
          errors,
        };
      },

      getSelectedTablesWithAllocation: (eventSlug: string, date: string) => {
        const dateData = get().getDateData(eventSlug, date);
        if (!dateData) return [];

        return dateData.tables
          .filter((table) => table.quantity > 0)
          .map((table) => ({
            ...table,
            allocation:
              table.allocation ||
              Array(table.quantity).fill(table.minPersons || 1),
          }));
      },

      // Cart synchronization methods
      setFromApi: (eventSlug: string, apiData: Record<string, unknown>) => {
        console.log("🔄 Setting cart data from API for", eventSlug);
        get().initializeFromAPI(eventSlug, apiData);
      },

      getCurrentEventSlug: () => {
        const state = get();
        const eventSlugs = Object.keys(state.editingData);
        return eventSlugs.length > 0 ? eventSlugs[0] : null;
      },

      syncWithServer: async () => {
        // Note: This method is kept for future middleware integration
        // Currently, sync is handled by useCartSync hook
        console.warn(
          "syncWithServer is deprecated. Use useCartSync hook instead."
        );
        return false;
      },
    }),
    {
      name: CART_EDIT_STORAGE_KEY,
      partialize: (state) => ({ editingData: state.editingData }),
    }
  )
);
