/**
 * Maps vendor support API DTOs → UI models
 */

import { normalizeSupportStatus } from "@/app/(protected)/customer/support/_lib/utils";
import {
  formatAttachmentSize,
  mapCategoryLabel,
} from "@/services/customer/support";
import type {
  SupportAssignee,
  SupportAttachment,
  SupportPriority,
  VendorSupportActivity,
  VendorSupportConversation,
  VendorSupportCustomer,
  VendorSupportMessage,
  VendorSupportStats,
  VendorTicketDirection,
} from "@/app/(protected)/vendor/support/_lib/types";
import type {
  VendorSupportDashboardActivityItem,
  VendorSupportDashboardData,
  VendorSupportDashboardNeedsAttentionItem,
  VendorSupportMessageGroup,
  VendorSupportMessageItem,
  VendorSupportMessagesResponse,
  VendorSupportRecentTicket,
  VendorSupportStaff,
  VendorSupportTicket,
  VendorSupportTicketAssignee,
  VendorSupportTicketCustomer,
  VendorSupportTicketDetail,
} from "./type";

export interface VendorSupportNeedsAttentionItem {
  id: string;
  ref: string;
  subject: string;
  customerName: string;
  status: VendorSupportConversation["status"];
  priority: SupportPriority;
  date: string;
}

const EMPTY_CUSTOMER: VendorSupportCustomer = {
  name: "",
  email: "",
  phone: "",
  timezone: "",
  customerSince: "",
};

export function mapVendorTicketDirection(
  direction: string
): VendorTicketDirection {
  const value = direction.trim().toLowerCase();
  if (value === "admin" || value === "sent") return "sent";
  if (value.includes("admin")) return "sent";
  return "received";
}

export function mapVendorDirectionFromTicket(
  ticket: Pick<VendorSupportTicketDetail, "direction" | "direction_label">
): VendorTicketDirection {
  if (ticket.direction) return mapVendorTicketDirection(String(ticket.direction));
  if (ticket.direction_label) {
    return mapVendorTicketDirection(ticket.direction_label);
  }
  return "received";
}

export function toVendorApiDirection(
  direction: VendorTicketDirection
): "customer" | "admin" {
  return direction === "sent" ? "admin" : "customer";
}

export function mapVendorSupportStaff(
  staff: VendorSupportStaff[]
): SupportAssignee[] {
  return (staff ?? []).map((member) => ({
    id: String(member.id),
    name: member.full_name,
  }));
}

export function mapVendorSupportAssignee(
  assignee: VendorSupportTicketAssignee | null | undefined
): SupportAssignee | null {
  if (!assignee?.id) return null;
  const name = assignee.full_name?.trim() || assignee.name?.trim();
  if (!name) return null;
  return { id: String(assignee.id), name };
}

export function mapVendorSupportDashboardStats(
  data: VendorSupportDashboardData
): VendorSupportStats {
  return {
    totalOpen: data.total_open ?? 0,
    totalResolved: data.total_resolved ?? 0,
    waiting: data.waiting ?? 0,
  };
}

export function mapVendorSupportNeedsAttention(
  items: VendorSupportDashboardNeedsAttentionItem[]
): VendorSupportNeedsAttentionItem[] {
  return (items ?? []).map((item) => ({
    id: item.ticket_id,
    ref: item.ticket_id,
    subject: item.subject,
    customerName: item.customer_name,
    status: normalizeSupportStatus(item.status),
    priority: (["low", "medium", "high"].includes(item.priority)
      ? item.priority
      : "medium") as SupportPriority,
    date: item.date,
  }));
}

export function mapVendorSupportRecentActivity(
  items: VendorSupportDashboardActivityItem[]
): VendorSupportActivity[] {
  return (items ?? []).map((item, index) => ({
    id: `${item.subject}-${item.datetime}-${index}`,
    description: item.subject,
    timestamp: item.datetime,
  }));
}

export function mapVendorSupportTicketToConversation(
  ticket: VendorSupportTicket
): VendorSupportConversation {
  const assignee =
    ticket.assignee_id != null && ticket.assignee_name
      ? {
          id: String(ticket.assignee_id),
          name: ticket.assignee_name,
        }
      : null;

  const lastSender = ticket.last_sender_name?.trim() || "Unknown";

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    category: mapCategoryLabel(ticket.category_label ?? ""),
    priority: (["low", "medium", "high"].includes(ticket.priority)
      ? ticket.priority
      : "medium") as SupportPriority,
    status: normalizeSupportStatus(ticket.status),
    statusLabel: ticket.status_label,
    direction: mapVendorTicketDirection(ticket.direction),
    openedAt: ticket.last_message_at,
    lastMessage: ticket.last_message_preview,
    lastMessageAt: ticket.last_message_at,
    lastSenderName: lastSender,
    unreadCount: ticket.is_unread ? 1 : 0,
    messages: [],
    customer: {
      ...EMPTY_CUSTOMER,
      name: lastSender,
    },
    assignee,
    isPinned: Boolean(ticket.is_pinned),
    needsAttention: false,
  };
}

function mapVendorMessageItem(
  item: VendorSupportMessageItem,
  direction: VendorTicketDirection
): VendorSupportMessage {
  let sender: VendorSupportMessage["sender"] = "customer";

  if (item.is_system) {
    sender = "system";
  } else if (item.is_internal || item.is_mine) {
    sender = "agent";
  } else if (direction === "sent") {
    sender = "admin";
  } else {
    sender = "customer";
  }

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
    senderName: item.is_mine
      ? item.sender_name?.trim() || "You"
      : item.sender_name,
    content: item.message,
    createdAt: item.created_at,
    attachments,
    isInternal: Boolean(item.is_internal),
  };
}

export function flattenVendorSupportMessages(
  groups: VendorSupportMessageGroup[] | null | undefined | unknown,
  direction: VendorTicketDirection = "received"
): VendorSupportMessage[] {
  const list = (Array.isArray(groups) ? groups : []) as VendorSupportMessageGroup[];

  return list.flatMap((group) => {
    const items = Array.isArray(group.items) ? group.items : [];
    return items.map((item) => mapVendorMessageItem(item, direction));
  });
}

/**
 * Resolve messages payload from GET .../messages.
 * Flat envelope: `data` = groups; ticket / flags / sidebar live as root siblings.
 */
export function getVendorMessagesPayload(
  response: VendorSupportMessagesResponse | null | undefined
) {
  const hasAssignee =
    response != null &&
    Object.prototype.hasOwnProperty.call(response, "assignee");

  return {
    messages: Array.isArray(response?.data) ? response.data : [],
    ticket: response?.ticket,
    customer: response?.customer,
    /** `undefined` = field omitted; `null` = explicitly unassigned */
    assignee: hasAssignee ? (response?.assignee ?? null) : undefined,
    staff: response?.staff ?? [],
    can_reply: response?.can_reply,
    can_manage: response?.can_manage,
    can_pin: response?.can_pin,
    recent_tickets: response?.recent_tickets ?? [],
    meta: response?.meta,
  };
}

export function mapVendorCustomerToUi(
  customer: VendorSupportTicketCustomer | null | undefined
): VendorSupportCustomer {
  if (!customer) return { ...EMPTY_CUSTOMER };
  return {
    name: customer.full_name?.trim() || "Unknown",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    timezone: "",
    customerSince: "",
  };
}

export function mapVendorTicketDetailToConversation(
  ticket: VendorSupportTicketDetail,
  messages: VendorSupportMessage[] = [],
  customer?: VendorSupportTicketCustomer | null,
  assignee?: VendorSupportTicketAssignee | null
): VendorSupportConversation {
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
  const direction = mapVendorDirectionFromTicket(ticket);

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    category: mapCategoryLabel(ticket.category_label ?? ""),
    priority: (["low", "medium", "high"].includes(ticket.priority)
      ? ticket.priority
      : "medium") as SupportPriority,
    status: normalizeSupportStatus(ticket.status),
    statusLabel: ticket.status_label,
    direction,
    bookingRef,
    bookingTitle,
    openedAt: lastMessage?.createdAt ?? new Date().toISOString(),
    lastMessage: lastMessage?.content ?? "",
    lastMessageAt: lastMessage?.createdAt ?? new Date().toISOString(),
    lastSenderName: lastMessage?.senderName,
    unreadCount: 0,
    messages,
    customer: mapVendorCustomerToUi(customer),
    assignee: mapVendorSupportAssignee(assignee),
    isPinned: Boolean(ticket.is_pinned),
    needsAttention: false,
  };
}

export function mapVendorRecentTicketToConversation(
  ticket: VendorSupportRecentTicket
): Pick<
  VendorSupportConversation,
  "id" | "ref" | "subject" | "status" | "statusLabel"
> {
  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    status: normalizeSupportStatus(ticket.status),
    statusLabel: ticket.status_label,
  };
}
