import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import {
  CheckoutRequest,
  CheckoutResponse,
  CheckoutResumeRequest,
} from "./type";
import { ERROR_MESSAGES } from "./constants";

function iterateCheckoutDates(
  data: CheckoutRequest,
  callback: (dateData: NonNullable<CheckoutRequest["dates"]>[number], index: number) => void,
) {
  if (data.is_rooms) {
    let index = 0;
    data.rooms?.forEach((room) => {
      room.dates.forEach((dateData) => {
        callback(dateData, index);
        index += 1;
      });
    });
    return;
  }

  data.dates?.forEach((dateData, index) => callback(dateData, index));
}

export const checkoutService = {
  /**
   * Process checkout and create booking
   */
  processCheckout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    return api.post<CheckoutResponse>(
      API_ENDPOINTS.CUSTOMER.BOOK_EVENT.CHECKOUT,
      data,
      { returnFullResponse: true },
    );
  },

  /** Resume unpaid booking payment — same response shape as checkout. */
  resumeCheckout: async (
    data: CheckoutResumeRequest,
  ): Promise<CheckoutResponse> => {
    return api.post<CheckoutResponse>(
      API_ENDPOINTS.CUSTOMER.BOOK_EVENT.CHECKOUT_RESUME,
      data,
      { returnFullResponse: true },
    );
  },

  /**
   * Client-side validation before processing checkout
   */
  validateCheckoutData: (
    data: CheckoutRequest,
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.vendor_event_id || data.vendor_event_id <= 0) {
      errors.push(ERROR_MESSAGES.INVALID_VENDOR_EVENT_ID);
    }

    if (!data.event_slug || data.event_slug.trim() === "") {
      errors.push(ERROR_MESSAGES.EVENT_SLUG_REQUIRED);
    }

    if (typeof data.is_rooms !== "boolean") {
      errors.push("is_rooms flag is required");
    }

    const dateCount = data.is_rooms
      ? (data.rooms?.reduce((sum, room) => sum + room.dates.length, 0) ?? 0)
      : (data.dates?.length ?? 0);

    if (dateCount === 0) {
      errors.push(ERROR_MESSAGES.NO_DATES_SELECTED);
    }

    if (!data.payment_gateway || data.payment_gateway <= 0) {
      errors.push("Payment gateway is required");
    }

    if (data.sub_total < 0) {
      errors.push(ERROR_MESSAGES.NEGATIVE_SUBTOTAL);
    }

    if (data.total < 0) {
      errors.push(ERROR_MESSAGES.NEGATIVE_TOTAL);
    }

    if (data.partial_payment != null && data.partial_payment < 0) {
      errors.push(ERROR_MESSAGES.NEGATIVE_PARTIAL_PAYMENT);
    }

    if (
      data.partial_payment != null &&
      Math.abs(data.sub_total - (data.total + data.partial_payment)) > 0.02
    ) {
      errors.push(
        "partial_payment must equal sub_total minus total (balance due later)",
      );
    }

    iterateCheckoutDates(data, (dateData, index) => {
      const datePrefix = `Date ${index + 1}`;

      if (!dateData.event_date) {
        errors.push(`${datePrefix}: Event date is required`);
      }

      const hasItems =
        (dateData.tables && dateData.tables.length > 0) ||
        (dateData.tickets && dateData.tickets.length > 0) ||
        (dateData.drink_package && dateData.drink_package.length > 0);

      if (!hasItems) {
        errors.push(`${datePrefix}: ${ERROR_MESSAGES.NO_ITEMS_SELECTED}`);
      }

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

  calculateTotals: (
    data: CheckoutRequest,
  ): { calculatedSubTotal: number; calculatedTotal: number; calculatedPartial: number | null } => {
    let calculatedSubTotal = 0;
    let calculatedTotal = 0;
    let calculatedPartial: number | null = null;

    iterateCheckoutDates(data, (dateData) => {
      calculatedSubTotal += dateData.amount_per_date;

      if (dateData.is_deposit) {
        const ticketsAndDrinks =
          (dateData.tickets?.reduce(
            (sum, ticket) => sum + ticket.price_per_ticket * ticket.quantity,
            0,
          ) ?? 0) +
          (dateData.drink_package?.reduce(
            (sum, drink) => sum + drink.price * drink.quantity,
            0,
          ) ?? 0);

        const tableTotal =
          dateData.tables?.reduce((sum, table) => {
            const guests = table.allocation?.reduce((guestSum, g) => guestSum + g, 0) ?? 0;
            return sum + table.price_per_person * guests;
          }, 0) ?? 0;

        calculatedTotal += dateData.deposit_amount + ticketsAndDrinks;
        calculatedPartial = (calculatedPartial ?? 0) + Math.max(0, tableTotal - dateData.deposit_amount);
      } else {
        calculatedTotal += dateData.amount_per_date;
      }
    });

    return {
      calculatedSubTotal,
      calculatedTotal,
      calculatedPartial: calculatedPartial && calculatedPartial > 0 ? calculatedPartial : null,
    };
  },
};
