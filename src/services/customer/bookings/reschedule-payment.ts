import {
  buildCheckoutStripeSession,
  type CheckoutPaymentAction,
} from "../checkout/checkout-payment";
import type { CheckoutResponseData } from "../checkout/type";
import type {
  BookingPaymentGatewayInfo,
  RescheduleBookingResponseData,
} from "./type";

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
        redirect_url: payment.redirect_url,
      },
      redirect_url: data.redirect_url ?? payment.redirect_url,
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
  const session = buildCheckoutStripeSession(toCheckoutPaymentShape(data));
  if (session) {
    return { type: "stripe", session };
  }

  const redirectUrl =
    data.redirect_url ?? data.payment?.redirect_url;
  if (redirectUrl?.trim()) {
    return { type: "redirect", url: redirectUrl };
  }

  return null;
}

export type { CheckoutPaymentAction };
