/**
 * Enhanced Cart Type Definitions
 * Centralized type definitions to improve type safety
 * Updated for new date-based API structure
 */

import {
  DateData,
  DrinkData,
  PaymentGatewayData,
  TableData,
  TicketData,
} from "@/services/customer/cart/type";
import type { PublicEventDateDiscount } from "@/components/public/date-card-offer";
import type { CouponStripSource } from "@/lib/coupon-strip-props";

// Payment System Types
export interface PaymentInfo {
  deposit_amount: any;
  type: "full" | "deposit";
  is_deposit_enabled: boolean;
  deposit_type: "amount" | "percentage";
  deposit_value: number;
  balance_due_date: string | null;
}

export interface SelectedDrink {
  id: number;
  vendor_event_id: number;
  title: string;
  price: string;
  quantity?: number;
}

export interface ApiDateData extends DateData {
  payment: PaymentInfo;
  selected_drinks: SelectedDrink[];
}

export interface ApiDrinkData extends DrinkData {}

export interface ApiTableData extends TableData {
  min_persons: number;
  max_persons: number;
  total_tables: number;
}

export interface ApiTicketData extends TicketData {}

/** Per-date cart bucket from checkout API (ISO date keys on the event object). */
export type ApiEventCartDateBucket = {
  payment: PaymentInfo;
  tables: ApiTableData[];
  tickets: ApiTicketData[];
  selected_drinks: SelectedDrink[];
  /** Optional list-price / server subtotal for the date. */
  date_subtotal?: number;
  /** Automatic date offer from GET /customer/event. */
  discount?: PublicEventDateDiscount | null;
  event_date?: string;
  room_id?: number;
};

export type VendorPlatformFee = {
  mode: "flat" | "percentage";
  value: number;
};

/** Per-room cart data returned when `is_rooms` is true on the cart API. */
export interface ApiRoomCartData {
  room_id: number;
  room_name: string;
  /** Room-specific package section label (e.g. "The Boys Package"). */
  drink_title?: string;
  drinks: SelectedDrink[];
  dates: Record<string, ApiEventCartDateBucket>;
  room_subtotal: number;
}

/** All bookable rooms on the event (cart API `event_rooms` catalog). */
export interface ApiEventRoomCatalogItem {
  room_id: number;
  room_name: string;
}

/**
 * Checkout GET cart shape for one event. Not `extends EventCartData` — that type’s
 * index signature is incompatible with `drinks`, totals, and per-date buckets.
 */
/** Pending Stripe payment returned by the cart API when the customer has an
 *  unpaid booking — used to restore the payment session cross-device. */
export interface ApiPendingPayment {
  booking_number: string;
  booking_id: number;
  amount: number;
  due_later?: number | null;
  payment: {
    gateway: string;
    stripe?: {
      client_secret: string;
      publishable_key: string;
      payment_intent_id?: string;
      checkout_session_id?: string;
      /** Seconds remaining, or absolute Unix timestamp — same as checkout API */
      expires_at?: number;
    };
  };
}

export interface ApiEventCartData {
  event_name: string;
  event_slug: string;
  event_image: string;
  vendor_event_id: number;
  /** Venue display name from cart GET — shown under event name on checkout. */
  location_name?: string;
  event_location?: string;
  city?: string;
  payment_gateways?: PaymentGatewayData[];
  drink_title?: string;
  drinks: SelectedDrink[];
  cart_sub_total?: number;
  cart_customer_total?: number;
  vendor_platform_fee?: VendorPlatformFee;
  is_rooms?: boolean;
  rooms?: ApiRoomCartData[];
  /** Full room catalog for the event (may include rooms not yet in cart). */
  event_rooms?: ApiEventRoomCatalogItem[];
  /** Present when the customer has an unpaid booking — enables cross-device session restore. */
  pending_payment?: ApiPendingPayment | null;
  /** Event-level coupon from GET /customer/event. */
  coupon?: CouponStripSource | null;
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | null
    | PaymentGatewayData[]
    | SelectedDrink[]
    | VendorPlatformFee
    | ApiRoomCartData[]
    | ApiEventRoomCatalogItem[]
    | ApiEventCartDateBucket
    | ApiPendingPayment
    | CouponStripSource;
}

// Professional UI Types (replacing cart store types)
export interface DrinkPackage {
  id: number;
  title: string;
  price: number;
  quantity: number;
}

export interface Table {
  id: number;
  title: string;
  description: string;
  price: number;
  capacity: number;
  quantity: number;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  price: number;
  total_capacity: number;
  event_date: string;
  quantity: number;
}

// Legacy API Response Types (for backward compatibility)
export interface LegacyApiCartItem {
  event_name: string;
  event_slug: string;
  event_image: string;
  event_date: string;
  tables: ApiTableData[];
  tickets: ApiTicketData[];
  packages: ApiPackageData[];
}

export interface ApiPackageData {
  title: string;
  price: string;
  quantity: string;
}

// Normalized types for internal processing
export interface NormalizedCartData {
  event_name: string;
  event_slug: string;
  event_image: string;
  dates: Record<
    string,
    {
      tables: Table[];
      tickets: Ticket[];
      drinks: DrinkPackage[];
    }
  >;
}

// UI Component Types
export interface CartItemProps {
  item: DrinkPackage | Table | Ticket;
  quantity: number;
  availableQuantity: number;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  type: "drink" | "table" | "ticket";
}

export interface QuantityControlsProps {
  quantity: number;
  availableQuantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export interface StockStatusProps {
  availableQuantity: number;
  currentQuantity?: number;
  type: "ticket" | "table" | "drink";
}

// Date Accordion Props
export interface DateAccordionProps {
  date: string;
  availableTickets: Ticket[];
  availableTables: Table[];
  availableDrinks: DrinkPackage[];
  onAddTicket: (date: string, ticket: Ticket) => void;
  onUpdateTicketQuantity: (
    date: string,
    ticketId: number,
    quantity: number
  ) => void;
  onRemoveTicket: (date: string, ticketId: number) => void;
  onAddTable: (date: string, table: Table) => void;
  onUpdateTableQuantity: (
    date: string,
    tableId: number,
    quantity: number
  ) => void;
  onRemoveTable: (date: string, tableId: number) => void;
  onAddDrink: (date: string, drink: DrinkPackage) => void;
  onUpdateDrinkQuantity: (
    date: string,
    drinkTitle: string,
    quantity: number
  ) => void;
  onRemoveDrink: (date: string, drinkTitle: string) => void;
}

// Security and Validation Types
export interface PriceValidationResult {
  isValid: boolean;
  expectedPrice: number;
  providedPrice: number;
  itemType: CartItemType;
  itemId: string | number;
  errorMessage?: string;
}

export interface SecurityValidation {
  validatePrices: (
    cartData: NormalizedCartData,
    apiData: ApiEventCartData
  ) => PriceValidationResult[];
  isCartTampered: (
    cartData: NormalizedCartData,
    apiData: ApiEventCartData
  ) => boolean;
  sanitizeCartData: (
    cartData: NormalizedCartData,
    apiData: ApiEventCartData
  ) => NormalizedCartData;
}

// Error Types
export interface CartError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  status: boolean;
  message: string;
  data: unknown[];
  errors: Record<string, string[]>;
}

// Utility Types
export type CartItemType = "drink" | "table" | "ticket";
export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

// Event Handlers
export type CartItemHandler<T = unknown> = (item: T, date: string) => void;
export type QuantityHandler = (
  date: string,
  id: number | string,
  quantity: number
) => void;
export type RemoveHandler = (date: string, id: number | string) => void;

// API Data Transformation Types
export interface ApiDataTransformer {
  transformEventData: (apiData: ApiEventCartData) => NormalizedCartData;
  extractDateKeys: (apiData: ApiEventCartData) => string[];
  getDateData: (apiData: ApiEventCartData, date: string) => DateData | null;
  mergeCartData: (
    existingData: NormalizedCartData,
    newData: ApiEventCartData
  ) => NormalizedCartData;
}

// Hook Return Types
export interface UseCartDataReturn {
  cartData: { data: { data: ApiEventCartData[] } } | undefined;
  isLoadingCartData: boolean;
  cartError: Error | null;
  currentEvent: any; // Keep as any for now to avoid conversion issues
  normalizedData: NormalizedCartData[];
}

export interface UseCartActionsReturn {
  handleAddDrink: (date: string, drink: DrinkPackage) => void;
  handleUpdateDrinkQuantity: (
    date: string,
    drinkTitle: string,
    quantity: number
  ) => void;
  handleRemoveDrink: (date: string, drinkTitle: string) => void;
  handleAddTable: (date: string, table: Table) => void;
  handleUpdateTableQuantity: (
    date: string,
    tableId: number,
    quantity: number
  ) => void;
  handleRemoveTable: (date: string, tableId: number) => void;
  handleAddTicket: (date: string, ticket: Ticket) => void;
  handleUpdateTicketQuantity: (
    date: string,
    ticketId: number,
    quantity: number
  ) => void;
  handleRemoveTicket: (date: string, ticketId: number) => void;
  handleProceedToPayment: (eventSlug: string, eventDate: string) => void;
  isPending: boolean;
  isProcessing: boolean;
}
