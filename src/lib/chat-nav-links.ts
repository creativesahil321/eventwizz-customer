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
  requiredPermission?: string | string[];
};

const NAV_RULES: NavRule[] = [
  {
    id: "payment",
    pattern:
      /\b(payment (gateway|settings|provider)|stripe|paypal|truelayer|connect payment|change payment|payment method)\b/i,
    vendor: { href: "/vendor/payment-settings", label: "Open Payment Settings" },
    admin: { href: "/admin/settings", label: "Open Settings" },
    requiredPermission: "read-account",
  },
  {
    id: "admin-settings",
    pattern:
      /\b(admin settings|platform settings|grok( api)? key|groq( api)? key|ai (api )?key)\b/i,
    admin: { href: "/admin/settings", label: "Open Settings" },
    requiredPermission: "read-account",
  },
  {
    id: "domain",
    pattern:
      /\b(vat|business verification|verify (my )?business|business settings)\b/i,
    vendor: { href: "/vendor/domain-settings", label: "Open Business Settings" },
    requiredPermission: "read-site-essential",
  },
  {
    id: "seo-tools",
    pattern: /\b(seo tools)\b/i,
    vendor: { href: "/vendor/seo-tools", label: "Open SEO Tools" },
    requiredPermission: "read-seo-tool",
  },
  {
    id: "sites-essentials",
    pattern:
      /\b(site essentials|sites essentials|logo|favicon|branding|colours?|colors?|typography|fonts?|seo settings|seo|social (media|links)|theme|presets?|home page|location page|info pages|copyright)\b/i,
    vendor: { href: "/vendor/sites-essentials", label: "Open Sites Essentials" },
    admin: { href: "/admin/sites-essentials", label: "Open Site Essentials" },
    requiredPermission: "read-site-essential",
  },
  {
    id: "events",
    pattern:
      /\b(create (an? )?event|edit (an? )?event|my events|event list|add (a )?date|tickets?|tables?|deposit|publish|(open|go\s+to|take\s+me\s+to|show)\s+(my\s+)?events?)\b/i,
    vendor: { href: "/vendor/events", label: "Open Events" },
    requiredPermission: "read-event",
  },
  {
    id: "create-event",
    pattern: /\b(create event|new event|add (a )?new event)\b/i,
    vendor: { href: "/vendor/events", label: "Open Events" },
    requiredPermission: "create-event",
  },
  {
    id: "bookings-vendor",
    pattern:
      /\b(booking history|view bookings|customer bookings|manage bookings|(open|go\s+to|take\s+me\s+to|show)\s+(my\s+)?bookings?)\b/i,
    vendor: { href: "/vendor/booking-history", label: "Open Bookings" },
    requiredPermission: "read-booking",
  },
  {
    id: "events-door-qr",
    pattern:
      /\b((turn on|enable|switch on|generate|activate|set up|setup).{0,32}\bqr\b|\bqr\s*codes?\s+(on|for)\b|\bdoor[- ]entry\s+qr\b|\binvoice\s+qr\b)/i,
    vendor: { href: "/vendor/events", label: "Open Events" },
    requiredPermission: "read-event",
  },
  {
    id: "door-scan",
    pattern:
      /\b(door\s*scan|check[\s-]*in|scan\s+(the\s+)?qr|qr\s*scan|entrance\s+scan)\b/i,
    vendor: { href: "/vendor/door-scan", label: "Open Door Scan" },
    requiredPermission: "read-booking",
  },
  {
    id: "table-assignment",
    pattern: /\b(table assignment|seating plan|assign tables|floor plan)\b/i,
    vendor: { href: "/vendor/table-assignment", label: "Open Table Assignment" },
    requiredPermission: "read-table-assignment",
  },
  {
    id: "customers",
    pattern: /\b(customer list|my customers|view customers|(open|go\s+to|take\s+me\s+to|show)\s+(my\s+)?customers?)\b/i,
    vendor: { href: "/vendor/customers", label: "Open Customers" },
    requiredPermission: "read-customer",
  },
  {
    id: "menu-choice",
    pattern: /\b(menu choice|dish choice|customer menu|attendee menu)\b/i,
    vendor: { href: "/vendor/menu-choices", label: "Open Menu Choice" },
    requiredPermission: ["read-menu-choice", "read-event-menu"],
  },
  {
    id: "discounts",
    pattern: /\b(discounts?|coupons?|promo(tion)?s?|vouchers?|offer\s*codes?)\b/i,
    vendor: { href: "/vendor/discounts", label: "Open Discounts" },
    requiredPermission: "read-marketing",
  },
  {
    id: "email-templates",
    pattern: /\b(email templates?)\b/i,
    vendor: { href: "/vendor/email-templates", label: "Open Email Templates" },
    requiredPermission: "read-email-template",
  },
  {
    id: "email-logs",
    pattern: /\b(email logs?)\b/i,
    vendor: { href: "/vendor/email-logs", label: "Open Email Logs" },
    requiredPermission: "read-email-log",
  },
  {
    id: "transactions",
    pattern: /\b(transactions?|payment\s+history|received\s+payments?)\b/i,
    vendor: { href: "/vendor/transactions", label: "Open Transactions" },
    customer: { href: "/customer/transactions", label: "Open Transactions" },
    admin: { href: "/admin/transactions", label: "Open Transaction History" },
    requiredPermission: "read-transaction",
  },
  {
    id: "locations",
    pattern: /\b(locations?|add (a )?location|manage locations)\b/i,
    vendor: { href: "/vendor/venue-locations", label: "Open Locations" },
    requiredPermission: "read-location",
  },
  {
    id: "marketing",
    pattern: /\b(marketing)\b/i,
    vendor: { href: "/vendor/marketing", label: "Open Marketing" },
    requiredPermission: "read-marketing",
  },
  {
    id: "newsletter",
    pattern: /\b(newsletter)\b/i,
    vendor: { href: "/vendor/newsletter", label: "Open Newsletter" },
    requiredPermission: "read-newsletter",
  },
  {
    id: "manage-roles",
    pattern: /\b(manage roles)\b/i,
    vendor: { href: "/vendor/manage-roles", label: "Open Manage Roles" },
    admin: { href: "/admin/manage-roles", label: "Open Manage Roles" },
    requiredPermission: "read-role-permission",
  },
  {
    id: "staff-roles",
    pattern: /\b(staff|permissions?|invite (a )?staff|staff management)\b/i,
    vendor: { href: "/vendor/staff-management", label: "Open Staff Management" },
    admin: { href: "/admin/staff-management", label: "Open Staff Management" },
    requiredPermission: "read-staff",
  },
  {
    id: "notifications",
    pattern: /\b(notification)\b/i,
    vendor: { href: "/vendor/notifications", label: "Open Notifications" },
    customer: { href: "/customer/notifications", label: "Open Notifications" },
    admin: { href: "/admin/notifications", label: "Open Notifications" },
    requiredPermission: "read-notification",
  },
  {
    id: "support-vendor",
    pattern: /\b(support|help ticket|raise (a )?(ticket|enquiry))\b/i,
    vendor: { href: "/vendor/support/dashboard", label: "Open Support" },
    customer: { href: "/customer/support/new", label: "Open New enquiry" },
    guest: { href: "/contact", label: "Go to Contact page" },
    requiredPermission: "read-ticket",
  },
  {
    id: "dispute",
    pattern: /\b(dispute)\b/i,
    vendor: { href: "/vendor/dispute-resolution", label: "Open Dispute Resolution" },
    admin: { href: "/admin/disputes", label: "Open Dispute Resolution" },
    requiredPermission: "read-dispute",
  },
  {
    id: "dashboard",
    pattern: /\b(dashboard|overview)\b/i,
    vendor: { href: "/vendor/dashboard", label: "Open Dashboard" },
    customer: { href: "/customer/dashboard", label: "Open Dashboard" },
    admin: { href: "/admin/dashboard", label: "Open Dashboard" },
    requiredPermission: "read-dashboard",
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
    id: "register",
    pattern:
      /\b(register|sign\s*up|create(\s+an?)?\s+account|join\s+as\s+a?\s*vendor|vendor\s+registration|become\s+a\s+vendor|register\s+venue)\b/i,
    vendor: { href: "/vendor/dashboard", label: "Open Dashboard" },
    guest: { href: "/auth/register", label: "Register as a Vendor" },
  },
  {
    id: "checkout",
    pattern: /\b(checkout|cart|complete (my )?booking)\b/i,
    guest: { href: "/checkout", label: "Open Checkout" },
    customer: { href: "/checkout", label: "Open Checkout" },
  },
  // ── Admin-specific navigation ──
  {
    id: "admin-venues",
    pattern:
      /\b(all venues?|vendor list|venue list|manage venues?|view venues?|approve domain|vendor (overview|management))\b/i,
    admin: { href: "/admin/vendors", label: "Open All Venues" },
    requiredPermission: "read-vendor",
  },
  {
    id: "admin-commission",
    pattern:
      /\b(commission overview|commission tracking|platform commission|venue commission|payout)\b/i,
    admin: { href: "/admin/commission-overview", label: "Open Commission Overview" },
    requiredPermission: "read-commission",
  },
  {
    id: "admin-transactions",
    pattern:
      /\b(admin transaction|platform transaction|transaction history)\b/i,
    admin: { href: "/admin/transactions", label: "Open Transaction History" },
    requiredPermission: "read-transaction",
  },
  {
    id: "admin-disputes",
    pattern:
      /\b(dispute resolution|admin dispute|resolve dispute|customer dispute|vendor dispute)\b/i,
    admin: { href: "/admin/disputes", label: "Open Dispute Resolution" },
    requiredPermission: "read-dispute",
  },
  {
    id: "admin-staff",
    pattern:
      /\b(admin staff|platform staff)\b/i,
    admin: { href: "/admin/staff-management", label: "Open Staff Management" },
    requiredPermission: "read-staff",
  },
  {
    id: "admin-roles",
    pattern:
      /\b(admin roles?|platform roles?)\b/i,
    admin: { href: "/admin/manage-roles", label: "Open Manage Roles" },
    requiredPermission: "read-role-permission",
  },
  {
    id: "admin-system-logs",
    pattern:
      /\b(system log|audit log|api log|admin log|activity log)\b/i,
    admin: { href: "/admin/system-logs", label: "Open System Logs" },
    requiredPermission: "read-system-logs",
  },
  {
    id: "admin-support",
    pattern:
      /\b(admin support|platform support|vendor ticket|support ticket)\b/i,
    admin: { href: "/admin/support", label: "Open Support" },
    requiredPermission: "read-ticket",
  },
  {
    id: "admin-blogs",
    pattern:
      /\b(blog management|platform blog|admin blog|manage blog)\b/i,
    admin: { href: "/admin/blogs", label: "Open Blog Management" },
  },
  {
    id: "admin-referrals",
    pattern:
      /\b(referral|partner signup|referral code)\b/i,
    admin: { href: "/admin/referrals", label: "Open Referrals" },
    requiredPermission: "read-referral",
  },
  {
    id: "admin-marketing",
    pattern:
      /\b(marketing analytics|campaign traffic|visitor stats|conversion analytics)\b/i,
    admin: { href: "/admin/marketing-analytics", label: "Open Marketing Analytics" },
    requiredPermission: "read-marketing",
  },
  {
    id: "admin-seo",
    pattern:
      /\b(admin seo|platform seo|sitemap|meta(data)? generation)\b/i,
    admin: { href: "/admin/seo-tools", label: "Open SEO Tools" },
    requiredPermission: "read-seo-tool",
  },
  {
    id: "admin-email-templates",
    pattern:
      /\b(admin email template|system email|platform email template)\b/i,
    admin: { href: "/admin/email-templates", label: "Open Email Templates" },
    requiredPermission: "read-email-template",
  },
  {
    id: "admin-sales",
    pattern:
      /\b(sales (and )?marketing|lead generation|sales pipeline)\b/i,
    admin: { href: "/admin/sales-marketing", label: "Open Sales & Marketing" },
    requiredPermission: "read-marketing",
  },
];

export type ChatNavAudience = {
  accountType?: string | null;
  isAuthenticated?: boolean;
  isVendorStorefront?: boolean;
  userPermissions?: string[] | null;
};

/**
 * Pick the best navigation CTA for this message, based on who is chatting.
 * Guests never get protected /vendor/* or /customer/* dashboard links (except checkout).
 * Staff without permissions never get links to unauthorized sections.
 */
export function resolveChatNavLink(
  message: string,
  audience: ChatNavAudience,
): ChatNavLink | undefined {
  const text = message.trim();
  if (!text) return undefined;

  const { accountType, isAuthenticated, isVendorStorefront, userPermissions } = audience;

  const hasRulePermission = (perms?: string | string[]): boolean => {
    if (!perms) return true;
    if (!userPermissions || !Array.isArray(userPermissions)) return true;
    const permList = Array.isArray(perms) ? perms : [perms];
    return permList.some((p) => userPermissions.includes(p));
  };

  for (const rule of NAV_RULES) {
    if (!rule.pattern.test(text)) continue;

    // Check permissions for protected tenant links
    if (isAuthenticated && (accountType === "vendor" || accountType === "admin")) {
      if (rule.requiredPermission && !hasRulePermission(rule.requiredPermission)) {
        continue;
      }
    }

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
      if (!isAuthenticated && rule.guest) {
        if (rule.id === "register") {
          return isVendorStorefront
            ? { href: "/auth/register/customer", label: "Create account" }
            : { href: "/auth/register", label: "Register as a Vendor" };
        }
        if (rule.id === "checkout" && !isVendorStorefront) {
          // Checkout is only relevant on venue storefronts
          return undefined;
        }
        return rule.guest;
      }
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

/** Markdown link catalogue for the AI system prompt (by audience and permissions). */
export function getAllowedNavLinksForPrompt(audience: ChatNavAudience): string {
  const { accountType, isAuthenticated, isVendorStorefront, userPermissions } = audience;

  const canAccess = (perm: string | string[]): boolean => {
    if (!userPermissions || !Array.isArray(userPermissions)) return true;
    const list = Array.isArray(perm) ? perm : [perm];
    return list.some((p) => userPermissions.includes(p));
  };

  if (isAuthenticated && accountType === "vendor") {
    const lines: string[] = [
      "NAVIGATION LINKS (MUST INCLUDE WHEN RELEVANT):",
      "When the vendor asks how to open or change a section, briefly explain, then **always** include a markdown link they can click:",
    ];

    if (canAccess("read-account")) lines.push("- Payment gateway / Stripe / PayPal → [Open Payment Settings](/vendor/payment-settings)");
    if (canAccess("read-site-essential")) lines.push("- Logo, colours, fonts, SEO, home/location/info pages, theme → [Open Sites Essentials](/vendor/sites-essentials)");
    if (canAccess("read-site-essential")) lines.push("- VAT / business verification → [Open Business Settings](/vendor/domain-settings)");
    if (canAccess("read-event")) lines.push("- Events, dates, tickets, tables, turn on invoice QR (Finalise → Door entry QR) → [Open Events](/vendor/events)");
    if (canAccess("read-booking")) lines.push("- Bookings → [Open Bookings](/vendor/booking-history)");
    if (canAccess("read-booking")) lines.push("- Door scan / scan invoice QR at the door → [Open Door Scan](/vendor/door-scan)");
    if (canAccess("read-table-assignment")) lines.push("- Table Assignment → [Open Table Assignment](/vendor/table-assignment)");
    if (canAccess("read-customer")) lines.push("- Customers → [Open Customers](/vendor/customers)");
    if (canAccess(["read-menu-choice", "read-event-menu"])) lines.push("- Menu Choice → [Open Menu Choice](/vendor/menu-choices)");
    if (canAccess("read-email-template")) lines.push("- Email Templates → [Open Email Templates](/vendor/email-templates)");
    if (canAccess("read-email-log")) lines.push("- Email Logs → [Open Email Logs](/vendor/email-logs)");
    if (canAccess("read-transaction")) lines.push("- Transactions → [Open Transactions](/vendor/transactions)");
    if (canAccess("read-location")) lines.push("- Locations → [Open Locations](/vendor/venue-locations)");
    if (canAccess("read-ticket")) lines.push("- Support → [Open Support](/vendor/support/dashboard)");
    if (canAccess("read-dashboard")) lines.push("- Dashboard → [Open Dashboard](/vendor/dashboard)");
    if (canAccess("read-marketing")) lines.push("- Marketing → [Open Marketing](/vendor/marketing)");
    if (canAccess("read-marketing")) lines.push("- Discounts / Coupons → [Open Discounts](/vendor/discounts)");
    if (canAccess("read-newsletter")) lines.push("- Newsletter → [Open Newsletter](/vendor/newsletter)");
    if (canAccess("read-staff")) lines.push("- Staff → [Open Staff Management](/vendor/staff-management)");
    if (canAccess("read-role-permission")) lines.push("- Roles → [Open Manage Roles](/vendor/manage-roles)");
    if (canAccess("read-notification")) lines.push("- Notifications → [Open Notifications](/vendor/notifications)");
    if (canAccess("read-dispute")) lines.push("- Dispute Resolution → [Open Dispute Resolution](/vendor/dispute-resolution)");
    lines.push("Format exactly as [Label](/path). Also mention the left-menu name in plain English.");

    return lines.join("\n");
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
- Checkout → [Pay in full](/checkout?pay=full) or [Pay a table deposit](/checkout?pay=deposit)
Format exactly as [Label](/path).
`;
  }

  if (isAuthenticated && accountType === "admin") {
    const adminLinks: string[] = [];
    if (canAccess("read-dashboard")) adminLinks.push("[Open Dashboard](/admin/dashboard)");
    if (canAccess("read-vendor")) adminLinks.push("[Open All Venues](/admin/vendors)");
    if (canAccess("read-site-essential")) adminLinks.push("[Open Site Essentials](/admin/sites-essentials)");
    if (canAccess("read-account")) adminLinks.push("[Open Settings](/admin/settings)");
    if (canAccess("read-commission")) adminLinks.push("[Open Commission Overview](/admin/commission-overview)");
    if (canAccess("read-transaction")) adminLinks.push("[Open Transaction History](/admin/transactions)");
    if (canAccess("read-dispute")) adminLinks.push("[Open Dispute Resolution](/admin/disputes)");
    if (canAccess("read-system-logs")) adminLinks.push("[Open System Logs](/admin/system-logs)");
    if (canAccess("read-staff")) adminLinks.push("[Open Staff Management](/admin/staff-management)");
    if (canAccess("read-role-permission")) adminLinks.push("[Open Manage Roles](/admin/manage-roles)");

    return `
NAVIGATION LINKS (MUST INCLUDE WHEN RELEVANT):
Include permitted markdown links such as ${adminLinks.join(", ")} when helpful.
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
- Checkout (if they have a cart) → [Pay in full](/checkout?pay=full) or [Pay a table deposit](/checkout?pay=deposit)
- If they ask about bookings/profile/support tickets, tell them to log in first and link [Log in](/auth/login).
`;
  }

  return `
NAVIGATION LINKS FOR GUESTS (EVENTWIZZ PLATFORM SITE):
- Venue Registration → [Register as a Vendor](/auth/register)
- Log in → [Log in](/auth/login)
- Contact → [Contact us](/contact)
- Never provide /checkout or /customer/* links as this platform site is for venue owners and event organisers, not public attendee ticket booking.
- Do not send guests to protected dashboard pages.
`;
}
