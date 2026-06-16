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
  getBillableTables,
  hasUnconfirmedTableSeating,
} from "./cart-calculations";
import { formatMoney, resolveCurrencySymbol } from "@/lib/currency-format";
import { useDomainStore } from "@/store/domain.store";

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
  bookingSubTotal: number
): { fee: number; label: string | null } {
  const feeMeta = (apiEventData as { vendor_platform_fee?: unknown })
    ?.vendor_platform_fee as
    | { mode?: unknown; value?: unknown }
    | undefined;

  if (!feeMeta || bookingSubTotal <= 0) return { fee: 0, label: null };

  const mode = feeMeta.mode === "percentage" ? "percentage" : feeMeta.mode === "flat" ? "flat" : null;
  const valueNum =
    typeof feeMeta.value === "number"
      ? feeMeta.value
      : Number.parseFloat(String(feeMeta.value ?? ""));

  if (!mode || !Number.isFinite(valueNum) || valueNum <= 0) {
    return { fee: 0, label: null };
  }

  const rawFee = mode === "flat" ? valueNum : (bookingSubTotal * valueNum) / 100;
  // Currency amounts should never be negative; keep in 2dp range
  const fee = Math.max(0, Number(rawFee.toFixed(2)));

  if (mode === "flat") {
    return { fee, label: "Platform fee" };
  }

  return { fee, label: `Platform fee (${valueNum}%)` };
}

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
    const billableTables = getBillableTables(dateData);
    const hasItems =
      billableTables.length > 0 ||
      dateData.tickets.some((t) => t.quantity > 0) ||
      dateData.drinks.some((d) => d.quantity > 0);

    if (!hasItems) return;

    const tables = billableTables.map((table) => ({
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
        const sym = checkoutLogCurrencySymbol();
        console.log(
          `💰 Deposit (${depositValue}% of ${formatMoney(tableTotalAmount, sym)}): ${formatMoney(depositAmount, sym)}`,
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
        const sym = checkoutLogCurrencySymbol();
        console.log(
          `💰 Deposit (${formatMoney(depositValue, sym)} per guest): ${formatMoney(depositAmount, sym)}`,
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
      console.log(
        `📊 Date ${date} full payment: ${formatMoney(dateTotal, checkoutLogCurrencySymbol())}`,
      );
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

  // Platform fee is charged on the booking subtotal (flat or percentage)
  const { fee: platformFee } = calculatePlatformFeeFromApi(apiEventData, subTotal);

  // Platform fee is shown in UI only; backend derives fee from cart / rules.
  const checkoutPayload = {
    vendor_event_id: vendorEventId,
    event_slug: eventSlug,
    sub_total: subTotal,
    partial_payment: hasAnyDepositPayments ? partialPayment : null,
    total: totalDueToday + platformFee, // Customer pay today (includes fee for display parity with UI)
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
    platform_fee_ui_only: platformFee,
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
          `${date}: Must have at least one table or ticket (drinks alone are not sufficient)`
        );
      }

      const selectedTables = billableTables;
      const totalTablesSelected = selectedTables.reduce(
        (sum, table) => sum + table.quantity,
        0
      );

      // Calculate total table capacity
      if (selectedTables.length > 0 && dateData.peopleCount) {
        let totalMinCapacity = 0;
        let totalMaxCapacity = 0;

        selectedTables.forEach((table) => {
          const minPersons = table.minPersons || 1;
          const maxPersons = table.maxPersons || 999;
          totalMinCapacity += minPersons * table.quantity;
          totalMaxCapacity += maxPersons * table.quantity;
        });

        // Critical validation: Check if selected tables can accommodate the group
        if (dateData.peopleCount > totalMaxCapacity) {
          errors.push(
            `${date}: Insufficient table capacity! You have ${dateData.peopleCount} guests but selected tables can only accommodate ${totalMaxCapacity} guests maximum. Please add more tables.`
          );
        }

        // Warning if capacity is too low (below minimum)
        if (dateData.peopleCount < totalMinCapacity) {
          errors.push(
            `${date}: Selected tables require at least ${totalMinCapacity} guests, but you have ${dateData.peopleCount} guests. Please select smaller tables or reduce table quantity.`
          );
        }
      }

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
                  `${date}: ${table.title} Table ${index + 1} needs at least ${table.minPersons
                  } guests`
                );
              }
              if (guestCount > (table.maxPersons || 999)) {
                errors.push(
                  `${date}: ${table.title} Table ${index + 1} exceeds maximum ${table.maxPersons
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
      } else if (totalTablesSelected === 1) {
        // Single table validation - check if it can accommodate all guests
        const singleTable = selectedTables[0];
        if (dateData.peopleCount && singleTable) {
          const maxCapacity = singleTable.maxPersons || 999;
          const minCapacity = singleTable.minPersons || 1;

          if (dateData.peopleCount > maxCapacity) {
            errors.push(
              `${date}: ${singleTable.title} can only accommodate ${maxCapacity} guests maximum, but you have ${dateData.peopleCount} guests. Please select additional tables or a larger table option.`
            );
          }

          if (dateData.peopleCount < minCapacity) {
            errors.push(
              `${date}: ${singleTable.title} requires at least ${minCapacity} guests, but you have ${dateData.peopleCount} guests. Please select a smaller table option.`
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
  platformFee: number;
  platformFeeLabel: string | null;
  grandTotal: number;
  payToday: number;
  payLater: number;
  payTodayWithFee: number;
  dateCount: number;
  itemCount: number;
} {
  const eventData = editingData[eventSlug];

  if (!eventData) {
    return {
      subTotal: 0,
      platformFee: 0,
      platformFeeLabel: null,
      grandTotal: 0,
      payToday: 0,
      payLater: 0,
      payTodayWithFee: 0,
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
    const billableTables = getBillableTables(dateData);
    const hasItems =
      billableTables.length > 0 ||
      dateData.tickets.some((t) => t.quantity > 0) ||
      dateData.drinks.some((d) => d.quantity > 0);

    if (!hasItems) return;

    dateCount++;

    let dateTotal = 0;

    billableTables.forEach((table) => {
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
