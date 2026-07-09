export type SupportPriority = "low" | "medium" | "high";

export type SupportStatus = "new" | "reopen" | "resolved" | "closed";

export type SupportCategory = "general_support" | "technical_support";

export interface SupportAttachment {
  name: string;
  size: string;
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
  bookingRef?: string;
  bookingTitle?: string;
  openedAt: string;
  closedAt?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: SupportMessage[];
}

export interface SupportStats {
  openConversations: number;
  openChangeSinceLastWeek: number;
  resolvedLast30Days: number;
  closedAllTime: number;
  unreadReplies: number;
}

export interface SupportActivity {
  id: string;
  description: string;
  timestamp: string;
}

export interface SupportBookingLocation {
  id: string;
  name: string;
}

export interface SupportBookingOption {
  ref: string;
  label: string;
  locationId: string;
}

export interface SupportBookingDetail {
  title: string;
  date: string;
  price: string;
}

export interface SupportCustomerProfile {
  name: string;
  email: string;
  phone: string;
  timezone: string;
  customerSince: string;
}
