/**
 * Maps admin support API DTOs → UI models
 */

import { normalizeSupportStatus } from "@/app/(protected)/customer/support/_lib/utils";
import {
  formatAttachmentSize,
  mapCategoryLabel,
} from "@/services/customer/support";
import { getStatusLabel } from "@/app/(protected)/admin/support/_lib/utils";
import type {
  AdminSupportConversation,
  AdminSupportMessage,
  AdminSupportQueueStats,
  AdminSupportStats,
  AdminSupportVenue,
  SupportAssignee,
  SupportAttachment,
  SupportPriority,
  SupportSource,
} from "@/app/(protected)/admin/support/_lib/types";
import type {
  AdminSupportDashboardData,
  AdminSupportDashboardLiveConversation,
  AdminSupportDashboardQueues,
  AdminSupportMessageGroup,
  AdminSupportMessageItem,
  AdminSupportMessagesResponse,
  AdminSupportRecentTicket,
  AdminSupportStaff,
  AdminSupportTicket,
  AdminSupportTicketAssignee,
  AdminSupportTicketCustomer,
  AdminSupportTicketDetail,
  AdminSupportVenueOption,
} from "./type";

export interface AdminSupportLiveConversationItem {
  id: string;
  ref: string;
  subject: string;
  contactName: string;
  source: SupportSource;
  venue: { id: string; name: string };
  status: ReturnType<typeof normalizeSupportStatus>;
  statusLabel: string;
  priority: SupportPriority;
  lastMessageAt: string;
}

const EMPTY_CONTACT = {
  name: "Unknown",
  email: "",
  phone: "",
  timezone: "",
  customerSince: "",
} as const;

function mapSource(source: string | undefined): SupportSource {
  return source === "vendor" ? "vendor" : "customer";
}

function mapPriority(priority: string | undefined): SupportPriority {
  if (priority === "low" || priority === "medium" || priority === "high") {
    return priority;
  }
  return "medium";
}

/** Derive source from ticket detail (`source` or `direction_label`). */
export function mapAdminSourceFromTicket(
  ticket: Pick<AdminSupportTicketDetail, "source" | "direction_label">,
  fallback?: SupportSource
): SupportSource {
  if (ticket.source === "vendor" || ticket.source === "customer") {
    return ticket.source;
  }
  const label = ticket.direction_label?.toLowerCase() ?? "";
  if (label.includes("vendor")) return "vendor";
  if (label.includes("customer")) return "customer";
  return fallback ?? "customer";
}

export function mapAdminSupportDashboardStats(
  data: AdminSupportDashboardData
): AdminSupportStats {
  return {
    totalOpen: data.total_open ?? 0,
    totalResolved: data.total_resolved ?? 0,
    customerTickets: data.customer_open ?? 0,
    vendorTickets: data.vendor_open ?? 0,
  };
}

export function mapAdminSupportQueueStats(
  queues: AdminSupportDashboardQueues | null | undefined
): AdminSupportQueueStats[] {
  return [
    {
      queue: "general_support",
      open: queues?.general_support ?? 0,
    },
    {
      queue: "customer",
      open: queues?.customer_tickets ?? 0,
    },
    {
      queue: "vendor",
      open: queues?.vendor_tickets ?? 0,
    },
  ];
}

export function mapAdminSupportLiveConversations(
  items: AdminSupportDashboardLiveConversation[] | null | undefined
): AdminSupportLiveConversationItem[] {
  return (items ?? []).map((item) => {
    const status = normalizeSupportStatus(item.status);
    return {
      id: item.ticket_id,
      ref: item.ticket_id,
      subject: item.subject,
      contactName: item.contact_name?.trim() || "Unknown",
      source: mapSource(item.source),
      venue: {
        id: item.venue_id || "",
        name: item.venue_name?.trim() || "Unknown venue",
      },
      status,
      statusLabel: getStatusLabel(status),
      priority: mapPriority(item.priority),
      lastMessageAt: item.date,
    };
  });
}

export function mapAdminSupportStaff(
  staff: AdminSupportStaff[] | null | undefined
): SupportAssignee[] {
  return (staff ?? [])
    .map((person) => {
      const name = person.full_name?.trim();
      if (!name || person.id == null) return null;
      return { id: String(person.id), name };
    })
    .filter((person): person is SupportAssignee => Boolean(person));
}

export function mapAdminSupportVenues(
  venues: AdminSupportVenueOption[] | null | undefined
): AdminSupportVenue[] {
  return (venues ?? [])
    .map((venue) => {
      const name = venue.name?.trim();
      if (!name || venue.id == null) return null;
      return { id: String(venue.id), name };
    })
    .filter((venue): venue is AdminSupportVenue => Boolean(venue));
}

export function mapAdminSupportAssignee(
  assignee: AdminSupportTicketAssignee | null | undefined
): SupportAssignee | null {
  if (!assignee || assignee.id == null) return null;
  const name = assignee.full_name?.trim() || assignee.name?.trim();
  if (!name) return null;
  return { id: String(assignee.id), name };
}

export function mapAdminCustomerToContact(
  customer: AdminSupportTicketCustomer | null | undefined
): AdminSupportConversation["contact"] {
  if (!customer) return { ...EMPTY_CONTACT };
  return {
    ...EMPTY_CONTACT,
    name: customer.full_name?.trim() || "Unknown",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
  };
}

export function mapAdminSupportTicketToConversation(
  ticket: AdminSupportTicket
): AdminSupportConversation {
  const status = normalizeSupportStatus(ticket.status);
  const contactName = ticket.last_sender_name?.trim() || "Unknown";
  const venueName = ticket.venue_name?.trim() || "";
  const venueId =
    ticket.venue_id != null && String(ticket.venue_id).trim()
      ? String(ticket.venue_id)
      : "";

  const assignee =
    ticket.assignee_id != null && ticket.assignee_name?.trim()
      ? {
          id: String(ticket.assignee_id),
          name: ticket.assignee_name.trim(),
        }
      : null;

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    category: mapCategoryLabel(ticket.category_label ?? ""),
    priority: mapPriority(
      typeof ticket.priority === "string" ? ticket.priority : undefined
    ),
    status,
    statusLabel: ticket.status_label?.trim() || getStatusLabel(status),
    source: mapSource(ticket.source),
    venue: {
      id: venueId,
      name: venueName || "—",
    },
    bookingRef: ticket.booking_number?.trim() || undefined,
    openedAt: ticket.last_message_at,
    lastMessage: ticket.last_message_preview ?? "",
    lastMessageAt: ticket.last_message_at,
    unreadCount: ticket.is_unread ? 1 : 0,
    messages: [],
    contact: {
      ...EMPTY_CONTACT,
      name: contactName,
    },
    assignee,
    isPinned: Boolean(ticket.is_pinned),
    needsAttention: false,
  };
}

function mapAdminMessageItem(
  item: AdminSupportMessageItem,
  source: SupportSource
): AdminSupportMessage {
  let sender: AdminSupportMessage["sender"] = "customer";

  if (item.is_system) {
    sender = "system";
  } else if (item.is_internal || item.is_mine) {
    sender = "agent";
  } else if (source === "vendor") {
    sender = "vendor";
  } else if (/\(vendor\)/i.test(item.sender_name ?? "")) {
    sender = "vendor";
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

export function flattenAdminSupportMessages(
  groups: AdminSupportMessageGroup[] | null | undefined | unknown,
  source: SupportSource = "customer"
): AdminSupportMessage[] {
  const list = (
    Array.isArray(groups) ? groups : []
  ) as AdminSupportMessageGroup[];

  return list.flatMap((group) => {
    const items = Array.isArray(group.items) ? group.items : [];
    return items.map((item) => mapAdminMessageItem(item, source));
  });
}

/**
 * Resolve messages payload from GET .../messages.
 * Flat envelope: `data` = groups; ticket / flags / sidebar live as root siblings.
 */
export function getAdminMessagesPayload(
  response: AdminSupportMessagesResponse | null | undefined
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

export function mapAdminTicketDetailToConversation(
  ticket: AdminSupportTicketDetail,
  messages: AdminSupportMessage[] = [],
  customer?: AdminSupportTicketCustomer | null,
  assignee?: AdminSupportTicketAssignee | null,
  fallback?: Partial<AdminSupportConversation>
): AdminSupportConversation {
  const booking = ticket.booking;
  const bookingRef =
    (typeof booking?.booking_number === "string" && booking.booking_number) ||
    ticket.booking_number?.trim() ||
    (booking?.booking_id != null ? String(booking.booking_id) : undefined) ||
    (booking?.id != null ? String(booking.id) : undefined) ||
    fallback?.bookingRef;
  const bookingTitle =
    (typeof booking?.event_name === "string" && booking.event_name) ||
    (typeof booking?.title === "string" && booking.title) ||
    fallback?.bookingTitle;
  const bookingDate =
    (typeof booking?.event_date === "string" && booking.event_date) ||
    (typeof booking?.date === "string" && booking.date) ||
    fallback?.bookingDate;
  const bookingLocation =
    typeof booking?.location_name === "string" && booking.location_name.trim()
      ? booking.location_name.trim()
      : fallback?.bookingLocation;

  const lastMessage = messages[messages.length - 1];
  const source = mapAdminSourceFromTicket(ticket, fallback?.source);
  const status = normalizeSupportStatus(ticket.status);

  const venueId =
    ticket.venue_id != null && String(ticket.venue_id).trim()
      ? String(ticket.venue_id)
      : fallback?.venue?.id ?? "";
  const venueName =
    ticket.venue_name?.trim() || fallback?.venue?.name || "—";

  return {
    id: ticket.ticket_key,
    ref: ticket.ticket_key,
    subject: ticket.subject,
    category: mapCategoryLabel(ticket.category_label ?? ""),
    priority: mapPriority(
      typeof ticket.priority === "string" ? ticket.priority : undefined
    ),
    status,
    statusLabel: ticket.status_label?.trim() || getStatusLabel(status),
    source,
    venue: {
      id: venueId,
      name: venueName,
    },
    bookingRef,
    bookingTitle,
    bookingDate,
    bookingLocation,
    openedAt: lastMessage?.createdAt ?? fallback?.openedAt ?? new Date().toISOString(),
    lastMessage: lastMessage?.content ?? fallback?.lastMessage ?? "",
    lastMessageAt:
      lastMessage?.createdAt ??
      fallback?.lastMessageAt ??
      new Date().toISOString(),
    unreadCount: 0,
    messages,
    contact: customer
      ? mapAdminCustomerToContact(customer)
      : fallback?.contact ?? { ...EMPTY_CONTACT },
    assignee: mapAdminSupportAssignee(assignee) ?? fallback?.assignee ?? null,
    isPinned: Boolean(ticket.is_pinned ?? fallback?.isPinned),
    needsAttention: false,
  };
}

export function mapAdminRecentTicketToConversation(
  ticket: AdminSupportRecentTicket
): Pick<
  AdminSupportConversation,
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
