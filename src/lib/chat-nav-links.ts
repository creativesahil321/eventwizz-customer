/**
 * Chat navigation helpers — map user questions to clickable in-app pages.
 * Respect login: guests only get public/auth links; logged-in users get their area.
 */

export type ChatNavLink = {
  href: string;
  label: string;
};

type NavRule = {
  id: string;
  /** Match against the user message */
  pattern: RegExp;
  vendor?: ChatNavLink;
  customer?: ChatNavLink;
  /** Public / guest-safe link (venue storefront or shared) */
  guest?: ChatNavLink;
  admin?: ChatNavLink;
};

const NAV_RULES: NavRule[] = [
  {
    id: "payment",
    pattern:
      /\b(payment (gateway|settings|provider)|stripe|paypal|truelayer|connect payment|change payment|payment method)\b/i,
    vendor: { href: "/vendor/payment-settings", label: "Open Payment Settings" },
    admin: { href: "/admin/settings", label: "Open Settings" },
  },
  {
    id: "admin-settings",
    pattern:
      /\b(admin settings|platform settings|grok( api)? key|groq( api)? key|ai (api )?key)\b/i,
    admin: { href: "/admin/settings", label: "Open Settings" },
  },
  {
    id: "domain",
    pattern: /\b(domain|subdomain|custom domain|vat|verify domain)\b/i,
    vendor: { href: "/vendor/domain-settings", label: "Open Domain Settings" },
  },
  {
    id: "seo-tools",
    pattern: /\b(seo tools)\b/i,
    vendor: { href: "/vendor/seo-tools", label: "Open SEO Tools" },
  },
  {
    id: "sites-essentials",
    pattern:
      /\b(site essentials|sites essentials|logo|favicon|branding|colours?|colors?|typography|fonts?|seo settings|seo|social (media|links)|theme|presets?|home page|location page|info pages|copyright)\b/i,
    vendor: { href: "/vendor/sites-essentials", label: "Open Sites Essentials" },
    admin: { href: "/admin/sites-essentials", label: "Open Site Essentials" },
  },
  {
    id: "events",
    pattern:
      /\b(create (an? )?event|edit (an? )?event|my events|event list|add (a )?date|tickets?|tables?|deposit|publish)\b/i,
    vendor: { href: "/vendor/events", label: "Open Events" },
  },
  {
    id: "create-event",
    pattern: /\b(create event|new event|add (a )?new event)\b/i,
    vendor: { href: "/vendor/events", label: "Open Events" },
  },
  {
    id: "bookings-vendor",
    pattern: /\b(booking history|view bookings|customer bookings|manage bookings)\b/i,
    vendor: { href: "/vendor/booking-history", label: "Open Bookings" },
  },
  {
    id: "table-assignment",
    pattern: /\b(table assignment|seating plan|assign tables|floor plan)\b/i,
    vendor: { href: "/vendor/table-assignment", label: "Open Table Assignment" },
  },
  {
    id: "customers",
    pattern: /\b(customer list|my customers|view customers)\b/i,
    vendor: { href: "/vendor/customers", label: "Open Customers" },
  },
  {
    id: "menu-choice",
    pattern: /\b(menu choice|dish choice|customer menu|attendee menu)\b/i,
    vendor: { href: "/vendor/menu-choices", label: "Open Menu Choice" },
  },
  {
    id: "email-templates",
    pattern: /\b(email templates?)\b/i,
    vendor: { href: "/vendor/email-templates", label: "Open Email Templates" },
  },
  {
    id: "email-logs",
    pattern: /\b(email logs?)\b/i,
    vendor: { href: "/vendor/email-logs", label: "Open Email Logs" },
  },
  {
    id: "transactions",
    pattern: /\b(transaction|payment history|received payment)\b/i,
    vendor: { href: "/vendor/transactions", label: "Open Transactions" },
    customer: { href: "/customer/transactions", label: "Open Transactions" },
  },
  {
    id: "locations",
    pattern: /\b(event locations?|venue locations?|add (a )?location|manage locations)\b/i,
    vendor: { href: "/vendor/venue-locations", label: "Open Event Locations" },
  },
  {
    id: "marketing",
    pattern: /\b(marketing)\b/i,
    vendor: { href: "/vendor/marketing", label: "Open Marketing" },
  },
  {
    id: "newsletter",
    pattern: /\b(newsletter)\b/i,
    vendor: { href: "/vendor/newsletter", label: "Open Newsletter" },
  },
  {
    id: "manage-roles",
    pattern: /\b(manage roles)\b/i,
    vendor: { href: "/vendor/manage-roles", label: "Open Manage Roles" },
  },
  {
    id: "staff-roles",
    pattern: /\b(staff|permissions?|invite (a )?staff|staff management)\b/i,
    vendor: { href: "/vendor/staff-management", label: "Open Staff Management" },
  },
  {
    id: "notifications",
    pattern: /\b(notification)\b/i,
    vendor: { href: "/vendor/notifications", label: "Open Notifications" },
    customer: { href: "/customer/notifications", label: "Open Notifications" },
  },
  {
    id: "support-vendor",
    pattern: /\b(support|help ticket|raise (a )?(ticket|enquiry))\b/i,
    vendor: { href: "/vendor/support/dashboard", label: "Open Support" },
    customer: { href: "/customer/support/new", label: "Open New enquiry" },
    guest: { href: "/contact", label: "Go to Contact page" },
  },
  {
    id: "dispute",
    pattern: /\b(dispute)\b/i,
    vendor: { href: "/vendor/dispute-resolution", label: "Open Dispute Resolution" },
  },
  {
    id: "dashboard",
    pattern: /\b(dashboard|overview)\b/i,
    vendor: { href: "/vendor/dashboard", label: "Open Dashboard" },
    customer: { href: "/customer/dashboard", label: "Open Dashboard" },
  },
  {
    id: "bookings-customer",
    pattern:
      /\b(my bookings?|view my booking|pay (the )?balance|reschedule|add(-| )?ons|add extras|menu choices?|add (a )?room|new room|another room|extra room|change (the )?room)\b/i,
    customer: { href: "/customer/bookings", label: "Open Bookings" },
    guest: { href: "/auth/login", label: "Log in to view bookings" },
  },
  {
    id: "profile",
    pattern: /\b(profile|change password|account details|my account)\b/i,
    customer: { href: "/customer/profile", label: "Open Profile" },
    vendor: { href: "/vendor/profile", label: "Open Profile" },
    guest: { href: "/auth/login", label: "Log in" },
  },
  {
    id: "contact",
    pattern: /\b(contact (us|page)|phone|email us)\b/i,
    guest: { href: "/contact", label: "Go to Contact page" },
    customer: { href: "/contact", label: "Go to Contact page" },
  },
  {
    id: "checkout",
    pattern: /\b(checkout|cart|complete (my )?booking)\b/i,
    guest: { href: "/vendor/checkout", label: "Open Checkout" },
    customer: { href: "/vendor/checkout", label: "Open Checkout" },
  },
];

export type ChatNavAudience = {
  accountType?: string | null;
  isAuthenticated?: boolean;
  isVendorStorefront?: boolean;
};

/**
 * Pick the best navigation CTA for this message, based on who is chatting.
 * Guests never get protected /vendor/* or /customer/* dashboard links (except checkout).
 */
export function resolveChatNavLink(
  message: string,
  audience: ChatNavAudience,
): ChatNavLink | undefined {
  const text = message.trim();
  if (!text) return undefined;

  const { accountType, isAuthenticated, isVendorStorefront } = audience;

  for (const rule of NAV_RULES) {
    if (!rule.pattern.test(text)) continue;

    if (isAuthenticated && accountType === "vendor" && rule.vendor) {
      return rule.vendor;
    }
    if (isAuthenticated && accountType === "admin" && (rule.admin || rule.vendor)) {
      return rule.admin || rule.vendor;
    }
    if (isAuthenticated && accountType === "customer" && rule.customer) {
      return rule.customer;
    }

    // Guest on venue site (or not logged in)
    if (!isAuthenticated || accountType === "customer") {
      if (!isAuthenticated && rule.guest) return rule.guest;
      if (!isAuthenticated && rule.customer) {
        // Protected customer page — send to login instead
        return { href: "/auth/login", label: "Log in to continue" };
      }
    }

    // Guest asking vendor-only topics on storefront → contact / login
    if (!isAuthenticated && isVendorStorefront && rule.vendor && rule.guest) {
      return rule.guest;
    }
  }

  return undefined;
}

/** Markdown link catalogue for the AI system prompt (by audience). */
export function getAllowedNavLinksForPrompt(audience: ChatNavAudience): string {
  const { accountType, isAuthenticated, isVendorStorefront } = audience;

  if (isAuthenticated && accountType === "vendor") {
    return `
NAVIGATION LINKS (MUST INCLUDE WHEN RELEVANT):
When the vendor asks how to open or change a section, briefly explain, then **always** include a markdown link they can click:
- Payment gateway / Stripe / PayPal → [Open Payment Settings](/vendor/payment-settings)
- Logo, colours, fonts, SEO, home/location/info pages, theme → [Open Sites Essentials](/vendor/sites-essentials)
- Domain / subdomain → [Open Domain Settings](/vendor/domain-settings)
- Events, dates, tickets, tables → [Open Events](/vendor/events)
- Bookings → [Open Bookings](/vendor/booking-history)
- Table Assignment → [Open Table Assignment](/vendor/table-assignment)
- Customers → [Open Customers](/vendor/customers)
- Menu Choice → [Open Menu Choice](/vendor/menu-choices)
- Email Templates → [Open Email Templates](/vendor/email-templates)
- Email Logs → [Open Email Logs](/vendor/email-logs)
- Transactions → [Open Transactions](/vendor/transactions)
- Event Locations → [Open Event Locations](/vendor/venue-locations)
- Support → [Open Support](/vendor/support/dashboard)
- Dashboard → [Open Dashboard](/vendor/dashboard)
- Marketing → [Open Marketing](/vendor/marketing)
- Newsletter → [Open Newsletter](/vendor/newsletter)
- Staff → [Open Staff Management](/vendor/staff-management)
- Roles → [Open Manage Roles](/vendor/manage-roles)
- Notifications → [Open Notifications](/vendor/notifications)
- Dispute Resolution → [Open Dispute Resolution](/vendor/dispute-resolution)
Format exactly as [Label](/path). Also mention the left-menu name in plain English.
`;
  }

  if (isAuthenticated && accountType === "customer") {
    return `
NAVIGATION LINKS (MUST INCLUDE WHEN RELEVANT):
When the customer asks where to go, briefly explain, then **always** include a markdown link:
- Bookings / pay balance / reschedule / extras → [Open Bookings](/customer/bookings)
- IMPORTANT: Rooms cannot be added after booking. For “add room to existing booking”, still link Bookings and explain they can only use **Add extras for this date**, or make a new booking for another room.
- Profile → [Open Profile](/customer/profile)
- Support enquiry → [Open New enquiry](/customer/support/new)
- Support inbox → [Open Support Inbox](/customer/support/inbox)
- Transactions → [Open Transactions](/customer/transactions)
- Notifications → [Open Notifications](/customer/notifications)
- Dashboard → [Open Dashboard](/customer/dashboard)
- Contact → [Contact us](/contact)
- Checkout → [Open Checkout](/vendor/checkout)
Format exactly as [Label](/path).
`;
  }

  if (isAuthenticated && accountType === "admin") {
    return `
NAVIGATION LINKS (MUST INCLUDE WHEN RELEVANT):
Include markdown links such as [Open Dashboard](/admin/dashboard), [Open All Venues](/admin/vendors), [Open Site Essentials](/admin/sites-essentials), [Open Settings](/admin/settings) when helpful.
`;
  }

  // Guests
  if (isVendorStorefront) {
    return `
NAVIGATION LINKS FOR GUESTS (MUST FOLLOW):
- Guests are **not logged in**. Never send them to /customer/* or /vendor/dashboard links.
- Register → [Create account](/auth/register/customer)
- Log in → [Log in](/auth/login)
- Contact → [Contact us](/contact)
- Checkout (if they have a cart) → [Open Checkout](/vendor/checkout)
- If they ask about bookings/profile/support tickets, tell them to log in first and link [Log in](/auth/login).
`;
  }

  return `
NAVIGATION LINKS FOR GUESTS:
- Prefer [Log in](/auth/login) or [Create account](/auth/register/customer) / Contact as appropriate.
- Do not send guests to protected dashboard pages.
`;
}
