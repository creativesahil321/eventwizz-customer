import { api } from "../../core/api-client";
import { API_ENDPOINTS } from "../../core/endpoints";
import type {
  CheckoutResponseData,
  CheckoutStripePaymentSession,
  StripePaymentSuccessData,
  StripePaymentSuccessRequest,
  StripePaymentSuccessResponse,
} from "./type";

export type CheckoutPaymentAction =
  | { type: "stripe"; session: CheckoutStripePaymentSession }
  | { type: "redirect"; url: string };

export function buildCheckoutStripeSession(
  data: CheckoutResponseData,
): CheckoutStripePaymentSession | null {
  const stripe = data.payment?.stripe;
  if (
    !stripe?.client_secret ||
    !stripe?.publishable_key ||
    data.payment?.gateway !== "stripe" ||
    data.booking_id == null
  ) {
    return null;
  }

  // Require at least one of the two session identifiers
  const hasCheckoutSession = Boolean(stripe.checkout_session_id);
  const hasPaymentIntent = Boolean(stripe.payment_intent_id);
  if (!hasCheckoutSession && !hasPaymentIntent) {
    return null;
  }

  return {
    bookingNumber: data.booking_number,
    bookingId: data.booking_id!,
    amount: data.amount,
    dueLater: data.due_later ?? null,
    gateway: data.payment.gateway,
    clientSecret: stripe.client_secret,
    publishableKey: stripe.publishable_key,
    // Prefer Checkout Sessions when both are present (shouldn't happen in practice)
    checkoutSessionId: stripe.checkout_session_id ?? undefined,
    paymentIntentId: stripe.payment_intent_id ?? undefined,
  };
}

export function resolveCheckoutPaymentAction(
  data: CheckoutResponseData,
): CheckoutPaymentAction | null {
  const session = buildCheckoutStripeSession(data);
  if (session) {
    return { type: "stripe", session };
  }

  if (data.redirect_url) {
    return { type: "redirect", url: data.redirect_url };
  }

  return null;
}

export function buildStripeReturnUrl(
  session: CheckoutStripePaymentSession,
): string {
  const url = new URL("/vendor/payment/success", window.location.origin);
  url.searchParams.set("booking_number", session.bookingNumber);
  url.searchParams.set("booking_id", String(session.bookingId));
  url.searchParams.set("amount", String(session.amount));
  url.searchParams.set("gateway", session.gateway);
  // Prefer checkout_session_id for Checkout Sessions API; fall back to payment_intent_id
  if (session.checkoutSessionId) {
    url.searchParams.set("checkout_session_id", session.checkoutSessionId);
  }
  if (session.paymentIntentId) {
    url.searchParams.set("payment_intent_id", session.paymentIntentId);
  }
  return url.toString();
}

/**
 * Verify payment with backend before showing success UI.
 * Webhook remains source of truth; this must succeed for client-side confirmation.
 */
export async function confirmStripePaymentSuccess(
  payload: StripePaymentSuccessRequest,
): Promise<StripePaymentSuccessResponse> {
  const response = await api.post<StripePaymentSuccessResponse>(
    API_ENDPOINTS.CUSTOMER.PAYMENT.STRIPE_SUCCESS,
    payload,
    { returnFullResponse: true },
  );

  if (!response.status) {
    throw new Error(response.message || "Payment could not be verified.");
  }

  return response;
}

export function mapStripePaymentSuccessData(
  data: StripePaymentSuccessData,
  paymentIntentId: string,
): {
  booking_id: number;
  booking_number: string;
  amount: string;
  gateway: string;
  transaction_id: string;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  guest_count?: number;
} {
  return {
    booking_id: data.booking_id,
    booking_number: data.booking_number,
    amount: String(data.amount),
    gateway: data.gateway,
    transaction_id: paymentIntentId,
    event_name: data.event_name,
    event_date: data.event_date,
    event_location: data.event_location,
    guest_count: data.guest_count,
  };
}
