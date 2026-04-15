import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import { CheckoutRequest, CheckoutResponse } from "./type";
import { ERROR_MESSAGES } from "./constants";

export const checkoutService = {
  /**
   * Process checkout and create booking
   * Validates cart data and creates a booking with payment gateway options
   */
  processCheckout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    return api.post<CheckoutResponse>(
      API_ENDPOINTS.CUSTOMER.BOOK_EVENT.CHECKOUT,
      data,
      { returnFullResponse: true }
    );
  },

  /**
   * Validate checkout data before processing
   * Client-side validation to ensure data integrity
   */
  validateCheckoutData: (
    data: CheckoutRequest
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Basic validation
    if (!data.vendor_event_id || data.vendor_event_id <= 0) {
      errors.push(ERROR_MESSAGES.INVALID_VENDOR_EVENT_ID);
    }

    if (!data.event_slug || data.event_slug.trim() === "") {
      errors.push(ERROR_MESSAGES.EVENT_SLUG_REQUIRED);
    }

    if (!data.dates || data.dates.length === 0) {
      errors.push(ERROR_MESSAGES.NO_DATES_SELECTED);
    }

    if (data.sub_total < 0) {
      errors.push(ERROR_MESSAGES.NEGATIVE_SUBTOTAL);
    }

    if (data.total < 0) {
      errors.push(ERROR_MESSAGES.NEGATIVE_TOTAL);
    }

    if (data.partial_payment && data.partial_payment < 0) {
      errors.push(ERROR_MESSAGES.NEGATIVE_PARTIAL_PAYMENT);
    }

    if (data.partial_payment && data.partial_payment > data.total) {
      errors.push(ERROR_MESSAGES.PARTIAL_PAYMENT_EXCEEDS_TOTAL);
    }

    // Validate each date
    data.dates?.forEach((dateData, index) => {
      const datePrefix = `Date ${index + 1}`;

      if (!dateData.event_date) {
        errors.push(`${datePrefix}: Event date is required`);
      }

      // Check if date has at least one item
      const hasItems =
        (dateData.tables && dateData.tables.length > 0) ||
        (dateData.tickets && dateData.tickets.length > 0) ||
        (dateData.drink_package && dateData.drink_package.length > 0);

      if (!hasItems) {
        errors.push(`${datePrefix}: ${ERROR_MESSAGES.NO_ITEMS_SELECTED}`);
      }

      // Validate tables
      dateData.tables?.forEach((table, tableIndex) => {
        const tablePrefix = `${datePrefix}, Table ${tableIndex + 1}`;

        if (!table.id || table.id <= 0) {
          errors.push(`${tablePrefix}: ${ERROR_MESSAGES.INVALID_TABLE_ID}`);
        }
        if (table.no_tables <= 0) {
          errors.push(`${tablePrefix}: ${ERROR_MESSAGES.INVALID_QUANTITY}`);
        }
        if (table.price_per_person < 0) {
          errors.push(`${tablePrefix}: ${ERROR_MESSAGES.NEGATIVE_PRICE}`);
        }
        if (table.allocation && table.allocation.length !== table.no_tables) {
          errors.push(`${tablePrefix}: ${ERROR_MESSAGES.ALLOCATION_MISMATCH}`);
        }
      });

      // Validate tickets
      dateData.tickets?.forEach((ticket, ticketIndex) => {
        const ticketPrefix = `${datePrefix}, Ticket ${ticketIndex + 1}`;

        if (!ticket.id || ticket.id <= 0) {
          errors.push(`${ticketPrefix}: ${ERROR_MESSAGES.INVALID_TICKET_ID}`);
        }
        if (ticket.quantity <= 0) {
          errors.push(`${ticketPrefix}: ${ERROR_MESSAGES.INVALID_QUANTITY}`);
        }
        if (ticket.price_per_ticket < 0) {
          errors.push(`${ticketPrefix}: ${ERROR_MESSAGES.NEGATIVE_PRICE}`);
        }
      });

      // Validate drinks
      dateData.drink_package?.forEach((drink, drinkIndex) => {
        const drinkPrefix = `${datePrefix}, Drink ${drinkIndex + 1}`;

        if (!drink.title || drink.title.trim() === "") {
          errors.push(`${drinkPrefix}: Title is required`);
        }
        if (drink.quantity <= 0) {
          errors.push(`${drinkPrefix}: ${ERROR_MESSAGES.INVALID_QUANTITY}`);
        }
        if (drink.price < 0) {
          errors.push(`${drinkPrefix}: ${ERROR_MESSAGES.NEGATIVE_PRICE}`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Calculate totals from checkout data for verification
   */
  calculateTotals: (
    data: CheckoutRequest
  ): { calculatedSubTotal: number; calculatedTotal: number } => {
    let calculatedSubTotal = 0;

    data.dates?.forEach((dateData) => {
      // Calculate table costs
      dateData.tables?.forEach((table) => {
        if (table.allocation && table.allocation.length > 0) {
          // Use actual guest allocation
          const totalGuests = table.allocation.reduce(
            (sum, guests) => sum + guests,
            0
          );
          calculatedSubTotal += table.price_per_person * totalGuests;
        } else {
          // Fallback: estimate based on table capacity
          calculatedSubTotal +=
            table.price_per_person * table.table_size * table.no_tables;
        }
      });

      // Calculate ticket costs
      dateData.tickets?.forEach((ticket) => {
        calculatedSubTotal += ticket.price_per_ticket * ticket.quantity;
      });

      // Calculate drink costs
      dateData.drink_package?.forEach((drink) => {
        calculatedSubTotal += drink.price * drink.quantity;
      });
    });

    return {
      calculatedSubTotal,
      // Request total may exceed line-item sum when vendor platform fee is included;
      // fee is not sent as a separate field — backend applies it.
      calculatedTotal: calculatedSubTotal,
    };
  },
};
