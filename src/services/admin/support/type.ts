/**
 * Admin support tickets — API types
 *
 * Dashboard: GET /admin/support-tickets/dashboard
 * List:      GET /admin/support-tickets
 * Messages:  GET /admin/support-tickets/{ticketKey}/messages
 * Pin:       POST /admin/support-tickets/pin/{ticketKey}
 * Assign:    POST /admin/support-tickets/assign/{ticketKey}
 * Assign:    POST /admin/support-tickets/assign/{ticketKey}
 * Close:     POST /admin/support-tickets/close/{ticketKey}
 * Store msg: POST /admin/support-tickets/{ticketKey}/messages/store
 */

export type AdminSupportDashboardTime =
  | "today"
  | "last_7_days"
  | "last_30_days";

export type AdminSupportTicketStatus =
  | "new"
  | "open"
  | "reopen"
  | "waiting_customer"
  | "waiting_general_support"
  | "waiting_platform_support"
  | "waiting_platform"
  | "resolved"
  | "closed"
  | string;

export type AdminSupportTicketPriority = "low" | "medium" | "high";

export type AdminSupportTicketSource = "customer" | "vendor" | string;

/** API sort values */
export type AdminSupportSort = "newest" | "oldest_first" | "oldest" | string;

export type AdminSupportTimeFilter =
  | "all"
  | "today"
  | "last_7_days"
  | "this_month"
  | "last_30_days";

export type AdminSupportQuickFilter =
  | "vendor_tickets"
  | "customer_tickets"
  | string;

export interface AdminSupportDashboardQueues {
  customer_tickets?: number;
  vendor_tickets?: number;
  closed?: number;
  waiting_for_your_reply?: number;
}

export interface AdminSupportDashboardLiveConversation {
  subject: string;
  ticket_id: string;
  contact_name: string;
  source: AdminSupportTicketSource;
  venue_name: string;
  venue_id: string;
  status: string;
  status_label?: string;
  reopened?: boolean;
  priority: AdminSupportTicketPriority | string;
  date: string;
}

export interface AdminSupportDashboardData {
  total_tickets: number;
  customer_tickets: number;
  vendor_tickets: number;
  open: number;
  queues: AdminSupportDashboardQueues;
  live_conversations: AdminSupportDashboardLiveConversation[];
  inbox_count?: number;
}

/** Preset uses `time`; custom range uses `from` + `to`. */
export interface AdminSupportDashboardParams {
  time?: AdminSupportDashboardTime;
  from?: string;
  to?: string;
}

export interface AdminSupportDashboardResponse {
  status: boolean;
  message: string;
  data: AdminSupportDashboardData;
  errors?: unknown[];
}

/* ─── Inbox list ─── */

export interface AdminSupportTicket {
  ticket_key: string;
  subject: string;
  status: AdminSupportTicketStatus;
  status_label: string;
  reopened?: boolean;
  priority: AdminSupportTicketPriority | string;
  category_label: string;
  last_message_at: string;
  last_sender_name: string;
  last_message_preview: string;
  is_unread: boolean;
  source: AdminSupportTicketSource;
  source_label?: string;
  direction?: string;
  direction_label?: string;
  venue_name: string | null;
  venue_id: string | number | null;
  vendor_location_id?: string | number | null;
  booking_number?: string | null;
  assignee_id: number | string | null;
  assignee_name: string | null;
  is_pinned: boolean;
}

export interface AdminSupportStaff {
  id: number | string;
  full_name: string;
}

export interface AdminSupportVenueOption {
  id: number | string;
  name: string;
  slug?: string;
}

export interface AdminSupportTicketsParams {
  sort?: AdminSupportSort;
  search?: string;
  status?: string;
  priority?: string;
  /** API: filter=vendor_tickets|customer_tickets */
  filter?: AdminSupportQuickFilter;
  /** Staff id */
  assign_to?: string;
  venue_id?: string;
  time?: AdminSupportTimeFilter;
  page?: number;
  per_page?: number;
}

export interface AdminSupportTicketsPaginationMeta {
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

export interface AdminSupportTicketsResponse {
  status: boolean;
  message: string;
  data: AdminSupportTicket[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: AdminSupportTicketsPaginationMeta;
  inbox_count: number;
  unread_count?: number;
  staff: AdminSupportStaff[];
  venues: AdminSupportVenueOption[];
}

/* ─── Pin ─── */

/** Payload for POST /admin/support-tickets/pin/{ticketKey} */
export interface PinAdminSupportTicketPayload {
  ticketKey: string;
  is_pinned: boolean;
}

export interface PinAdminSupportTicketResponse {
  status: boolean;
  message: string;
  data?: {
    ticket_key?: string;
    is_pinned?: boolean;
    [key: string]: unknown;
  };
  errors?: string[] | Record<string, string[]>;
}

/* ─── Assign ─── */

/** Payload for POST /admin/support-tickets/assign/{ticketKey} */
export interface AssignAdminSupportTicketPayload {
  ticketKey: string;
  /** Staff user id — `null` to unassign */
  staff_id: number | null;
}

export interface AssignAdminSupportTicketData {
  ticket_key?: string;
  assignee_id?: number | string | null;
  assignee_name?: string | null;
  assignee?: AdminSupportTicketAssignee | null;
  [key: string]: unknown;
}

export interface AssignAdminSupportTicketResponse {
  status: boolean;
  message: string;
  data?: AssignAdminSupportTicketData;
  errors?: string[] | Record<string, string[]>;
}

/* ─── Close ─── */

/** Payload for POST /admin/support-tickets/close/{ticketKey} */
export type AdminSupportClosedReason =
  | "issue_resolved"
  | "duplicate_ticket"
  | "customer_didnt_respond"
  | string;

export interface CloseAdminSupportTicketPayload {
  ticketKey: string;
  closed_reason: AdminSupportClosedReason;
}

export interface CloseAdminSupportTicketData {
  ticket_key?: string;
  status?: AdminSupportTicketStatus;
  closed_reason?: AdminSupportClosedReason;
  can_reply?: boolean;
  [key: string]: unknown;
}

export interface CloseAdminSupportTicketResponse {
  status: boolean;
  message: string;
  data?: CloseAdminSupportTicketData;
  errors?: string[] | Record<string, string[]>;
}

/* ─── Store message ─── */

/** Payload for POST /admin/support-tickets/{ticketKey}/messages/store */
export interface StoreAdminSupportMessagePayload {
  ticketKey: string;
  message: string;
  is_internal?: boolean;
  attachments?: File[];
}

export interface StoreAdminSupportMessageResponse {
  status: boolean;
  message: string;
  data?: unknown;
  errors?: string[] | Record<string, string[]>;
}

/* ─── Messages ─── */

export interface AdminSupportMessageAttachment {
  name: string;
  url: string;
  size: number;
  mime_type: string;
}

export interface AdminSupportMessageItem {
  id: number;
  message: string;
  is_system: boolean;
  is_internal: boolean;
  is_mine: boolean;
  sender_name: string;
  created_at: string;
  attachments: AdminSupportMessageAttachment[];
}

export interface AdminSupportMessageGroup {
  date: string;
  date_label: string;
  items: AdminSupportMessageItem[];
}

export interface AdminSupportTicketDetail {
  ticket_key: string;
  status: AdminSupportTicketStatus;
  status_label: string;
  reopened?: boolean;
  priority: AdminSupportTicketPriority | string;
  category_label: string;
  subject: string;
  source?: AdminSupportTicketSource;
  direction?: string;
  direction_label?: string;
  is_pinned?: boolean;
  venue_name?: string | null;
  venue_id?: string | number | null;
  booking?: {
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
  booking_number?: string | null;
}

export interface AdminSupportTicketCustomer {
  full_name: string;
  email: string;
  phone: string;
}

export interface AdminSupportTicketAssignee {
  id: number | string;
  full_name?: string;
  name?: string;
}

export interface AdminSupportRecentTicket {
  ticket_key: string;
  subject: string;
  status: AdminSupportTicketStatus;
  status_label: string;
  reopened?: boolean;
}

export interface AdminSupportMessagesParams {
  page?: number;
  per_page?: number;
}

/**
 * GET /admin/support-tickets/{ticketKey}/messages
 * Flat envelope:
 * - `data` = message groups only
 * - ticket / customer / assignee / staff / flags / recent_tickets = root siblings
 */
export interface AdminSupportMessagesResponse {
  status: boolean;
  message: string;
  data: AdminSupportMessageGroup[];
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta?: AdminSupportTicketsPaginationMeta;
  ticket?: AdminSupportTicketDetail;
  customer?: AdminSupportTicketCustomer;
  assignee?: AdminSupportTicketAssignee | null;
  staff?: AdminSupportStaff[];
  can_reply?: boolean;
  can_manage?: boolean;
  can_pin?: boolean;
  can_escalate?: boolean;
  recent_tickets?: AdminSupportRecentTicket[];
  errors?: string[] | Record<string, string[]>;
}

export interface MarkAdminSupportMessagesReadData {
  ticket_key: string;
  is_unread: boolean;
  unread_count: number;
}

export interface MarkAdminSupportMessagesReadResponse {
  status: boolean;
  message: string;
  data: MarkAdminSupportMessagesReadData;
  errors?: string[] | Record<string, string[]>;
}
