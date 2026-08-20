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

/**
 * Converts the backend `expires_at` field to an absolute Unix timestamp (seconds).
 *
 * Backend sends a duration in seconds (e.g. 1740 = 29 minutes).
 * If it's already an absolute Unix timestamp (> 1 billion) we use it directly.
 */
function normalizeExpiresAt(raw: number | undefined | null): number | undefined {
  if (!raw || raw <= 0) return undefined;
  const now = Math.floor(Date.now() / 1000);
  // Absolute Unix timestamp (seconds)
  if (raw > 1_000_000_000) return raw;
  // Duration in seconds (typical hold windows: 900–3600)
  if (raw >= 60) return now + raw;
  // Small values are treated as minutes (e.g. 29 → 29 minutes)
  return now + raw * 60;
}

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
    // Normalise expires_at: backend SHOULD send a Unix timestamp (e.g. 1750170000)
    // but may send a duration in minutes (e.g. 29).
    // Heuristic: real Unix timestamps are always > 1 billion; anything smaller is
    // treated as minutes-from-now and converted to an absolute timestamp.
    expiresAt: normalizeExpiresAt(stripe.expires_at),
  };
}

/** Merge a refreshed checkout/resume session with any stored session.
 *  Keeps the stored absolute `expiresAt` when the API omits it (common on /resume). */
export function mergeStripePaymentSession(
  previous: CheckoutStripePaymentSession | null | undefined,
  next: CheckoutStripePaymentSession,
): CheckoutStripePaymentSession {
  return {
    ...next,
    expiresAt: next.expiresAt ?? previous?.expiresAt,
    clientQuotedAmount:
      next.clientQuotedAmount ?? previous?.clientQuotedAmount,
  };
}

/**
 * Resolves the hosted-checkout URL for redirect-based gateways (PayPal, TrueLayer, …).
 *
 * The backend nests the URL differently per gateway:
 *  - PayPal:  `data.payment.paypal.redirect_url`
 *  - Generic: `data.payment.redirect_url`
 *  - Legacy:  `data.redirect_url` (top-level)
 */
export function resolveCheckoutRedirectUrl(
  data: CheckoutResponseData,
): string | null {
  const payment = data.payment;
  return (
    payment?.paypal?.redirect_url ||
    payment?.redirect_url ||
    data.redirect_url ||
    null
  );
}

export function resolveCheckoutPaymentAction(
  data: CheckoutResponseData,
): CheckoutPaymentAction | null {
  const session = buildCheckoutStripeSession(data);
  if (session) {
    return { type: "stripe", session };
  }

  const redirectUrl = resolveCheckoutRedirectUrl(data);
  if (redirectUrl) {
    return { type: "redirect", url: redirectUrl };
  }

  return null;
}

export function buildStripeReturnUrl(
  session: CheckoutStripePaymentSession,
  options?: { path?: string },
): string {
  const path = options?.path ?? "/vendor/payment/success";
  const url = new URL(path, window.location.origin);
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
