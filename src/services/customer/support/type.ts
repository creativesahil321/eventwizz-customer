/**
 * Customer support tickets — API types for GET /customer/support-tickets
 */

export type CustomerSupportTicketStatus =
  | "new"
  | "open"
  | "reopen"
  | "waiting_customer"
  | "waiting_general_support"
  | "waiting_platform_support"
  | "resolved"
  | "closed"
  | string;

export type CustomerSupportTicketPriority = "low" | "medium" | "high";

/** UI category keys used in the customer support inbox */
export type CustomerSupportCategoryFilter =
  | "general_support"
  | "technical_support";

/** API category query values */
export type CustomerSupportApiCategory = "general" | "technical";

export type CustomerSupportSort = "newest" | "oldest";

export type CustomerSupportTimeFilter =
  | "today"
  | "this_week"
  | "this_month";

export type CustomerSupportQuickFilter =
  | "closed_only"
  | "high_priority_only";

export interface CustomerSupportTicket {
  ticket_key: string;
  subject: string;
  status: CustomerSupportTicketStatus;
  status_label: string;
  /** True when an open ticket was previously closed and reopened */
  reopened?: boolean;
  priority: CustomerSupportTicketPriority;
  category_label: string;
  last_message_at: string;
  last_sender_name: string;
  last_message_preview: string;
  is_unread: boolean;
}

export interface CustomerSupportTicketsParams {
  sort?: CustomerSupportSort;
  search?: string;
  status?: CustomerSupportTicketStatus;
  priority?: CustomerSupportTicketPriority;
  category?: CustomerSupportCategoryFilter;
  time?: CustomerSupportTimeFilter;
  /** Comma-joined quick filters, e.g. closed_only,high_priority_only */
  filter?: CustomerSupportQuickFilter[];
  page?: number;
  per_page?: number;
}

export interface CustomerSupportTicketsPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path: string;
  links: Array<{
    url: string | null;
    label: string;
    page: number | null;
    active: boolean;
  }>;
}

export interface CustomerSupportTicketsResponse {
  status: boolean;
  message: string;
  data: CustomerSupportTicket[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: CustomerSupportTicketsPaginationMeta;
  inbox_count: number;
  unread_count?: number;
}

/** Payload for POST /customer/support-tickets/store */
export interface CreateCustomerSupportTicketPayload {
  subject: string;
  category: CustomerSupportCategoryFilter;
  contact_number: string;
  priority: CustomerSupportTicketPriority;
  message: string;
  vendor_location_id?: number | null;
  booking_id?: number | null;
  attachments?: File[];
}

export interface CreateCustomerSupportTicketResponse {
  status: boolean;
  message: string;
  data?: {
    ticket_key?: string;
    [key: string]: unknown;
  };
  errors?: string[] | Record<string, string[]>;
}

/** Item from GET /customer/support-tickets/locations */
export interface CustomerSupportLocationOption {
  location_id: number;
  location_name: string;
}

/** Item from GET /customer/support-tickets/locations?location_id= */
export interface CustomerSupportLocationBookingOption {
  booking_id: number;
  booking_number: string;
  event_name: string;
}

export interface CustomerSupportLocationsResponse {
  status: boolean;
  message: string;
  data: CustomerSupportLocationOption[];
  errors?: string[];
}

export interface CustomerSupportLocationBookingsResponse {
  status: boolean;
  message: string;
  data: CustomerSupportLocationBookingOption[];
  errors?: string[];
}

/** Attachment on a ticket message */
export interface CustomerSupportMessageAttachment {
  name: string;
  url: string;
  size: number;
  mime_type: string;
}

/** Single message item inside a date group */
export interface CustomerSupportMessageItem {
  id: number;
  message: string;
  is_system: boolean;
  is_mine: boolean;
  sender_name: string;
  created_at: string;
  attachments: CustomerSupportMessageAttachment[];
}

/** Messages grouped by calendar day (API shape) */
export interface CustomerSupportMessageGroup {
  date: string;
  date_label: string;
  items: CustomerSupportMessageItem[];
}

export interface CustomerSupportTicketDetail {
  ticket_key: string;
  status: CustomerSupportTicketStatus;
  status_label: string;
  reopened?: boolean;
  priority: CustomerSupportTicketPriority;
  category_label: string;
  subject: string;
  booking: {
    id?: number;
    booking_id?: number;
    booking_number?: string;
    event_name?: string;
    title?: string;
    date?: string;
    event_date?: string;
    location_name?: string;
    [key: string]: unknown;
  } | null;
}

export interface CustomerSupportTicketCustomer {
  full_name: string;
  email: string;
  phone: string;
}

export interface CustomerSupportRecentTicket {
  ticket_key: string;
  subject: string;
  status: CustomerSupportTicketStatus;
  status_label: string;
  reopened?: boolean;
}

export interface CustomerSupportMessagesParams {
  page?: number;
  per_page?: number;
}

export interface CustomerSupportMessagesData {
  ticket: CustomerSupportTicketDetail;
  customer: CustomerSupportTicketCustomer;
  recent_tickets: CustomerSupportRecentTicket[];
  messages: CustomerSupportMessageGroup[];
  meta: CustomerSupportTicketsPaginationMeta;
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

/**
 * Messages API may return either:
 * - nested object under `data` (`messages`, `ticket`, …), or
 * - message groups as `data` array with `ticket` / `customer` / `meta` at the root
 */
export interface CustomerSupportMessagesResponse {
  status: boolean;
  message: string;
  data: CustomerSupportMessagesData | CustomerSupportMessageGroup[];
  ticket?: CustomerSupportTicketDetail;
  customer?: CustomerSupportTicketCustomer;
  recent_tickets?: CustomerSupportRecentTicket[];
  meta?: CustomerSupportTicketsPaginationMeta;
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  errors?: string[] | Record<string, string[]>;
}

/** Payload for POST /customer/support-tickets/{ticketKey}/messages/store */
export interface StoreCustomerSupportMessagePayload {
  ticketKey: string;
  message: string;
  attachments?: File[];
}

export interface StoreCustomerSupportMessageResponse {
  status: boolean;
  message: string;
  data?: unknown;
  errors?: string[] | Record<string, string[]>;
}

/** Response for POST /customer/support-tickets/{ticketKey}/messages/read */
export interface MarkCustomerSupportMessagesReadData {
  ticket_key: string;
  is_unread: boolean;
  unread_count: number;
}

export interface MarkCustomerSupportMessagesReadResponse {
  status: boolean;
  message: string;
  data: MarkCustomerSupportMessagesReadData;
  errors?: string[] | Record<string, string[]>;
}
