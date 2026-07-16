/**
 * Vendor support tickets — API types
 *
 * Dashboard: GET /vendor/support-tickets/dashboard
 * List:      GET /vendor/support-tickets
 */

export type VendorSupportTicketStatus =
  | "new"
  | "open"
  | "reopen"
  | "waiting_customer"
  | "waiting_general_support"
  | "waiting_platform_support"
  | "resolved"
  | "closed"
  | string;

export type VendorSupportTicketPriority = "low" | "medium" | "high";

/** API direction values */
export type VendorSupportApiDirection = "customer" | "admin" | "all";

export type VendorSupportSort = "newest" | "oldest";

export type VendorSupportTimeFilter =
  | "all"
  | "today"
  | "last_7_days"
  | "last_30_days";

export type VendorSupportQuickFilter =
  | "closed_only"
  | "high_priority_only"
  | "admin_tickets_only"
  | "unassigned_only";

/* ─── Dashboard ─── */

export interface VendorSupportDashboardNeedsAttentionItem {
  customer_name: string;
  subject: string;
  ticket_id: string;
  status: VendorSupportTicketStatus;
  status_label?: string | null;
  priority: VendorSupportTicketPriority;
  date: string;
}

export interface VendorSupportDashboardActivityItem {
  subject: string;
  datetime: string;
}

export type VendorSupportDashboardTime =
  | "today"
  | "last_7_days"
  | "last_30_days";

export interface VendorSupportDashboardData {
  total_open: number;
  total_resolved: number;
  waiting: number;
  needs_attention: VendorSupportDashboardNeedsAttentionItem[];
  recent_activity: VendorSupportDashboardActivityItem[];
  inbox_count?: number;
}

/** Preset uses `time`; custom range uses `from` + `to`. */
export interface VendorSupportDashboardParams {
  time?: VendorSupportDashboardTime;
  from?: string;
  to?: string;
}

export interface VendorSupportDashboardResponse {
  status: boolean;
  message: string;
  data: VendorSupportDashboardData;
  errors: unknown[];
}

/* ─── Inbox list ─── */

export interface VendorSupportTicket {
  ticket_key: string;
  subject: string;
  status: VendorSupportTicketStatus;
  status_label: string;
  priority: VendorSupportTicketPriority;
  category_label: string;
  last_message_at: string;
  last_sender_name: string;
  last_message_preview: string;
  is_unread: boolean;
  /** API: "customer" | "admin" (may also send received/sent) */
  direction: VendorSupportApiDirection | string;
  direction_label: string;
  assignee_id: number | string | null;
  assignee_name: string | null;
  is_pinned: boolean;
}

export interface VendorSupportStaff {
  id: number | string;
  full_name: string;
}

export interface VendorSupportTicketsParams {
  sort?: VendorSupportSort;
  search?: string;
  status?: VendorSupportTicketStatus;
  priority?: VendorSupportTicketPriority;
  /** API direction: all | customer | admin */
  direction?: VendorSupportApiDirection;
  /** Staff id (`assignee` / `assign_to`) */
  assignee?: string;
  assign_to?: string;
  time?: VendorSupportTimeFilter;
  /** Comma-joined quick filters */
  filter?: VendorSupportQuickFilter[];
  page?: number;
  per_page?: number;
}

export interface VendorSupportTicketsPaginationMeta {
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

export interface VendorSupportTicketsResponse {
  status: boolean;
  message: string;
  data: VendorSupportTicket[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: VendorSupportTicketsPaginationMeta;
  inbox_count: number;
  staff: VendorSupportStaff[];
}

/** Response for POST /vendor/support-tickets/{ticketKey}/messages/read */
export interface MarkVendorSupportMessagesReadData {
  ticket_key: string;
  is_unread: boolean;
  unread_count: number;
}

export interface MarkVendorSupportMessagesReadResponse {
  status: boolean;
  message: string;
  data: MarkVendorSupportMessagesReadData;
  errors?: string[] | Record<string, string[]>;
}

/** Payload for POST /vendor/support-tickets/pin/{ticketKey} */
export interface PinVendorSupportTicketPayload {
  ticketKey: string;
  is_pinned: boolean;
}

export interface PinVendorSupportTicketResponse {
  status: boolean;
  message: string;
  data?: {
    ticket_key?: string;
    is_pinned?: boolean;
    [key: string]: unknown;
  };
  errors?: string[] | Record<string, string[]>;
}

/** Response for POST /vendor/support-tickets/escalate/{ticketKey} */
export interface EscalateVendorSupportTicketData {
  ticket_key: string;
  queue_owner: string;
  category: string;
  status: VendorSupportTicketStatus;
  status_label?: string;
  can_reply: boolean;
}

export interface EscalateVendorSupportTicketResponse {
  status: boolean;
  message: string;
  data: EscalateVendorSupportTicketData;
  errors?: string[] | Record<string, string[]>;
}

/** Payload for POST /vendor/support-tickets/close/{ticketKey} */
export type VendorSupportClosedReason =
  | "issue_resolved"
  | "duplicate_ticket"
  | "customer_no_response"
  | string;

export interface CloseVendorSupportTicketPayload {
  ticketKey: string;
  closed_reason: VendorSupportClosedReason;
}

export interface CloseVendorSupportTicketData {
  ticket_key?: string;
  status?: VendorSupportTicketStatus;
  can_reply?: boolean;
  [key: string]: unknown;
}

export interface CloseVendorSupportTicketResponse {
  status: boolean;
  message: string;
  data?: CloseVendorSupportTicketData;
  errors?: string[] | Record<string, string[]>;
}

/** Payload for POST /vendor/support-tickets/assign/{ticketKey} */
export interface AssignVendorSupportTicketPayload {
  ticketKey: string;
  /** Staff user id — `null` to unassign */
  staff_id: number | null;
}

export interface AssignVendorSupportTicketData {
  ticket_key?: string;
  assignee_id?: number | string | null;
  assignee_name?: string | null;
  assignee?: VendorSupportTicketAssignee | null;
  [key: string]: unknown;
}

export interface AssignVendorSupportTicketResponse {
  status: boolean;
  message: string;
  data?: AssignVendorSupportTicketData;
  errors?: string[] | Record<string, string[]>;
}

/** Payload for POST /vendor/support-tickets/store */
export interface CreateVendorSupportTicketPayload {
  subject: string;
  contact_number: string;
  priority: VendorSupportTicketPriority;
  description: string;
  attachments?: File[];
}

export interface CreateVendorSupportTicketResponse {
  status: boolean;
  message: string;
  data?: {
    ticket_key?: string;
    [key: string]: unknown;
  };
  errors?: string[] | Record<string, string[]>;
}

/** Payload for POST /vendor/support-tickets/{ticketKey}/messages/store */
export interface StoreVendorSupportMessagePayload {
  ticketKey: string;
  message: string;
  is_internal?: boolean;
  attachments?: File[];
}

export interface StoreVendorSupportMessageResponse {
  status: boolean;
  message: string;
  data?: unknown;
  errors?: string[] | Record<string, string[]>;
}

/* ─── Messages ─── */

export interface VendorSupportMessageAttachment {
  name: string;
  url: string;
  size: number;
  mime_type: string;
}

export interface VendorSupportMessageItem {
  id: number;
  message: string;
  is_system: boolean;
  is_internal: boolean;
  is_mine: boolean;
  sender_name: string;
  created_at: string;
  attachments: VendorSupportMessageAttachment[];
}

export interface VendorSupportMessageGroup {
  date: string;
  date_label: string;
  items: VendorSupportMessageItem[];
}

export interface VendorSupportTicketDetail {
  ticket_key: string;
  status: VendorSupportTicketStatus;
  status_label: string;
  priority: VendorSupportTicketPriority;
  category_label: string;
  subject: string;
  direction?: VendorSupportApiDirection | string;
  direction_label?: string;
  is_pinned?: boolean;
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

export interface VendorSupportTicketCustomer {
  full_name: string;
  email: string;
  phone: string;
}

export interface VendorSupportTicketAssignee {
  id: number | string;
  full_name?: string;
  name?: string;
}

export interface VendorSupportRecentTicket {
  ticket_key: string;
  subject: string;
  status: VendorSupportTicketStatus;
  status_label: string;
}

export interface VendorSupportMessagesParams {
  page?: number;
  per_page?: number;
}

/**
 * GET /vendor/support-tickets/{ticketKey}/messages
 * Flat envelope (same pattern as customer chat):
 * - `data` = message groups only
 * - ticket / customer / assignee / staff / flags / recent_tickets = root siblings
 */
export interface VendorSupportMessagesResponse {
  status: boolean;
  message: string;
  data: VendorSupportMessageGroup[];
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta?: VendorSupportTicketsPaginationMeta;
  ticket?: VendorSupportTicketDetail;
  customer?: VendorSupportTicketCustomer;
  assignee?: VendorSupportTicketAssignee | null;
  staff?: VendorSupportStaff[];
  can_reply?: boolean;
  can_manage?: boolean;
  can_pin?: boolean;
  recent_tickets?: VendorSupportRecentTicket[];
  errors?: string[] | Record<string, string[]>;
}
