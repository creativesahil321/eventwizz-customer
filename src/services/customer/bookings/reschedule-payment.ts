import {
  resolveCheckoutPaymentAction,
  type CheckoutPaymentAction,
} from "../checkout/checkout-payment";
import type { CheckoutResponseData } from "../checkout/type";
import type {
  BookingPaymentGatewayInfo,
  RescheduleBookingResponseData,
} from "./type";

/**
 * Maps reschedule-payment API data into the shared checkout payment shape.
 * Supports Stripe Elements and nested PayPal `payment.paypal.redirect_url`.
 */
function toCheckoutPaymentShape(
  data: RescheduleBookingResponseData,
): CheckoutResponseData {
  const payment = data.payment as BookingPaymentGatewayInfo | undefined;

  if (payment) {
    return {
      booking_number: data.booking_number ?? "",
      booking_id: data.booking_id,
      amount: data.amount ?? data.unpaid_amount ?? 0,
      due_later: null,
      payment: {
        gateway: payment.gateway,
        stripe: payment.stripe,
        stripe_bank: payment.stripe_bank,
        paypal: payment.paypal,
        redirect_url: payment.redirect_url,
      },
      redirect_url:
        data.redirect_url ??
        payment.redirect_url ??
        payment.paypal?.redirect_url,
    };
  }

  return {
    booking_number: data.booking_number ?? "",
    booking_id: data.booking_id,
    amount: data.amount ?? data.unpaid_amount ?? 0,
    due_later: null,
    payment: {
      gateway: data.payment_gateway ?? "stripe",
    },
    redirect_url: data.redirect_url,
  };
}

export function resolveReschedulePaymentAction(
  data: RescheduleBookingResponseData,
): CheckoutPaymentAction | null {
  return resolveCheckoutPaymentAction(toCheckoutPaymentShape(data));
}

export type { CheckoutPaymentAction };
