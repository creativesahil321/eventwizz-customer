export type SupportPriority = "low" | "medium" | "high";

export type SupportStatus =
  | "new"
  | "open"
  | "reopen"
  | "waiting_customer"
  | "waiting_general_support"
  | "waiting_platform_support"
  | "resolved"
  | "closed";

export type SupportCategory = "general_support" | "technical_support";

export interface SupportAttachment {
  name: string;
  size: string;
  url?: string;
  mimeType?: string;
}

export interface SupportMessage {
  id: string;
  sender: "customer" | "agent" | "system";
  senderName: string;
  content: string;
  createdAt: string;
  attachments?: SupportAttachment[];
}

export interface SupportConversation {
  id: string;
  ref: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  /** Optional display label from API (`status_label`) */
  statusLabel?: string;
  /** True when status is open and the ticket was previously closed */
  reopened?: boolean;
  bookingRef?: string;
  bookingTitle?: string;
  openedAt: string;
  closedAt?: string;
  lastMessage: string;
  lastMessageAt: string;
  /** Display name of the last message sender (from list API) */
  lastSenderName?: string;
  unreadCount: number;
  messages: SupportMessage[];
}
