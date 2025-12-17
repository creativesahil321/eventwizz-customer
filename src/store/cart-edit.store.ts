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
import { CART_METADATA_KEYS_SET } from "@/lib/constants/cart-meta-keys";

// Payment calculation utility
function calculatePaymentAmounts(
  dateData: EditableDateData,
  paymentType: "full" | "deposit"
): { todayAmount: number; laterAmount: number } {
  let todayAmount = 0;
  let laterAmount = 0;

  if (paymentType === "full") {
    // Pay full amount today - only include items with quantity > 0
    const activeItems = [
      ...dateData.tables.filter((table) => table.quantity > 0),
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
    // Pay deposit today, rest later - only include items with quantity > 0
    const activeItems = [
      ...dateData.tables.filter((table) => table.quantity > 0),
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
    date: string
  ) => {
    slug: string;
    event_date: string;
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
    drink_package: Array<{ id: number; title: string; price: number; quantity: number }>;
    people_quantity?: number;
    special_request?: string;
  };

  // NEW: Guest allocation methods
  updateTableAllocation: (
    eventSlug: string,
    date: string,
    tableId: number,
    allocation: number[]
  ) => void;
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

          // Process each date from API data
          Object.keys(apiData).forEach((dateKey) => {
            if (!CART_METADATA_KEYS_SET.has(dateKey)) {
              const dateData = apiData[dateKey] as Record<string, unknown>;

              // Extract payment configuration for this date
              const paymentConfig =
                (dateData.payment as Record<string, unknown>) || {};
              // Always default to "full" payment type when initializing from API
              // Users can manually change to "deposit" if they prefer
              const paymentType = "full" as "full" | "deposit";
              const depositAmount = Number(paymentConfig.deposit_amount || 0);
              const balanceDueDate = paymentConfig.balance_due_date
                ? String(paymentConfig.balance_due_date)
                : null;
              // NEW: Extract dynamic deposit configuration
              const isDepositEnabled = Boolean(
                paymentConfig.is_deposit_enabled ?? false
              );
              const depositType =
                (paymentConfig.deposit_type as "amount" | "percentage") ||
                "amount";
              const depositValue = Number(paymentConfig.deposit_value || 0);

              newEditingData[eventSlug][dateKey] = {
                tables:
                  (dateData.tables as Array<Record<string, unknown>>)?.map(
                    (table) => ({
                      id: Number(table.id),
                      title: `Table (${table.min_persons}-${table.max_persons} persons)`,
                      description: `Seating for ${table.min_persons} to ${table.max_persons} people`,
                      price: Number(table.price), // ⚠️ SECURITY: Prices stored in localStorage - validate on server
                      quantity: Number(table.no_tables || 0), // Use saved quantity from API
                      maxQuantity: Number(table.total_tables),
                      type: "table" as const,
                      depositAmount: depositAmount, // Per person deposit
                      // NEW: Guest allocation fields
                      allocation: (table.allocation as number[]) || [], // Use saved allocation from API
                      minPersons: Number(table.min_persons),
                      maxPersons: Number(table.max_persons),
                      tableSize: Number(table.max_persons), // For API
                      pricePerPerson: Number(table.price), // API already provides price per person
                    })
                  ) || [],

                tickets:
                  (dateData.tickets as Array<Record<string, unknown>>)?.map(
                    (ticket) => ({
                      id: Number(ticket.id),
                      title: String(ticket.title),
                      description: String(ticket.description),
                      price: Number(ticket.price), // ⚠️ SECURITY: Prices stored in localStorage - validate on server
                      quantity: Number(ticket.quantity || 0), // Use saved quantity from API
                      maxQuantity: Number(ticket.total_capacity),
                      type: "ticket" as const,
                      depositAmount: depositAmount, // Per person deposit
                    })
                  ) || [],

                drinks: (() => {
                  // Get global drinks list from API root (all available drinks for this event)
                  const globalDrinks =
                    (apiData.drinks as Array<Record<string, unknown>>) || [];

                  // Get selected drinks for this specific date (pre-selected quantities)
                  const selectedDrinks =
                    (dateData.selected_drinks as Array<
                      Record<string, unknown>
                    >) || [];

                  // Create a map of selected drinks for quick quantity lookup
                  const selectedQuantityMap = new Map();
                  selectedDrinks.forEach((drink) => {
                    const title = String(drink.title);
                    const quantity = parseInt(String(drink.quantity)) || 0;
                    selectedQuantityMap.set(title, quantity);
                  });

                  // Always show ALL global drinks for every date
                  // Apply quantities from selected_drinks if available, otherwise 0
                  const processedDrinks = globalDrinks.map((drink) => {
                    const title = String(drink.title);
                    const selectedQuantity =
                      selectedQuantityMap.get(title) || 0;

                    return {
                      id: Number(drink.id),
                      title: title,
                      price: parseFloat(String(drink.price)),
                      quantity: selectedQuantity, // Pre-fill from selected_drinks or default to 0
                      type: "drink" as const,
                      depositAmount: depositAmount, // Per item deposit
                    };
                  });

                  return processedDrinks;
                })(),

                hasChanges: false,
                peopleCount: 20, // Default people count
                specialRequest: "", // Default empty special request
                // NEW: Payment configuration
                paymentType: paymentType,
                depositAmount: depositAmount,
                balanceDueDate: balanceDueDate,
                // NEW: Dynamic deposit configuration
                isDepositEnabled: isDepositEnabled,
                depositType: depositType,
                depositValue: depositValue,
              };
            }
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

          // Get all dates from API data
          const apiDates = Object.keys(apiData).filter(
            (key) => !CART_METADATA_KEYS_SET.has(key)
          );

          // Find new dates that don't exist in the store
          const newDates = apiDates.filter(
            (date) => !existingDates.includes(date)
          );

          if (newDates.length === 0) {
            // No new dates to sync
            return { editingData: newEditingData };
          }

          // Process each new date from API data
          newDates.forEach((dateKey) => {
            const dateData = apiData[dateKey] as Record<string, unknown>;

            // Extract payment configuration for this date
            const paymentConfig =
              (dateData.payment as Record<string, unknown>) || {};
            // Always default to "full" payment type when syncing new dates from API
            // Users can manually change to "deposit" if they prefer
            const paymentType = "full" as "full" | "deposit";
            const depositAmount = Number(paymentConfig.deposit_amount || 0);
            const balanceDueDate = paymentConfig.balance_due_date
              ? String(paymentConfig.balance_due_date)
              : null;
            // NEW: Extract dynamic deposit configuration
            const isDepositEnabled = Boolean(
              paymentConfig.is_deposit_enabled ?? false
            );
            const depositType =
              (paymentConfig.deposit_type as "amount" | "percentage") ||
              "amount";
            const depositValue = Number(paymentConfig.deposit_value || 0);

            newEditingData[eventSlug][dateKey] = {
              tables:
                (dateData.tables as Array<Record<string, unknown>>)?.map(
                  (table) => ({
                    id: Number(table.id),
                    title: `Table (${table.min_persons}-${table.max_persons} persons)`,
                    description: `Seating for ${table.min_persons} to ${table.max_persons} people`,
                    price: Number(table.price),
                    quantity: Number(table.no_tables || 0), // Use saved quantity from API
                    maxQuantity: Number(table.total_tables),
                    type: "table" as const,
                    depositAmount: depositAmount, // Per person deposit
                    // NEW: Guest allocation fields
                    allocation: (table.allocation as number[]) || [], // Use saved allocation from API
                    minPersons: Number(table.min_persons),
                    maxPersons: Number(table.max_persons),
                    tableSize: Number(table.max_persons), // For API
                    pricePerPerson: Number(table.price), // API already provides price per person
                  })
                ) || [],

              tickets:
                (dateData.tickets as Array<Record<string, unknown>>)?.map(
                  (ticket) => ({
                    id: Number(ticket.id),
                    title: String(ticket.title),
                    description: String(ticket.description),
                    price: Number(ticket.price),
                    quantity: Number(ticket.quantity || 0), // Use saved quantity from API
                    maxQuantity: Number(ticket.total_capacity),
                    type: "ticket" as const,
                    depositAmount: depositAmount, // Per person deposit
                  })
                ) || [],

              drinks: (() => {
                // Get global drinks list from API root (all available drinks for this event)
                const globalDrinks =
                  (apiData.drinks as Array<Record<string, unknown>>) || [];

                // Get selected drinks for this specific date (pre-selected quantities)
                const selectedDrinks =
                  (dateData.selected_drinks as Array<
                    Record<string, unknown>
                  >) || [];

                // Create a map of selected drinks for quick quantity lookup
                const selectedQuantityMap = new Map();
                selectedDrinks.forEach((drink) => {
                  const title = String(drink.title);
                  const quantity = parseInt(String(drink.quantity)) || 0;
                  selectedQuantityMap.set(title, quantity);
                });

                // Always show ALL global drinks for every date
                // Apply quantities from selected_drinks if available, otherwise 0
                const processedDrinks = globalDrinks.map((drink) => {
                  const title = String(drink.title);
                  const selectedQuantity = selectedQuantityMap.get(title) || 0;

                  return {
                    id: Number(drink.id),
                    title: title,
                    price: parseFloat(String(drink.price)),
                    quantity: selectedQuantity, // Pre-fill from selected_drinks or default to 0
                    type: "drink" as const,
                    depositAmount: depositAmount, // Per item deposit
                  };
                });

                return processedDrinks;
              })(),

              hasChanges: false,
              peopleCount: 20, // Default people count
              specialRequest: "", // Default empty special request
              // NEW: Payment configuration
              paymentType: paymentType,
              depositAmount: depositAmount,
              balanceDueDate: balanceDueDate,
              // NEW: Dynamic deposit configuration
              isDepositEnabled: isDepositEnabled,
              depositType: depositType,
              depositValue: depositValue,
            };
          });

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
              const updatedItem = {
                ...items[itemIndex],
                quantity: Math.max(0, quantity),
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
                      `🔄 Auto-allocated ${
                        updatedItem.minPersons || 1
                      } people (min capacity) to single table ${itemId}`
                    );
                  } else if (totalTablesAfterUpdate > 1) {
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

            // Update people count and handle allocation
            const shouldUpdateAllocation =
              currentPeopleCount !== validatedPeopleCount;

            // Calculate total tables selected
            const totalTablesSelected = currentDateData.tables.reduce(
              (sum, table) => sum + table.quantity,
              0
            );

            let updatedTables = currentDateData.tables;

            if (
              shouldUpdateAllocation &&
              totalTablesSelected === 1 &&
              validatedPeopleCount > 0
            ) {
              // Auto-allocate people to single table
              console.log(
                `🔄 Auto-allocating ${validatedPeopleCount} people to single table (people count updated)`
              );
              updatedTables = currentDateData.tables.map((table) => {
                if (table.quantity > 0) {
                  return {
                    ...table,
                    allocation: [validatedPeopleCount], // Auto-allocate all people to the single table
                  };
                }
                return table;
              });
            } else if (
              shouldUpdateAllocation &&
              (totalTablesSelected === 0 || totalTablesSelected > 1)
            ) {
              // Clear allocation for no tables or multiple tables
              console.log(
                `🔄 Clearing allocation - ${totalTablesSelected} tables selected`
              );
              updatedTables = currentDateData.tables.map((table) => ({
                ...table,
                allocation: [],
              }));
            }

            newEditingData[eventSlug][date] = {
              ...currentDateData,
              peopleCount: validatedPeopleCount,
              hasChanges: true,
              tables: updatedTables,
            };
          }

          return { editingData: newEditingData };
        });
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
              hasChanges: true,
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
          dateData.tables.some((t) => t.quantity > 0) ||
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
        const hasTable = dateData.tables.some((t) => t.quantity > 0);
        const hasTicket = dateData.tickets.some((t) => t.quantity > 0);
        const hasTableOrTicket = hasTable || hasTicket;

        return {
          isValid: hasTableOrTicket,
          hasTableOrTicket,
          errorMessage: hasTableOrTicket
            ? undefined
            : "Please select at least one table or ticket for this date",
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

        const apiDates = Object.keys(apiData).filter(
          (key) => !CART_METADATA_KEYS_SET.has(key)
        );

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

      getItemsForAPI: (eventSlug: string, date: string) => {
        const dateData = get().getDateData(eventSlug, date);
        if (!dateData)
          return {
            slug: eventSlug,
            event_date: date,
            tables: [],
            tickets: [],
            drink_package: [],
            people_quantity: undefined,
            special_request: undefined,
          };

        return {
          slug: eventSlug,
          event_date: date,
          tables: dateData.tables
            .filter((table) => table.quantity > 0)
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
              hasChanges: true,
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
              `${table.title} needs guest allocation for ${
                table.quantity
              } table${table.quantity > 1 ? "s" : ""}`
            );
            return;
          }

          // Validate each table's guest count
          table.allocation.forEach((guestCount, index) => {
            if (guestCount < (table.minPersons || 1)) {
              errors.push(
                `${table.title} Table ${index + 1}: minimum ${
                  table.minPersons
                } guests required`
              );
            }
            if (guestCount > (table.maxPersons || 999)) {
              errors.push(
                `${table.title} Table ${index + 1}: maximum ${
                  table.maxPersons
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
      name: "cart-edit-storage",
      partialize: (state) => ({ editingData: state.editingData }),
    }
  )
);
