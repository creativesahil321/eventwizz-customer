import type {
  SupportActivity,
  SupportBookingDetail,
  SupportBookingLocation,
  SupportBookingOption,
  SupportConversation,
  SupportCustomerProfile,
  SupportStats,
} from "./types";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

export const SUPPORT_STATS: SupportStats = {
  openConversations: 3,
  openChangeSinceLastWeek: 1,
  resolvedLast30Days: 12,
  closedAllTime: 41,
  unreadReplies: 2,
};

export const SUPPORT_CUSTOMER: SupportCustomerProfile = {
  name: "Amelia Rodrigues",
  email: "amelia.rodrigues@email.com",
  phone: "+44 7700 900123",
  timezone: "Europe/London (GMT+1)",
  customerSince: "March 2023",
};

export const SUPPORT_BOOKING_LOCATIONS: SupportBookingLocation[] = [
  { id: "stock-brook-manor", name: "Stock Brook Manor" },
  { id: "london-waterfront", name: "London Waterfront" },
  { id: "berkshire-gardens", name: "Berkshire Gardens" },
];

export const SUPPORT_BOOKING_DETAILS: Record<string, SupportBookingDetail> = {
  "BK-88214": {
    title: "Coldplay — Aug 22",
    date: "22 Aug 2025",
    price: "£420.00",
  },
  "BK-87550": {
    title: "Atlas Sales Kickoff",
    date: "15 Sep 2025",
    price: "£1,250.00",
  },
  "BK-87102": {
    title: "Christmas Party",
    date: "18 Dec 2025",
    price: "£680.00",
  },
};

export const SUPPORT_BOOKING_OPTIONS: SupportBookingOption[] = [
  {
    ref: "BK-88214",
    label: "BK-88214 — Coldplay — Aug 22",
    locationId: "stock-brook-manor",
  },
  {
    ref: "BK-87550",
    label: "BK-87550 — Atlas Sales Kickoff",
    locationId: "london-waterfront",
  },
  {
    ref: "BK-87102",
    label: "BK-87102 — Christmas Party",
    locationId: "stock-brook-manor",
  },
  {
    ref: "BK-86990",
    label: "BK-86990 — Summer Gala",
    locationId: "berkshire-gardens",
  },
];

export function getBookingsByLocation(locationId: string) {
  return SUPPORT_BOOKING_OPTIONS.filter((b) => b.locationId === locationId);
}

export const SUPPORT_ACTIVITIES: SupportActivity[] = [
  {
    id: "a1",
    description: "Priya Natarajan replied to EW-1042",
    timestamp: minutesAgo(12),
  },
  {
    id: "a2",
    description: "System transferred EW-1041 to event support",
    timestamp: hoursAgo(2),
  },
  {
    id: "a3",
    description: "You submitted EW-1040",
    timestamp: hoursAgo(5),
  },
  {
    id: "a4",
    description: "EW-1039 was resolved",
    timestamp: daysAgo(1),
  },
];

export const SUPPORT_CONVERSATIONS: SupportConversation[] = [
  {
    id: "c1",
    ref: "EW-1042",
    subject: "Wrong seat allocation for Coldplay concert",
    category: "general_support",
    priority: "high",
    status: "reopen",
    bookingRef: "BK-88214",
    bookingTitle: "Coldplay — Aug 22",
    openedAt: daysAgo(1),
    lastMessage:
      "I've attached my confirmation email. We were assigned Table 14 but our tickets say Table 7.",
    lastMessageAt: minutesAgo(12),
    unreadCount: 1,
    messages: [
      {
        id: "m1",
        sender: "customer",
        senderName: "You",
        content:
          "Hi, I booked 4 tickets for the Coldplay show on Aug 22 but our table allocation doesn't match the confirmation email.",
        createdAt: daysAgo(1),
      },
      {
        id: "m2",
        sender: "agent",
        senderName: "Priya Natarajan",
        content:
          "Thanks for reaching out. I can see your booking BK-88214. Could you share a screenshot of the seat details from your confirmation?",
        createdAt: hoursAgo(20),
      },
      {
        id: "m3",
        sender: "system",
        senderName: "System",
        content: "Priority raised from Medium to High by Priya Natarajan",
        createdAt: hoursAgo(18),
      },
      {
        id: "m4",
        sender: "customer",
        senderName: "You",
        content:
          "I've attached my confirmation email. We were assigned Table 14 but our tickets say Table 7.",
        createdAt: minutesAgo(12),
        attachments: [
          { name: "confirmation.pdf", size: "245 KB" },
          { name: "ticket-screenshot.png", size: "1.2 MB" },
        ],
      },
    ],
  },
  {
    id: "c2",
    ref: "EW-1041",
    subject: "Refund request for cancelled after-party",
    category: "technical_support",
    priority: "high",
    status: "reopen",
    bookingRef: "BK-87550",
    bookingTitle: "Atlas Sales Kickoff",
    openedAt: daysAgo(2),
    lastMessage:
      "The after-party add-on was cancelled by the organiser. When will the refund appear?",
    lastMessageAt: hoursAgo(3),
    unreadCount: 1,
    messages: [
      {
        id: "m5",
        sender: "customer",
        senderName: "You",
        content:
          "The after-party add-on was cancelled by the organiser. When will the refund appear?",
        createdAt: daysAgo(2),
      },
      {
        id: "m6",
        sender: "agent",
        senderName: "Marcus Chen",
        content:
          "I've escalated this to our billing team. Refunds typically process within 5–7 business days.",
        createdAt: hoursAgo(6),
      },
    ],
  },
  {
    id: "c3",
    ref: "EW-1040",
    subject: "Dietary requirements not noted on table plan",
    category: "general_support",
    priority: "medium",
    status: "reopen",
    bookingRef: "BK-87102",
    bookingTitle: "Christmas Party",
    openedAt: daysAgo(3),
    lastMessage:
      "Could you confirm how many guests need vegetarian options? We have 2 noted but your message mentioned 4.",
    lastMessageAt: hoursAgo(8),
    unreadCount: 0,
    messages: [
      {
        id: "m7",
        sender: "customer",
        senderName: "You",
        content:
          "We submitted dietary requirements during checkout but they're not reflected on our table plan.",
        createdAt: daysAgo(3),
      },
      {
        id: "m8",
        sender: "agent",
        senderName: "Priya Natarajan",
        content:
          "Could you confirm how many guests need vegetarian options? We have 2 noted but your message mentioned 4.",
        createdAt: hoursAgo(8),
      },
    ],
  },
  {
    id: "c4",
    ref: "EW-1039",
    subject: "Unable to download tickets",
    category: "technical_support",
    priority: "low",
    status: "resolved",
    bookingRef: "BK-88214",
    bookingTitle: "Coldplay — Aug 22",
    openedAt: daysAgo(5),
    lastMessage: "Tickets are now available in your bookings page. Let us know if you need anything else.",
    lastMessageAt: daysAgo(4),
    unreadCount: 0,
    messages: [
      {
        id: "m9",
        sender: "customer",
        senderName: "You",
        content: "The download button on my booking page isn't working.",
        createdAt: daysAgo(5),
      },
      {
        id: "m10",
        sender: "agent",
        senderName: "Support Team",
        content:
          "Tickets are now available in your bookings page. Let us know if you need anything else.",
        createdAt: daysAgo(4),
      },
    ],
  },
  {
    id: "c5",
    ref: "EW-1038",
    subject: "Invoice VAT number incorrect",
    category: "technical_support",
    priority: "low",
    status: "closed",
    bookingRef: "BK-87550",
    bookingTitle: "Atlas Sales Kickoff — Sponsor Package",
    openedAt: daysAgo(10),
    closedAt: daysAgo(2),
    lastMessage: "Updated invoice has been sent to your email.",
    lastMessageAt: daysAgo(2),
    unreadCount: 0,
    messages: [],
  },
  {
    id: "c6",
    ref: "EW-1036",
    subject: "Bulk ticket transfer to corporate attendees",
    category: "general_support",
    priority: "low",
    status: "resolved",
    bookingRef: "BK-87102",
    bookingTitle: "Christmas Party",
    openedAt: daysAgo(14),
    closedAt: daysAgo(3),
    lastMessage: "All 12 tickets have been transferred successfully.",
    lastMessageAt: daysAgo(3),
    unreadCount: 0,
    messages: [],
  },
  {
    id: "c7",
    ref: "EW-1035",
    subject: "Parking pass not included in confirmation",
    category: "general_support",
    priority: "medium",
    status: "new",
    openedAt: daysAgo(0),
    lastMessage: "I purchased a parking add-on but it's not showing in my confirmation email.",
    lastMessageAt: hoursAgo(1),
    unreadCount: 0,
    messages: [
      {
        id: "m11",
        sender: "customer",
        senderName: "You",
        content:
          "I purchased a parking add-on but it's not showing in my confirmation email.",
        createdAt: hoursAgo(1),
      },
    ],
  },
];

export function getOpenConversations() {
  return SUPPORT_CONVERSATIONS.filter((c) =>
    ["new", "reopen"].includes(c.status)
  );
}

export function getInboxConversations() {
  return SUPPORT_CONVERSATIONS;
}

export function getClosedConversations() {
  return SUPPORT_CONVERSATIONS.filter((c) =>
    ["closed", "resolved"].includes(c.status)
  );
}

export function getConversationById(id: string) {
  return SUPPORT_CONVERSATIONS.find((c) => c.id === id || c.ref === id);
}

export function getUnreadInboxCount() {
  return getOpenConversations().reduce((sum, c) => sum + c.unreadCount, 0);
}
