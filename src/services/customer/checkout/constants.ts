/**
 * Checkout Service Constants
 *
 * Centralized constants for checkout operations to maintain consistency
 * and follow DRY principles.
 */

// Payment Gateway Configuration
export const PAYMENT_GATEWAYS = {
  STRIPE: {
    id: 1,
    name: "Stripe",
    description: "Credit or debit card",
    processing_time: "Instant",
  },
  PAYPAL: {
    id: 2,
    name: "PayPal",
    description: "Pay with your PayPal account",
    processing_time: "Instant",
  },
  WORLDPAY: {
    id: 3,
    name: "WorldPay",
    description: "Secure card payments",
    processing_time: "Instant",
  },
  KLARNA: {
    id: 4,
    name: "Klarna",
    description: "Buy now, pay later",
    processing_time: "Instant approval",
  },
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
  MAX_PAYMENT_AMOUNT: 10000,
  MIN_PAYMENT_AMOUNT: 0.01,
  MAX_TABLES_PER_DATE: 50,
  MAX_TICKETS_PER_DATE: 100,
  MAX_DRINKS_PER_DATE: 20,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_VENDOR_EVENT_ID: "Invalid vendor event ID",
  EVENT_SLUG_REQUIRED: "Event slug is required",
  NO_DATES_SELECTED: "At least one date must be selected",
  NEGATIVE_SUBTOTAL: "Subtotal cannot be negative",
  NEGATIVE_TOTAL: "Total cannot be negative",
  NEGATIVE_PARTIAL_PAYMENT: "Partial payment cannot be negative",
  PARTIAL_PAYMENT_EXCEEDS_TOTAL: "Partial payment cannot exceed total amount",
  INVALID_TABLE_ID: "Invalid table ID",
  INVALID_TICKET_ID: "Invalid ticket ID",
  INVALID_QUANTITY: "Quantity must be positive",
  NEGATIVE_PRICE: "Price cannot be negative",
  ALLOCATION_MISMATCH: "Allocation array length must match number of tables",
  NO_ITEMS_SELECTED: "Must have at least one table, ticket, or drink",
} as const;

// API Response Types
export const API_RESPONSE_TYPES = {
  CHECKOUT_SUCCESS: "The :module has been successfully saved.",
  CHECKOUT_DATA_SUCCESS: "Success",
} as const;
