/**
 * Cart Service Type Definitions
 *
 * Contains service-specific types needed for the cart service.
 * Updated to match actual API structure.
 */

import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";

/**
 * Request payload for storing event booking data
 * Updated to match the new API payload format
 */
/** Wrapper for cart POST — checkout skips GET refetch to avoid stale API overwrites. */
export interface StoreEventBookingInput {
  data: CartRequest;
  /** When true, POST succeeds without invalidating cart-data (checkout auto-save). */
  skipInvalidation?: boolean;
}

export interface CartRequest {
  slug: string;
  event_date: string;
  /** Required when the event uses the multi-room system. */
  room_id?: number;
  people_quantity?: number;
  special_request?: string;
  drink_package?: Array<{
    id: number;
    title: string;
    price: number;
    quantity: number;
  }>;
  tables?: Array<{
    id: number;
    table_size: number;
    price_per_person: number;
    no_tables: number;
    allocation?: number[];
  }>;
  tickets?: Array<{
    id: number;
    title: string;
    description: string;
    price_per_ticket: number;
    quantity: number;
  }>;
}

/** DELETE cart row — flat date or room + date (store key may be composite). */
export interface DeleteCartDateRequest {
  /** ISO date sent to the API */
  eventDate: string;
  /** Set for multi-room events */
  roomId?: number;
  /** Zustand key (`roomId:date` or plain date) */
  storeDateKey: string;
}

/**
 * Request payload for fetching event checkout data
 */
export interface CheckoutDataRequest {
  slug: string;
  event_date: string;
}

/**
 * Individual ticket data from API response
 */
export interface TicketData {
  id: number;
  title: string;
  description: string;
  price: number;
  total_capacity: number;
  event_date: string;
}

/**
 * Individual table data from API response
 * Updated to match actual API structure
 */
export interface TableData {
  id: number;
  min_persons: number;
  max_persons: number;
  price: number;
  total_tables: number;
  event_date: string;
}

/**
 * Drink data from API response
 * Updated to match actual API structure
 */
export interface DrinkData {
  id: number;
  title: string;
  price: string; // API returns as string
  quantity?: string | number; // API returns as string or number
}

/**
 * Date-specific data structure from API response
 * Each date contains tables, tickets, and drinks
 */
export interface DateData {
  tables: TableData[];
  tickets: TicketData[];
  drinks: DrinkData[];
}

/**
 * Payment gateway structure from API
 */
export interface PaymentGatewayData {
  id: number;
  slug: string;
}

/**
 * Pending Stripe payment attached to the cart when a customer has an unpaid
 * booking for this event (e.g. they closed the payment modal, switched device).
 * Backend returns this so the frontend can restore the session without the
 * customer having to create a duplicate booking.
 */
export interface CartPendingPayment {
  booking_number: string;
  booking_id: number;
  amount: number;
  due_later?: number | null;
  payment: {
    gateway: string;
    stripe?: {
      client_secret: string;
      publishable_key: string;
      /** Payment Intents API (legacy) */
      payment_intent_id?: string;
      /** Checkout Sessions API */
      checkout_session_id?: string;
      /** Seconds remaining, or absolute Unix timestamp — same as checkout API */
      expires_at?: number;
    };
  };
}

/**
 * Event cart data structure from API response
 * Contains event info and dynamic date keys
 */
export interface EventCartData {
  event_name: string;
  event_slug: string;
  event_image: string;
  vendor_event_id: number;
  payment_gateways?: PaymentGatewayData[];
  drink_title?: string;
  drinks?: Array<{
    id: number;
    title: string;
    price: string;
  }>;
  /** Present when the customer has an unpaid booking for this event. */
  pending_payment?: CartPendingPayment | null;
  [date: string]:
    | DateData
    | string
    | number
    | PaymentGatewayData[]
    | Array<{ id: number; title: string; price: string }>
    | CartPendingPayment
    | null
    | undefined;
}

/**
 * Response data from the POST cart API
 * Simple success response
 */
export interface CartStoreResponseData {
  message: string;
  data: string;
}

/**
 * Response data from the GET cart API
 * Contains array of event cart data
 */
export interface GetCartResponseData {
  data: EventCartData[];
}

/**
 * Complete response type for POST cart operations
 */
export type CartResponse = BaseApiResponse<CartStoreResponseData>;

/**
 * Complete response type for GET cart operations
 */
export type GetCartResponse = BaseApiResponse<GetCartResponseData>;
