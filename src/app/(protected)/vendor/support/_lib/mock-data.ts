import type {
  DashboardDateFilter,
  SupportAssignee,
  VendorSupportActivity,
  VendorSupportConversation,
  VendorSupportStats,
} from "./types";
import { matchesDashboardDateFilter } from "./utils";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

export const SUPPORT_ASSIGNEES: SupportAssignee[] = [
  { id: "priya", name: "Priya Natarajan" },
  { id: "marcus", name: "Marcus Chen" },
  { id: "elena", name: "Elena Petrov" },
  { id: "unassigned", name: "Unassigned" },
];

export const VENDOR_BOOKING_DETAILS: Record<
  string,
  { title: string; date: string; price: string }
> = {
  "BK-88214": {
    title: "Coldplay — Music of the Spheres",
    date: "22 Aug 2025",
    price: "£248.00",
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

export const VENDOR_SUPPORT_ACTIVITIES: VendorSupportActivity[] = [
  {
    id: "a1",
    description: "Priya Natarajan replied to EW-1042",
    timestamp: minutesAgo(12),
  },
  {
    id: "a2",
    description: "System transferred EW-1041 to Platform Support",
    timestamp: hoursAgo(1),
  },
  {
    id: "a3",
    description: "Elena Petrov assigned EW-1048",
    timestamp: hoursAgo(3),
  },
  {
    id: "a4",
    description: "Priya Natarajan resolved EW-1038",
    timestamp: daysAgo(2),
  },
];

export const VENDOR_CONVERSATIONS: VendorSupportConversation[] = [
  {
    id: "c1",
    ref: "EW-1042",
    subject: "Wrong seat allocation for Coldplay — Music of the Spheres",
    category: "general_support",
    priority: "high",
    status: "reopen",
    bookingRef: "BK-88214",
    bookingTitle: "Coldplay — Music of the Spheres",
    openedAt: daysAgo(1),
    lastMessage:
      "I've attached my confirmation email. We were assigned Table 14 but our tickets say Table 7.",
    lastMessageAt: minutesAgo(12),
    unreadCount: 1,
    isPinned: true,
    needsAttention: true,
    assignee: SUPPORT_ASSIGNEES[0],
    customer: {
      name: "Amelia Rodrigues",
      email: "amelia.rodrigues@email.com",
      phone: "+44 7700 900123",
      timezone: "Europe/London (GMT+1)",
      customerSince: "March 2023",
    },
    messages: [
      {
        id: "m1",
        sender: "customer",
        senderName: "Amelia Rodrigues",
        content:
          "Hi, we received the wrong seat allocation for our Coldplay booking. We booked Table 7 but the confirmation shows Table 14.",
        createdAt: daysAgo(1),
      },
      {
        id: "m2",
        sender: "agent",
        senderName: "Priya Natarajan",
        content:
          "Thanks for reaching out. I can see booking BK-88214. Could you share a screenshot of the seat details from your confirmation?",
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
        senderName: "Amelia Rodrigues",
        content:
          "I've attached my confirmation email. We were assigned Table 14 but our tickets say Table 7.",
        createdAt: minutesAgo(12),
        attachments: [
          { name: "confirmation.pdf", size: "245 KB" },
          { name: "ticket-screenshot.png", size: "1.2 MB" },
        ],
      },
      {
        id: "m4b",
        sender: "agent",
        senderName: "Priya Natarajan",
        content:
          "Checked with venue ops — Table 7 is correct on the floor plan. Waiting on confirmation from Stock Brook Manor.",
        createdAt: minutesAgo(8),
        isInternal: true,
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
    isPinned: false,
    needsAttention: true,
    assignee: SUPPORT_ASSIGNEES[1],
    customer: {
      name: "James Okonkwo",
      email: "james.okonkwo@email.com",
      phone: "+44 7700 900456",
      timezone: "Europe/London (GMT+1)",
      customerSince: "January 2024",
    },
    messages: [
      {
        id: "m5",
        sender: "customer",
        senderName: "James Okonkwo",
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
    isPinned: false,
    needsAttention: true,
    assignee: SUPPORT_ASSIGNEES[0],
    customer: {
      name: "Sarah Mitchell",
      email: "sarah.mitchell@email.com",
      phone: "+44 7700 900789",
      timezone: "Europe/London (GMT+1)",
      customerSince: "June 2022",
    },
    messages: [
      {
        id: "m7",
        sender: "customer",
        senderName: "Sarah Mitchell",
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
    bookingTitle: "Coldplay — Music of the Spheres",
    openedAt: daysAgo(5),
    closedAt: daysAgo(4),
    lastMessage:
      "Tickets are now available in your bookings page. Let us know if you need anything else.",
    lastMessageAt: daysAgo(4),
    unreadCount: 0,
    isPinned: false,
    needsAttention: false,
    assignee: SUPPORT_ASSIGNEES[2],
    customer: {
      name: "Tom Hughes",
      email: "tom.hughes@email.com",
      phone: "+44 7700 900321",
      timezone: "Europe/London (GMT+1)",
      customerSince: "September 2023",
    },
    messages: [
      {
        id: "m9",
        sender: "customer",
        senderName: "Tom Hughes",
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
    bookingTitle: "Atlas Sales Kickoff",
    openedAt: daysAgo(10),
    closedAt: daysAgo(2),
    lastMessage: "Updated invoice has been sent to your email.",
    lastMessageAt: daysAgo(2),
    unreadCount: 0,
    isPinned: false,
    needsAttention: false,
    assignee: SUPPORT_ASSIGNEES[0],
    customer: {
      name: "Lisa Park",
      email: "lisa.park@email.com",
      phone: "+44 7700 900654",
      timezone: "Europe/London (GMT+1)",
      customerSince: "November 2021",
    },
    messages: [],
  },
  {
    id: "c6",
    ref: "EW-1035",
    subject: "Parking pass not included in confirmation",
    category: "general_support",
    priority: "medium",
    status: "new",
    openedAt: daysAgo(0),
    lastMessage:
      "I purchased a parking add-on but it's not showing in my confirmation email.",
    lastMessageAt: hoursAgo(1),
    unreadCount: 0,
    isPinned: false,
    needsAttention: false,
    assignee: null,
    customer: {
      name: "David Chen",
      email: "david.chen@email.com",
      phone: "+44 7700 900987",
      timezone: "Europe/London (GMT+1)",
      customerSince: "February 2025",
    },
    messages: [
      {
        id: "m11",
        sender: "customer",
        senderName: "David Chen",
        content:
          "I purchased a parking add-on but it's not showing in my confirmation email.",
        createdAt: hoursAgo(1),
      },
    ],
  },
];

export function getVendorInboxConversations() {
  return VENDOR_CONVERSATIONS;
}

export function getVendorConversationById(id: string) {
  return VENDOR_CONVERSATIONS.find((c) => c.id === id || c.ref === id);
}

export function getUnreadVendorInboxCount() {
  return VENDOR_CONVERSATIONS.filter((c) =>
    ["new", "reopen"].includes(c.status)
  ).reduce((sum, c) => sum + c.unreadCount, 0);
}

export function getNeedsAttentionConversations() {
  return VENDOR_CONVERSATIONS.filter((c) => c.needsAttention).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export function getVendorStats(filter: DashboardDateFilter): VendorSupportStats {
  const inRange = (iso: string) => matchesDashboardDateFilter(iso, filter);

  const active = VENDOR_CONVERSATIONS.filter((c) =>
    ["new", "reopen"].includes(c.status)
  );

  const totalOpen = active.filter(
    (c) => inRange(c.openedAt) || inRange(c.lastMessageAt)
  ).length;

  const totalResolved = VENDOR_CONVERSATIONS.filter(
    (c) =>
      c.status === "resolved" && inRange(c.closedAt ?? c.lastMessageAt)
  ).length;

  const waiting = VENDOR_CONVERSATIONS.filter(
    (c) =>
      c.status === "reopen" &&
      (inRange(c.lastMessageAt) || inRange(c.openedAt))
  ).length;

  return {
    totalOpen: totalOpen || active.length,
    totalResolved: totalResolved || 8,
    waiting: waiting || 4,
  };
}

export function getRecentActivities(filter: DashboardDateFilter) {
  return VENDOR_SUPPORT_ACTIVITIES.filter((a) =>
    matchesDashboardDateFilter(a.timestamp, filter)
  );
}
