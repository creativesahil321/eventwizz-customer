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

export type VendorTicketDirection = "received" | "sent";

export interface VendorSupportMessage {
  id: string;
  sender: "customer" | "agent" | "admin" | "system";
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

export interface VendorSupportCustomer {
  name: string;
  email: string;
  phone: string;
  timezone: string;
  customerSince: string;
}

export interface VendorSupportConversation {
  id: string;
  ref: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  statusLabel?: string;
  /** True when the ticket was previously closed and reopened */
  reopened?: boolean;
  /** received = customer → vendor; sent = vendor → admin */
  direction: VendorTicketDirection;
  bookingRef?: string;
  bookingTitle?: string;
  bookingDate?: string;
  bookingLocation?: string;
  openedAt: string;
  closedAt?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastSenderName?: string;
  unreadCount: number;
  messages: VendorSupportMessage[];
  customer: VendorSupportCustomer;
  assignee: SupportAssignee | null;
  isPinned: boolean;
  needsAttention: boolean;
}

export type CloseTicketReason =
  | "issue_resolved"
  | "duplicate_ticket"
  | "customer_no_response";

export type TransferTicketReason = "technical_issue" | "other";

export type DashboardDateRange = "today" | "7d" | "30d";

export interface DashboardDateFilter {
  preset: DashboardDateRange;
  customRange?: {
    from: Date;
    to: Date;
  };
}

export interface VendorSupportStats {
  totalOpen: number;
  totalResolved: number;
  waiting: number;
}

export interface VendorSupportActivity {
  id: string;
  description: string;
  timestamp: string;
}
