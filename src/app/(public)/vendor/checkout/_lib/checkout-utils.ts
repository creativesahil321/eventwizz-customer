/**
 * Checkout Utility Functions
 *
 * Transforms cart edit store data into checkout API format
 * and provides validation and calculation utilities
 */

import {
  CheckoutRequest,
  CheckoutDateData,
} from "@/services/customer/checkout";
import { EditableDateData } from "@/store/cart-edit.store";
import {
  extractEventsFromApiResponse,
  findEventBySlug,
} from "./cart-calculations";

/**
 * Transform cart edit store data into checkout API format
 */
export function transformCartToCheckout(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiCartData: unknown,
  paymentGateway?: string
): CheckoutRequest | null {
  const eventData = editingData[eventSlug];
  if (!eventData) {
    console.error("No event data found for slug:", eventSlug);
    return null;
  }

  // Get vendor event ID from API data
  const eventsArray = extractEventsFromApiResponse(apiCartData);
  const apiEventData = findEventBySlug(eventsArray, eventSlug);

  // Extract vendor_event_id from API data
  const vendorEventId = apiEventData?.vendor_event_id;

  if (!vendorEventId) {
    console.error("No vendor_event_id found in API data for event:", eventSlug);
    console.error("Available API event data:", apiEventData);
    return null;
  }

  console.log(
    `✅ Found vendor_event_id: ${vendorEventId} for event: ${eventSlug}`
  );

  // Transform dates
  const checkoutDates: CheckoutDateData[] = [];
  let subTotal = 0;
  let partialPayment = 0;
  let totalDueToday = 0; // Total amount to pay today (deposits + full payments)
  let hasAnyDepositPayments = false;

  Object.entries(eventData).forEach(([date, dateData]) => {
    // Only include dates with items
    const hasItems =
      dateData.tables.some((t) => t.quantity > 0) ||
      dateData.tickets.some((t) => t.quantity > 0) ||
      dateData.drinks.some((d) => d.quantity > 0);

    if (!hasItems) return;

    // Transform tables
    const tables = dateData.tables
      .filter((table) => table.quantity > 0)
      .map((table) => ({
        id: table.id,
        table_size: table.tableSize || table.maxPersons || 20,
        price_per_person: table.pricePerPerson || table.price,
        no_tables: table.quantity,
        allocation:
          table.allocation && table.allocation.length > 0
            ? table.allocation
            : Array(table.quantity).fill(table.minPersons || 1),
      }));

    // Transform tickets
    const tickets = dateData.tickets
      .filter((ticket) => ticket.quantity > 0)
      .map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description || "",
        price_per_ticket: ticket.price,
        quantity: ticket.quantity,
      }));

    // Transform drinks
    const drink_package = dateData.drinks
      .filter((drink) => drink.quantity > 0)
      .map((drink) => ({
        id: drink.id,
        title: drink.title,
        price: drink.price,
        quantity: drink.quantity,
      }));

    // Calculate date totals
    let dateTotal = 0;

    // Calculate table costs
    tables.forEach((table) => {
      const totalGuests = table.allocation.reduce(
        (sum, guests) => sum + guests,
        0
      );
      // Only charge if guests are actually allocated
      if (totalGuests > 0) {
        dateTotal += table.price_per_person * totalGuests;
      }
    });

    // Calculate ticket costs
    tickets.forEach((ticket) => {
      dateTotal += ticket.price_per_ticket * ticket.quantity;
    });

    // Calculate drink costs
    drink_package.forEach((drink) => {
      dateTotal += drink.price * drink.quantity;
    });

    subTotal += dateTotal;

    // Extract payment configuration from API data for this date
    const apiDateData = apiEventData?.[date] as
      | {
          payment?: {
            type?: string;
            is_deposit_enabled?: boolean;
            deposit_type?: "amount" | "percentage";
            deposit_value?: number;
            balance_due_date?: string | null;
          };
        }
      | undefined;

    const paymentConfig = apiDateData?.payment;
    const isDepositEnabled = paymentConfig?.is_deposit_enabled ?? false;
    const depositType = paymentConfig?.deposit_type || "amount";
    const depositValue = paymentConfig?.deposit_value || 0;

    // Variable to store calculated deposit amount for this date
    let calculatedDepositAmount = 0;

    // Calculate payment amounts based on payment type
    if (dateData.paymentType === "deposit" && isDepositEnabled) {
      hasAnyDepositPayments = true;
      let depositAmount = 0;
      let ticketsAndDrinksAmount = 0;

      // Calculate table costs and deposits based on deposit type
      let tableTotalAmount = 0;
      tables.forEach((table) => {
        const totalGuests = table.allocation.reduce(
          (sum, guests) => sum + guests,
          0
        );
        if (totalGuests > 0) {
          tableTotalAmount += table.price_per_person * totalGuests;
        }
      });

      // Calculate deposit for tables based on type
      if (depositType === "percentage") {
        // Percentage: calculate % of table total
        depositAmount = (tableTotalAmount * depositValue) / 100;
        console.log(
          `💰 Deposit (${depositValue}% of £${tableTotalAmount}): £${depositAmount.toFixed(
            2
          )}`
        );
      } else {
        // Amount: multiply by guest count
        tables.forEach((table) => {
          const totalGuests = table.allocation.reduce(
            (sum, guests) => sum + guests,
            0
          );
          depositAmount += depositValue * totalGuests;
        });
        console.log(
          `💰 Deposit (£${depositValue} per guest): £${depositAmount.toFixed(
            2
          )}`
        );
      }

      // Store calculated deposit amount
      calculatedDepositAmount = depositAmount;

      // Tickets and drinks: pay full amount (no deposit option)
      tickets.forEach((ticket) => {
        ticketsAndDrinksAmount += ticket.price_per_ticket * ticket.quantity;
      });

      drink_package.forEach((drink) => {
        ticketsAndDrinksAmount += drink.price * drink.quantity;
      });

      // Pay deposit for tables + full amount for tickets/drinks today
      const dateDueToday = depositAmount + ticketsAndDrinksAmount;
      partialPayment += dateDueToday;
      totalDueToday += dateDueToday; // Add to total due today

      console.log(`📊 Date ${date} payment breakdown:`, {
        tableTotalAmount,
        depositAmount,
        ticketsAndDrinksAmount,
        dateDueToday,
        depositType,
        depositValue,
      });
    } else {
      // Full payment - pay entire date total today
      totalDueToday += dateTotal;
      console.log(`📊 Date ${date} full payment: £${dateTotal.toFixed(2)}`);
    }

    const isDeposit = dateData.paymentType === "deposit" && isDepositEnabled;

    checkoutDates.push({
      event_date: date,
      special_request: dateData.specialRequest || "",
      is_deposit: isDeposit,
      deposit_amount: calculatedDepositAmount,
      deposit_type: paymentConfig?.deposit_type,
      deposit_value: paymentConfig?.deposit_value,
      amount_per_date: dateTotal,
      tables,
      tickets,
      drink_package,
    });
  });

  if (checkoutDates.length === 0) {
    console.error("No valid dates found for checkout");
    return null;
  }

  const checkoutPayload = {
    vendor_event_id: vendorEventId,
    event_slug: eventSlug,
    sub_total: subTotal,
    partial_payment: hasAnyDepositPayments ? partialPayment : null,
    total: totalDueToday, // Total to pay today (sum of all dates: deposits + full payments)
    payment_gateway: paymentGateway,
    dates: checkoutDates,
  };

  console.log("🛒 Generated checkout payload:", {
    vendor_event_id: checkoutPayload.vendor_event_id,
    event_slug: checkoutPayload.event_slug,
    sub_total: checkoutPayload.sub_total,
    partial_payment: checkoutPayload.partial_payment,
    total: checkoutPayload.total,
    payment_gateway: checkoutPayload.payment_gateway,
    dates_count: checkoutPayload.dates.length,
  });

  return checkoutPayload;
}

/**
 * Validate checkout requirements before processing
 */
export function validateCheckoutRequirements(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const eventData = editingData[eventSlug];

  if (!eventData) {
    errors.push("No event data found");
    return { isValid: false, errors };
  }

  let hasAnyItems = false;
  let hasValidDates = 0;

  Object.entries(eventData).forEach(([date, dateData]) => {
    const hasItems =
      dateData.tables.some((t) => t.quantity > 0) ||
      dateData.tickets.some((t) => t.quantity > 0) ||
      dateData.drinks.some((d) => d.quantity > 0);

    if (hasItems) {
      hasAnyItems = true;
      hasValidDates++;

      // Validate that each date has at least one table or ticket (not just drinks)
      const hasTableOrTicket =
        dateData.tables.some((t) => t.quantity > 0) ||
        dateData.tickets.some((t) => t.quantity > 0);

      if (!hasTableOrTicket) {
        errors.push(
          `${date}: Must have at least one table or ticket (drinks alone are not sufficient)`
        );
      }

      // Validate guest allocation for multiple tables
      const selectedTables = dateData.tables.filter((t) => t.quantity > 0);
      const totalTablesSelected = selectedTables.reduce(
        (sum, table) => sum + table.quantity,
        0
      );

      if (totalTablesSelected > 1) {
        // Check guest allocation for each table with multiple instances
        selectedTables.forEach((table) => {
          if (!table.allocation || table.allocation.length !== table.quantity) {
            errors.push(
              `${date}: Guest allocation required for ${table.title}`
            );
          } else {
            // Validate allocation values
            table.allocation.forEach((guestCount, index) => {
              if (guestCount < (table.minPersons || 1)) {
                errors.push(
                  `${date}: ${table.title} Table ${index + 1} needs at least ${
                    table.minPersons
                  } guests`
                );
              }
              if (guestCount > (table.maxPersons || 999)) {
                errors.push(
                  `${date}: ${table.title} Table ${index + 1} exceeds maximum ${
                    table.maxPersons
                  } guests`
                );
              }
            });
          }
        });

        // Validate total guest allocation matches people count
        if (dateData.peopleCount) {
          let totalAllocated = 0;
          selectedTables.forEach((table) => {
            if (table.allocation) {
              totalAllocated += table.allocation.reduce(
                (sum, guests) => sum + guests,
                0
              );
            }
          });

          if (totalAllocated !== dateData.peopleCount) {
            errors.push(
              `${date}: Total allocated guests (${totalAllocated}) must equal group size (${dateData.peopleCount})`
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
      "No valid dates found - each date must have at least one table or ticket"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate checkout totals summary
 */
export function calculateCheckoutSummary(
  eventSlug: string,
  editingData: Record<string, Record<string, EditableDateData>>,
  apiCartData?: unknown
): {
  subTotal: number;
  payToday: number;
  payLater: number;
  dateCount: number;
  itemCount: number;
} {
  const eventData = editingData[eventSlug];

  if (!eventData) {
    return {
      subTotal: 0,
      payToday: 0,
      payLater: 0,
      dateCount: 0,
      itemCount: 0,
    };
  }

  // Get API event data for payment configuration
  const eventsArray = extractEventsFromApiResponse(apiCartData);
  const apiEventData = findEventBySlug(eventsArray, eventSlug);

  let subTotal = 0;
  let payToday = 0;
  let payLater = 0;
  let dateCount = 0;
  let itemCount = 0;

  Object.entries(eventData).forEach(([date, dateData]) => {
    const hasItems =
      dateData.tables.some((t) => t.quantity > 0) ||
      dateData.tickets.some((t) => t.quantity > 0) ||
      dateData.drinks.some((d) => d.quantity > 0);

    if (!hasItems) return;

    dateCount++;

    // Calculate date totals
    let dateTotal = 0;

    // Table costs
    dateData.tables
      .filter((t) => t.quantity > 0)
      .forEach((table) => {
        itemCount += table.quantity;
        const pricePerPerson = table.pricePerPerson || table.price;

        if (table.allocation && table.allocation.length > 0) {
          const totalGuests = table.allocation.reduce(
            (sum, guests) => sum + guests,
            0
          );
          // Only charge if guests are actually allocated
          if (totalGuests > 0) {
            dateTotal += pricePerPerson * totalGuests;
          }
        } else {
          // No allocation = no cost (0 guests)
          dateTotal += 0;
        }
      });

    // Ticket costs
    dateData.tickets
      .filter((t) => t.quantity > 0)
      .forEach((ticket) => {
        itemCount += ticket.quantity;
        dateTotal += ticket.price * ticket.quantity;
      });

    // Drink costs
    dateData.drinks
      .filter((d) => d.quantity > 0)
      .forEach((drink) => {
        itemCount += drink.quantity;
        dateTotal += drink.price * drink.quantity;
      });

    subTotal += dateTotal;

    // Extract payment configuration from API data for this date
    const apiDateData = apiEventData?.[date] as
      | {
          payment?: {
            type?: string;
            is_deposit_enabled?: boolean;
            deposit_type?: "amount" | "percentage";
            deposit_value?: number;
            balance_due_date?: string | null;
          };
        }
      | undefined;

    const paymentConfig = apiDateData?.payment;
    const isDepositEnabled = paymentConfig?.is_deposit_enabled ?? false;
    const depositType = paymentConfig?.deposit_type || "amount";
    const depositValue = paymentConfig?.deposit_value || 0;

    // Calculate payment amounts based on payment type
    if (dateData.paymentType === "deposit" && isDepositEnabled) {
      // Calculate deposit for this date
      let depositAmount = 0;
      let ticketsAndDrinksAmount = 0;

      // Calculate table costs first
      let tableTotalAmount = 0;
      dateData.tables
        .filter((t) => t.quantity > 0)
        .forEach((table) => {
          if (table.allocation && table.allocation.length > 0) {
            const totalGuests = table.allocation.reduce(
              (sum, guests) => sum + guests,
              0
            );
            if (totalGuests > 0) {
              const pricePerPerson = table.pricePerPerson || table.price;
              tableTotalAmount += pricePerPerson * totalGuests;
            }
          }
        });

      // Calculate deposit based on type
      if (depositType === "percentage") {
        // Percentage: calculate % of table total
        depositAmount = (tableTotalAmount * depositValue) / 100;
      } else {
        // Amount: multiply by guest count
        dateData.tables
          .filter((t) => t.quantity > 0)
          .forEach((table) => {
            if (table.allocation && table.allocation.length > 0) {
              const totalGuests = table.allocation.reduce(
                (sum, guests) => sum + guests,
                0
              );
              if (totalGuests > 0) {
                depositAmount += depositValue * totalGuests;
              }
            }
          });
      }

      // Tickets and drinks: pay full amount (no deposit option)
      dateData.tickets
        .filter((t) => t.quantity > 0)
        .forEach((ticket) => {
          ticketsAndDrinksAmount += ticket.price * ticket.quantity;
        });

      dateData.drinks
        .filter((d) => d.quantity > 0)
        .forEach((drink) => {
          ticketsAndDrinksAmount += drink.price * drink.quantity;
        });

      // Pay deposit for tables + full amount for tickets/drinks today
      payToday += depositAmount + ticketsAndDrinksAmount;
      // Pay remaining table amount later
      payLater += dateTotal - depositAmount - ticketsAndDrinksAmount;
    } else {
      // Full payment
      payToday += dateTotal;
    }
  });

  return {
    subTotal,
    payToday,
    payLater,
    dateCount,
    itemCount,
  };
}
