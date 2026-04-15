/**
 * Checkout Service Type Definitions
 *
 * Contains service-specific types needed for the checkout service.
 * Handles the final checkout process and payment gateway integration.
 */

import { ApiResponse as BaseApiResponse } from "@/services/core/api-client";

/**
 * Table data for checkout request
 */
export interface CheckoutTableData {
  id: number;
  table_size: number;
  price_per_person: number;
  no_tables: number;
  allocation: number[];
}

/**
 * Ticket data for checkout request
 */
export interface CheckoutTicketData {
  id: number;
  title: string;
  description: string;
  price_per_ticket: number;
  quantity: number;
}

/**
 * Drink package data for checkout request
 */
export interface CheckoutDrinkData {
  id: number;
  title: string;
  price: number;
  quantity: number;
}

/**
 * Date-specific checkout data
 */
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

/**
 * Complete checkout request payload
 * Matches the API structure provided by the user
 */
export interface CheckoutRequest {
  vendor_event_id: number;
  event_slug: string;
  sub_total: number;
  partial_payment: number | null;
  total: number;
  payment_gateway?: string;
  dates: CheckoutDateData[];
}

/**
 * Payment gateway information from API response
 */
export interface PaymentGateway {
  id: number;
  name: string;
}

/**
 * Payment details from checkout response
 */
export interface PaymentDetails {
  payment_id: number;
  amount: string;
  currency: string;
  status: string;
  transaction_id: string;
  platform_fee: string;
  vendor_amount: string;
}

/**
 * Response data from the checkout API (POST)
 * Contains booking ID, payment status, total amount, gateway, and redirect URL
 *
 * Updated API response format:
 * {
 *   "booking_id": 83,
 *   "payment_status": "pending_payment",
 *   "total": 200,
 *   "gateway": "stripe",
 *   "redirect_url": "https://checkout.stripe.com/...",
 *   "payment_details": { ... }
 * }
 */
export interface CheckoutResponseData {
  booking_id: number;
  payment_status: string;
  total: number;
  gateway: string;
  redirect_url: string;
  payment_details: PaymentDetails;
}

/**
 * Complete response type for checkout operations
 */
export type CheckoutResponse = BaseApiResponse<CheckoutResponseData>;

/**
 * Validation error structure for checkout
 */
export interface CheckoutValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Checkout validation result
 */
export interface CheckoutValidationResult {
  isValid: boolean;
  errors: CheckoutValidationError[];
  totalAmount: number;
  partialPaymentAmount: number;
}

/**
 * Event data needed for checkout validation
 */
export interface CheckoutEventData {
  vendor_event_id: number;
  event_slug: string;
  event_name: string;
  dates: string[];
}
