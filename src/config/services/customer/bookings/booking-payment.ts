import {
  buildCheckoutStripeSession,
  type CheckoutPaymentAction,
} from "../checkout/checkout-payment";
import type { CheckoutResponseData } from "../checkout/type";
import type { BookingPaymentResponseData } from "./type";

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
        redirect_url: data.payment.redirect_url,
      },
      redirect_url: data.redirect_url ?? data.payment.redirect_url,
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
  const session = buildCheckoutStripeSession(toCheckoutPaymentShape(data));
  if (session) {
    return { type: "stripe", session };
  }

  const redirectUrl = data.redirect_url ?? data.payment?.redirect_url;
  if (redirectUrl) {
    return { type: "redirect", url: redirectUrl };
  }

  return null;
}

export type { CheckoutPaymentAction };
