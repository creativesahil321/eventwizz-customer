import {
  resolveCheckoutPaymentAction,
  type CheckoutPaymentAction,
} from "../checkout/checkout-payment";
import type { CheckoutResponseData } from "../checkout/type";
import type { BookingPaymentResponseData } from "./type";

/**
 * Maps booking-payment API data into the shared checkout payment shape so
 * Stripe (Elements) and PayPal/redirect gateways resolve the same way as cart checkout.
 *
 * PayPal nests the hosted URL at `payment.paypal.redirect_url`.
 * Stripe nests credentials at `payment.stripe.{client_secret,publishable_key,...}`.
 */
function toCheckoutPaymentShape(
  data: BookingPaymentResponseData,
): CheckoutResponseData {
  if (data.payment) {
    return {
      booking_number: data.booking_number,
      booking_id: data.booking_id,
      amount: data.amount,
      due_later: null,
      payment: {
        gateway: data.payment.gateway,
        stripe: data.payment.stripe,
        stripe_bank: data.payment.stripe_bank,
        paypal: data.payment.paypal,
        redirect_url: data.payment.redirect_url,
      },
      redirect_url:
        data.redirect_url ??
        data.payment.redirect_url ??
        data.payment.paypal?.redirect_url,
    };
  }

  return {
    booking_number: data.booking_number,
    booking_id: data.booking_id,
    amount: data.amount ?? data.total_amount ?? 0,
    due_later: null,
    payment: {
      gateway: data.gateway ?? "stripe",
    },
    redirect_url: data.redirect_url,
  };
}

export function resolveBookingPaymentAction(
  data: BookingPaymentResponseData,
): CheckoutPaymentAction | null {
  return resolveCheckoutPaymentAction(toCheckoutPaymentShape(data));
}

export type { CheckoutPaymentAction };
