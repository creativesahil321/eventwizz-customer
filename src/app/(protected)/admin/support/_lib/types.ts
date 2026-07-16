import type {
  SupportAttachment,
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from "@/app/(protected)/customer/support/_lib/types";

export type {
  SupportAttachment,
  SupportCategory,
  SupportPriority,
  SupportStatus,
};

export type SupportSource = "customer" | "vendor";

export type WaitingParty = "customer" | "vendor";

export type AdminSupportQueue =
  | "general_support"
  | "technical_support"
  | "customer"
  | "vendor";

export interface AdminSupportMessage {
  id: string;
  sender: "customer" | "vendor" | "agent" | "system";
  senderName: string;
  content: string;
  createdAt: string;
  attachments?: SupportAttachment[];
  isInternal?: boolean;
}

export interface SupportAssignee {
  id: string;
  name: string;
}

export interface AdminSupportVenue {
  id: string;
  name: string;
}

export interface AdminSupportContact {
  name: string;
  email: string;
  phone: string;
  timezone: string;
  customerSince: string;
  role?: string;
}

export interface AdminSupportConversation {
  id: string;
  ref: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  /** Optional display label from API (`status_label`) */
  statusLabel?: string;
  source: SupportSource;
  venue: AdminSupportVenue;
  bookingRef?: string;
  bookingTitle?: string;
  bookingDate?: string;
  bookingLocation?: string;
  openedAt: string;
  closedAt?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: AdminSupportMessage[];
  contact: AdminSupportContact;
  assignee: SupportAssignee | null;
  isPinned: boolean;
  needsAttention: boolean;
  waitingOn?: WaitingParty;
}

export type CloseTicketReason =
  | "issue_resolved"
  | "duplicate_ticket"
  | "customer_didnt_respond";

export type DashboardDateRange = "today" | "7d" | "30d";

export interface DashboardDateFilter {
  preset: DashboardDateRange;
  customRange?: {
    from: Date;
    to: Date;
  };
}

export interface AdminSupportStats {
  totalOpen: number;
  totalResolved: number;
  customerTickets: number;
  vendorTickets: number;
}

export interface AdminSupportQueueStats {
  queue: AdminSupportQueue;
  open: number;
}

export interface AdminSupportActivity {
  id: string;
  description: string;
  timestamp: string;
}
