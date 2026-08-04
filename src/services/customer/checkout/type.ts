/**
 * Checkout Service Type Definitions
 *
 * Matches the customer event checkout API contract (flat dates + room-based).
 */

import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";

export interface CheckoutTableData {
  id: number;
  table_size: number;
  price_per_person: number;
  no_tables: number;
  allocation: number[];
}

export interface CheckoutTicketData {
  id: number;
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
}

export interface CheckoutDrinkData {
  id: number;
  title: string;
  price: number;
  quantity: number;
}

export interface CheckoutDateData {
  event_date: string;
  special_request: string;
  is_deposit: boolean;
  deposit_amount: number;
  deposit_type?: "amount" | "percentage";
  deposit_value?: number;
  amount_per_date: number;
  tables: CheckoutTableData[];
  tickets: CheckoutTicketData[];
  drink_package: CheckoutDrinkData[];
}

export interface CheckoutRoomData {
  room_id: number;
  room_name: string;
  dates: CheckoutDateData[];
}

/**
 * Checkout request payload.
 *
 * - Flat events: `is_rooms: false`, send `dates`
 * - Room events: `is_rooms: true`, send `rooms`
 *
 * Amount semantics:
 * - `sub_total` — full booking value across all dates
 * - `partial_payment` — sum of table deposit amounts charged today (null when paying in full)
 * - `total` — full amount charged at checkout now (deposits + tickets/drinks)
 */
export interface CheckoutRequest {
  vendor_event_id: number;
  event_slug: string;
  is_rooms: boolean;
  payment_gateway: number;
  sub_total: number;
  partial_payment: number | null;
  total: number;
  dates?: CheckoutDateData[];
  rooms?: CheckoutRoomData[];
}

export interface PaymentGateway {
  id: number;
  name: string;
}

export interface PaymentDetails {
  payment_id: number;
  amount: string;
  currency: string;
  status: string;
  transaction_id: string;
  platform_fee: string;
  vendor_amount: string;
}

export interface CheckoutStripeDetails {
  client_secret: string;
  publishable_key: string;
  /** Payment Intents API (legacy) */
  payment_intent_id?: string;
  /** Checkout Sessions API (ui_mode: "elements") — preferred */
  checkout_session_id?: string;
  /** Unix timestamp (seconds) when this payment session expires. Used to drive
   *  the countdown timer in the pending-payment banner. */
  expires_at?: number;
}

export interface CheckoutResumeRequest {
  booking_number: string;
  /** When set, resume/switch payment on this gateway for the unpaid booking. */
  payment_gateway?: number;
}

export interface StripePaymentSuccessRequest {
  booking_id: number;
  /** Required when using Payment Intents API (legacy) */
  payment_intent_id?: string;
  /** Required when using Checkout Sessions API */
  checkout_session_id?: string;
}

export interface StripePaymentSuccessData {
  payment_id: number;
  booking_id: number;
  booking_number: string;
  payment_status: string;
  booking_payment_status: number;
  is_paid: boolean;
  is_fully_paid: boolean;
  amount: number;
  total_paid: number;
  order_total: number;
  gateway: string;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  guest_count?: number;
}

export type StripePaymentSuccessResponse = {
  status: boolean;
  message?: string;
  data?: StripePaymentSuccessData;
};

/** Redirect-based gateway details (PayPal, TrueLayer, etc.).
 *  Unlike Stripe (embedded modal), these hand off to a hosted checkout page. */
export interface CheckoutRedirectDetails {
  /** Hosted checkout URL the customer is sent to. */
  redirect_url: string;
  /** Gateway order/session reference (e.g. PayPal order token). */
  order_id?: string;
  /** Seconds until this hosted session expires. */
  expires_at?: number;
}

export interface CheckoutPaymentInfo {
  gateway: string;
  stripe?: CheckoutStripeDetails;
  /** Present when gateway is "paypal". */
  paypal?: CheckoutRedirectDetails;
  /** Generic redirect payload for other hosted gateways (e.g. TrueLayer). */
  redirect_url?: string;
}

/** Stripe modal session built from checkout response.
 *  Exactly one of `paymentIntentId` or `checkoutSessionId` will be set,
 *  matching which Stripe API the backend used. */
export interface CheckoutStripePaymentSession {
  bookingNumber: string;
  bookingId: number;
  amount: number;
  dueLater: number | null;
  gateway: string;
  clientSecret: string;
  publishableKey: string;
  /** Set when backend uses Payment Intents API (legacy) */
  paymentIntentId?: string;
  /** Set when backend uses Checkout Sessions API (ui_mode: "elements") */
  checkoutSessionId?: string;
  /** Unix timestamp (seconds) when this session expires — drives the
   *  countdown timer in the pending-payment banner.
   *  Backend returns this as `stripe.expires_at` in the checkout response. */
  expiresAt?: number;
}

export interface CheckoutResponseData {
  booking_number: string;
  amount: number;
  due_later?: number | null;
  payment: CheckoutPaymentInfo;
  /** Legacy redirect-based gateways (PayPal, TrueLayer, etc.) */
  redirect_url?: string;
  /** Legacy fields — kept for backward compatibility */
  booking_id?: number;
  payment_status?: string;
  total?: number;
  gateway?: string;
  payment_details?: PaymentDetails;
}

export type CheckoutResponse = BaseApiResponse<CheckoutResponseData>;

export interface CheckoutValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface CheckoutValidationResult {
  isValid: boolean;
  errors: CheckoutValidationError[];
  totalAmount: number;
  partialPaymentAmount: number;
}

export interface CheckoutEventData {
  vendor_event_id: number;
  event_slug: string;
  event_name: string;
  dates: string[];
}
