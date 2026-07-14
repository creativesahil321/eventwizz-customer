import type {
  AdminSupportActivity,
  AdminSupportConversation,
  AdminSupportQueueStats,
  AdminSupportStats,
  AdminSupportVenue,
  DashboardDateFilter,
  SupportAssignee,
} from "./types";
import { matchesDashboardDateFilter } from "./utils";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

export const ADMIN_SUPPORT_VENUES: AdminSupportVenue[] = [
  { id: "v1", name: "Stock Brook Manor" },
  { id: "v2", name: "Riverside Arena" },
  { id: "v3", name: "Atlas Events Hall" },
  { id: "v4", name: "Harbour Lights Venue" },
];

export const SUPPORT_ASSIGNEES: SupportAssignee[] = [
  { id: "priya", name: "Priya Natarajan" },
  { id: "tobi", name: "Tobi Adekunle" },
  { id: "elena", name: "Elena Petrov" },
  { id: "marcus", name: "Marcus Reid" },
  { id: "unassigned", name: "Unassigned" },
];

export const ADMIN_BOOKING_DETAILS: Record<
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

export const ADMIN_SUPPORT_ACTIVITIES: AdminSupportActivity[] = [
  {
    id: "a1",
    description: "Priya Natarajan replied to EW-1042",
    timestamp: minutesAgo(12),
  },
  {
    id: "a2",
    description: "Marcus Chen transferred EW-1041 to Admin technical support",
    timestamp: hoursAgo(1),
  },
  {
    id: "a3",
    description: "Tobi Adekunle assigned EW-1048",
    timestamp: hoursAgo(3),
  },
  {
    id: "a4",
    description: "Elena Petrov sent EW-1039 to Stock Brook Manor vendor",
    timestamp: daysAgo(1),
  },
];

export const ADMIN_CONVERSATIONS: AdminSupportConversation[] = [
  {
    id: "a1",
    ref: "EW-1042",
    subject: "Wrong seat allocation for Coldplay — Music of the Spheres",
    category: "general_support",
    priority: "high",
    status: "reopen",
    source: "customer",
    venue: ADMIN_SUPPORT_VENUES[0],
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
    contact: {
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
    ],
  },
  {
    id: "a2",
    ref: "EW-1041",
    subject: "Refund not received for cancelled after-party",
    category: "technical_support",
    priority: "high",
    status: "reopen",
    source: "customer",
    venue: ADMIN_SUPPORT_VENUES[2],
    bookingRef: "BK-87550",
    bookingTitle: "Atlas Sales Kickoff",
    openedAt: daysAgo(2),
    lastMessage:
      "The after-party add-on was cancelled by the organiser. When will the refund appear?",
    lastMessageAt: hoursAgo(1),
    unreadCount: 0,
    isPinned: false,
    needsAttention: true,
    assignee: SUPPORT_ASSIGNEES[1],
    waitingOn: "customer",
    contact: {
      name: "James Okonkwo",
      email: "james.okonkwo@email.com",
      phone: "+44 7700 900456",
      timezone: "Europe/London (GMT+1)",
      customerSince: "January 2024",
    },
    messages: [
      {
        id: "m1",
        sender: "system",
        senderName: "System",
        content:
          "Transferred from Stock Brook Manor vendor to Admin technical support — Technical issue",
        createdAt: hoursAgo(5),
      },
      {
        id: "m2",
        sender: "customer",
        senderName: "James Okonkwo",
        content:
          "The after-party add-on was cancelled by the organiser. When will the refund appear?",
        createdAt: hoursAgo(1),
      },
    ],
  },
  {
    id: "a3",
    ref: "EW-1040",
    subject: "App crashes when uploading vendor logo (iOS 18)",
    category: "technical_support",
    priority: "medium",
    status: "new",
    source: "vendor",
    venue: ADMIN_SUPPORT_VENUES[1],
    openedAt: hoursAgo(3),
    lastMessage:
      "Our team cannot upload a new logo from iPhone. Crash happens right after selecting the image.",
    lastMessageAt: hoursAgo(3),
    unreadCount: 1,
    isPinned: false,
    needsAttention: false,
    assignee: SUPPORT_ASSIGNEES[2],
    contact: {
      name: "Marcus Chen",
      email: "marcus@riversidearena.com",
      phone: "+44 7700 900789",
      timezone: "Europe/London (GMT+1)",
      customerSince: "June 2022",
      role: "Venue manager",
    },
    messages: [
      {
        id: "m1",
        sender: "vendor",
        senderName: "Marcus Chen",
        content:
          "Our team cannot upload a new logo from iPhone. Crash happens right after selecting the image.",
        createdAt: hoursAgo(3),
      },
    ],
  },
  {
    id: "a4",
    ref: "EW-1039",
    subject: "Commission payout timing for Q3 events",
    category: "general_support",
    priority: "low",
    status: "reopen",
    source: "vendor",
    venue: ADMIN_SUPPORT_VENUES[0],
    openedAt: daysAgo(1),
    lastMessage: "Can you confirm when Q3 commission payouts will be processed?",
    lastMessageAt: hoursAgo(6),
    unreadCount: 0,
    isPinned: false,
    needsAttention: false,
    assignee: SUPPORT_ASSIGNEES[3],
    waitingOn: "vendor",
    contact: {
      name: "Lisa Park",
      email: "lisa@stockbrookmanor.com",
      phone: "+44 7700 900321",
      timezone: "Europe/London (GMT+1)",
      customerSince: "September 2023",
      role: "Finance lead",
    },
    messages: [
      {
        id: "m1",
        sender: "vendor",
        senderName: "Lisa Park",
        content: "Can you confirm when Q3 commission payouts will be processed?",
        createdAt: hoursAgo(6),
      },
      {
        id: "m2",
        sender: "agent",
        senderName: "Elena Petrov",
        content:
          "Payouts for Q3 are scheduled for the 15th. I'll share the breakdown once finance confirms.",
        createdAt: hoursAgo(4),
      },
    ],
  },
  {
    id: "a5",
    ref: "EW-1038",
    subject: "Invoice VAT number incorrect",
    category: "general_support",
    priority: "low",
    status: "closed",
    source: "customer",
    venue: ADMIN_SUPPORT_VENUES[2],
    bookingRef: "BK-87550",
    bookingTitle: "Atlas Sales Kickoff",
    openedAt: daysAgo(5),
    closedAt: daysAgo(2),
    lastMessage: "Thanks, the updated invoice looks correct now.",
    lastMessageAt: daysAgo(2),
    unreadCount: 0,
    isPinned: false,
    needsAttention: false,
    assignee: SUPPORT_ASSIGNEES[0],
    contact: {
      name: "Lisa Park",
      email: "lisa.park@email.com",
      phone: "+44 7700 900654",
      timezone: "Europe/London (GMT+1)",
      customerSince: "November 2021",
    },
    messages: [
      {
        id: "m1",
        sender: "customer",
        senderName: "Lisa Park",
        content: "The VAT number on my invoice is wrong. Please reissue.",
        createdAt: daysAgo(5),
      },
      {
        id: "m2",
        sender: "agent",
        senderName: "Priya Natarajan",
        content: "We've issued a corrected invoice. Please check your email.",
        createdAt: daysAgo(2),
      },
      {
        id: "m3",
        sender: "customer",
        senderName: "Lisa Park",
        content: "Thanks, the updated invoice looks correct now.",
        createdAt: daysAgo(2),
      },
    ],
  },
  {
    id: "a6",
    ref: "EW-1037",
    subject: "Customer entered wrong queue — payment gateway error",
    category: "technical_support",
    priority: "high",
    status: "new",
    source: "customer",
    venue: ADMIN_SUPPORT_VENUES[3],
    openedAt: hoursAgo(8),
    lastMessage:
      "Customer reported checkout failing. Vendor escalated from general support.",
    lastMessageAt: hoursAgo(2),
    unreadCount: 2,
    isPinned: false,
    needsAttention: true,
    assignee: null,
    contact: {
      name: "Tom Hughes",
      email: "tom.hughes@email.com",
      phone: "+44 7700 900987",
      timezone: "Europe/London (GMT+1)",
      customerSince: "February 2025",
    },
    messages: [
      {
        id: "m1",
        sender: "system",
        senderName: "System",
        content:
          "Transferred from Harbour Lights Venue to Admin technical support — Technical issue",
        createdAt: hoursAgo(2),
      },
      {
        id: "m2",
        sender: "customer",
        senderName: "Tom Hughes",
        content: "Checkout keeps failing with a payment gateway error at step 3.",
        createdAt: hoursAgo(2),
      },
    ],
  },
];

export function getAdminVenues() {
  return ADMIN_SUPPORT_VENUES;
}

export function getAdminInboxConversations() {
  return ADMIN_CONVERSATIONS;
}

export function getAdminConversationById(id: string) {
  return ADMIN_CONVERSATIONS.find((c) => c.id === id);
}

export function getUnreadAdminInboxCount() {
  return ADMIN_CONVERSATIONS.reduce((sum, c) => sum + c.unreadCount, 0);
}

export function getLiveAdminConversations() {
  return ADMIN_CONVERSATIONS.filter((c) => !["closed", "resolved"].includes(c.status))
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )
    .slice(0, 6);
}

function isOpenConversation(conversation: AdminSupportConversation) {
  return ["new", "reopen"].includes(conversation.status);
}

export function getAdminStats(filter: DashboardDateFilter): AdminSupportStats {
  const inRange = (iso: string) => matchesDashboardDateFilter(iso, filter);

  const open = ADMIN_CONVERSATIONS.filter(
    (c) =>
      isOpenConversation(c) &&
      (inRange(c.openedAt) || inRange(c.lastMessageAt))
  );

  const resolved = ADMIN_CONVERSATIONS.filter(
    (c) =>
      c.status === "resolved" &&
      inRange(c.closedAt ?? c.lastMessageAt)
  );

  const customerTickets = open.filter((c) => c.source === "customer").length;
  const vendorTickets = open.filter((c) => c.source === "vendor").length;

  return {
    totalOpen: open.length || 4,
    totalResolved: resolved.length || 8,
    customerTickets: customerTickets || 3,
    vendorTickets: vendorTickets || 2,
  };
}

export function getAdminQueueStats(): AdminSupportQueueStats[] {
  const open = ADMIN_CONVERSATIONS.filter((c) => isOpenConversation(c));

  return [
    {
      queue: "general_support",
      open: open.filter((c) => c.category === "general_support").length,
    },
    {
      queue: "customer",
      open: open.filter((c) => c.source === "customer").length,
    },
    {
      queue: "vendor",
      open: open.filter((c) => c.source === "vendor").length,
    },
  ];
}

export function getRecentAdminActivities(filter: DashboardDateFilter) {
  return ADMIN_SUPPORT_ACTIVITIES.filter((a) =>
    matchesDashboardDateFilter(a.timestamp, filter)
  );
}
