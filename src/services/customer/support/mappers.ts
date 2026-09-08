/**
 * Maps customer support API DTOs → UI conversation models
 */

import type {
  SupportAttachment,
  SupportCategory,
  SupportConversation,
  SupportMessage,
} from "@/app/(protected)/customer/support/_lib/types";
import { mapSupportTicketStatus } from "@/app/(protected)/customer/support/_lib/utils";
import type {
  CustomerSupportMessageGroup,
  CustomerSupportMessageItem,
  CustomerSupportMessagesResponse,
  CustomerSupportRecentTicket,
  CustomerSupportTicket,
  CustomerSupportTicketCustomer,
  CustomerSupportTicketDetail,
} from "./type";

export function mapCategoryLabel(label: string): SupportCategory {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes("technical")) return "technical_support";
  return "general_support";
}

export function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapCustomerSupportTicketToConversation(
  ticket: CustomerSupportTicket
): SupportConversation {
  const { status, statusLabel, reopened } = mapSupportTicketStatus(
    ticket.status,
    ticket.status_label,
    ticket.reopened
  );

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    category: mapCategoryLabel(ticket.category_label),
    priority: ticket.priority,
    status,
    statusLabel,
    reopened,
    openedAt: ticket.last_message_at,
    lastMessage: ticket.last_message_preview,
    lastMessageAt: ticket.last_message_at,
    lastSenderName: ticket.last_sender_name,
    unreadCount: ticket.is_unread ? 1 : 0,
    messages: [],
  };
}

function mapMessageItem(item: CustomerSupportMessageItem): SupportMessage {
  const sender: SupportMessage["sender"] = item.is_system
    ? "system"
    : item.is_mine
      ? "customer"
      : "agent";

  const attachments: SupportAttachment[] | undefined =
    item.attachments?.length > 0
      ? item.attachments.map((file) => ({
          name: file.name,
          size: formatAttachmentSize(file.size),
          url: file.url,
          mimeType: file.mime_type,
        }))
      : undefined;

  return {
    id: String(item.id),
    sender,
    // Own messages use WhatsApp-style "You" instead of the account name
    senderName: item.is_mine
      ? item.sender_name?.trim() || "You"
      : item.sender_name,
    content: item.message,
    createdAt: item.created_at,
    attachments,
  };
}

export function flattenCustomerSupportMessages(
  groups: CustomerSupportMessageGroup[] | null | undefined | unknown
): SupportMessage[] {
  const list = Array.isArray(groups) ? groups : [];

  return list.flatMap((group) => {
    const items = Array.isArray(group?.items) ? group.items : [];
    return items.map(mapMessageItem);
  });
}

/** Resolve messages payload from GET .../messages (nested under `data` or root-level). */
export function getCustomerMessagesPayload(
  response: CustomerSupportMessagesResponse | null | undefined
) {
  const root = response?.data;

  if (Array.isArray(root)) {
    return {
      messages: root,
      ticket: response?.ticket,
      customer: response?.customer,
      recent_tickets: response?.recent_tickets ?? [],
      meta: response?.meta,
    };
  }

  if (root && typeof root === "object") {
    return {
      messages: Array.isArray(root.messages) ? root.messages : [],
      ticket: root.ticket ?? response?.ticket,
      customer: root.customer ?? response?.customer,
      recent_tickets: root.recent_tickets ?? response?.recent_tickets ?? [],
      meta: root.meta ?? response?.meta,
    };
  }

  return {
    messages: [] as CustomerSupportMessageGroup[],
    ticket: response?.ticket,
    customer: response?.customer,
    recent_tickets: response?.recent_tickets ?? [],
    meta: response?.meta,
  };
}

export function mapTicketDetailToConversation(
  ticket: CustomerSupportTicketDetail,
  messages: SupportMessage[] = []
): SupportConversation {
  const booking = ticket.booking;
  const bookingRef =
    (typeof booking?.booking_number === "string" && booking.booking_number) ||
    (booking?.booking_id != null ? String(booking.booking_id) : undefined) ||
    (booking?.id != null ? String(booking.id) : undefined);
  const bookingTitle =
    (typeof booking?.event_name === "string" && booking.event_name) ||
    (typeof booking?.title === "string" && booking.title) ||
    undefined;

  const lastMessage = messages[messages.length - 1];
  const { status, statusLabel, reopened } = mapSupportTicketStatus(
    ticket.status,
    ticket.status_label,
    ticket.reopened
  );

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    category: mapCategoryLabel(ticket.category_label),
    priority: ticket.priority,
    status,
    statusLabel,
    reopened,
    bookingRef,
    bookingTitle,
    openedAt: lastMessage?.createdAt ?? new Date().toISOString(),
    lastMessage: lastMessage?.content ?? "",
    lastMessageAt: lastMessage?.createdAt ?? new Date().toISOString(),
    lastSenderName: lastMessage?.senderName,
    unreadCount: 0,
    messages,
  };
}

export function mapRecentTicketToConversation(
  ticket: CustomerSupportRecentTicket
): Pick<
  SupportConversation,
  "id" | "ref" | "subject" | "status" | "statusLabel" | "reopened"
> {
  const { status, statusLabel, reopened } = mapSupportTicketStatus(
    ticket.status,
    ticket.status_label,
    ticket.reopened
  );

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    status,
    statusLabel,
    reopened,
  };
}
