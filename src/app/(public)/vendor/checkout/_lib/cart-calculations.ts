/**
 * Professional cart calculation utilities
 * Following DRY principles - shared logic between CartManager and OrderSummary
 * Updated to handle partial payment system
 */

import { CART_METADATA_KEYS_SET } from "@/lib/constants/cart-meta-keys";
import { ApiEventCartData, ApiDateData } from "@/lib/types/cart.types";

/**
 * Calculate total items and amount from API cart data
 * Items = number of dates with data, Amount = sum of all prices
 * Updated to handle new API structure with selected_drinks
 */
export function calculateCartTotals(eventData: ApiEventCartData | null) {
  if (!eventData) {
    return { totalItems: 0, totalAmount: 0 };
  }

  const dateKeys = Object.keys(eventData).filter(
    (key) => !CART_METADATA_KEYS_SET.has(key)
  );

  let amount = 0;

  dateKeys.forEach((dateKey) => {
    const dateData = eventData[dateKey] as ApiDateData;

    // Calculate amount from selected drinks (new structure)
    if (dateData?.selected_drinks && Array.isArray(dateData.selected_drinks)) {
      dateData.selected_drinks.forEach((drink) => {
        const quantity = drink.quantity || 1;
        const price = parseFloat(drink.price || "0");
        amount += price * quantity;
      });
    }

    // Calculate amount from tables (per-person pricing)
    if (dateData?.tables && Array.isArray(dateData.tables)) {
      dateData.tables.forEach((table) => {
        // API already provides price per person
        const pricePerPerson = parseFloat(String(table.price || 0));
        const peopleCount = table.min_persons || 1;
        amount += pricePerPerson * peopleCount;
      });
    }

    // Calculate amount from tickets
    if (dateData?.tickets && Array.isArray(dateData.tickets)) {
      dateData.tickets.forEach((ticket) => {
        const quantity =
          (ticket as unknown as { quantity: number }).quantity || 1; // Default to 1 if no quantity specified
        amount += parseFloat(String(ticket.price || 0)) * quantity;
      });
    }
  });

  // Items = number of dates (7 dates = 7 items)
  const totalItems = dateKeys.length;

  return {
    totalItems,
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

  const dateKeys = Object.keys(eventData).filter(
    (key) => !CART_METADATA_KEYS_SET.has(key)
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
    const dateData = eventData[dateKey] as ApiDateData;
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

    // Only use API data fallback if edit store data is completely unavailable
    // If edit store data exists but is empty (nothing selected), amount should remain 0
    if (dateAmount === 0 && (!getDateData || !eventSlug)) {
      // Calculate amount from selected drinks
      if (
        dateData?.selected_drinks &&
        Array.isArray(dateData.selected_drinks)
      ) {
        dateData.selected_drinks.forEach((drink) => {
          const quantity = drink.quantity || 1;
          const price = parseFloat(drink.price || "0");
          dateAmount += price * quantity;
        });
      }

      // Calculate amount from tables (per-person pricing)
      if (dateData?.tables && Array.isArray(dateData.tables)) {
        dateData.tables.forEach((table) => {
          // API already provides price per person
          const pricePerPerson = parseFloat(String(table.price || 0));
          const peopleCount = table.min_persons || 1;
          dateAmount += pricePerPerson * peopleCount;
        });
      }

      // Calculate amount from tickets (only if they're actually selected)
      if (dateData?.tickets && Array.isArray(dateData.tickets)) {
        dateData.tickets.forEach((ticket) => {
          // Only add if this ticket is actually selected
          // For now, we'll assume if it's in the data, it's selected
          // This is a limitation - ideally we'd have selected quantities
          const quantity =
            (ticket as unknown as { quantity: number }).quantity || 1; // Default to 1 if no quantity specified
          dateAmount += parseFloat(String(ticket.price || 0)) * quantity;
        });
      }
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
  const dateKeys = Object.keys(firstEvent).filter(
    (key) => !CART_METADATA_KEYS_SET.has(key)
  );

  const firstAvailableDate = dateKeys[0] || null;

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
  date: string
): number {
  const dateData = eventData[date] as ApiDateData | undefined;

  if (!dateData) {
    return 0;
  }

  let total = 0;

  // Add drinks total
  if (dateData.drinks && Array.isArray(dateData.drinks)) {
    dateData.drinks.forEach((drink) => {
      const quantity = parseInt(String(drink.quantity || "0"), 10);
      const price = parseFloat(drink.price || "0");
      total += price * quantity;
    });
  }

  // Add tables total (per-person pricing)
  if (dateData.tables && Array.isArray(dateData.tables)) {
    dateData.tables.forEach((table) => {
      // API already provides price per person
      const pricePerPerson = parseFloat(String(table.price || 0));
      const peopleCount = table.min_persons || 1;
      total += pricePerPerson * peopleCount;
    });
  }

  // Add tickets total
  if (dateData.tickets && Array.isArray(dateData.tickets)) {
    dateData.tickets.forEach((ticket) => {
      const quantity =
        (ticket as unknown as { quantity: number }).quantity || 1; // Default to 1 if no quantity specified
      total += parseFloat(String(ticket.price || 0)) * quantity;
    });
  }

  return total;
}

/**
 * Count total number of dates with items in the cart
 */
export function countActiveDates(eventData: ApiEventCartData | null): number {
  if (!eventData) {
    return 0;
  }

  const dateKeys = Object.keys(eventData).filter(
    (key) => !CART_METADATA_KEYS_SET.has(key)
  );

  return dateKeys.filter((dateKey) => {
    const dateData = eventData[dateKey] as ApiDateData;

    // Check if this date has any items (drinks, tables, or tickets)
    const hasDrinks = dateData?.drinks && dateData.drinks.length > 0;
    const hasTables = dateData?.tables && dateData.tables.length > 0;
    const hasTickets = dateData?.tickets && dateData.tickets.length > 0;

    return hasDrinks || hasTables || hasTickets;
  }).length;
}
