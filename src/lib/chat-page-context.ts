/**
 * Map the browser pathname to a plain-language page label for the chat assistant.
 * Never expose raw URLs to the user — only use these labels in guidance.
 */

export type PageContextInfo = {
  pathname: string;
  pageLabel: string;
  area: "vendor" | "customer" | "admin" | "public" | "auth" | "onboarding" | "other";
  hints: string;
};

function matchPrefix(
  pathname: string,
  rules: Array<{ prefix: string; label: string; hints?: string }>,
): { label: string; hints: string } | null {
  for (const rule of rules) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return { label: rule.label, hints: rule.hints || "" };
    }
  }
  return null;
}

const VENDOR_PAGES: Array<{ prefix: string; label: string; hints?: string }> = [
  {
    prefix: "/vendor/dashboard",
    label: "Dashboard",
    hints:
      "They are already on the Dashboard — do not tell them to pick a venue on Welcome / Select Location unless they are actually on that page.",
  },
  { prefix: "/vendor/events", label: "Events" },
  { prefix: "/vendor/customers", label: "Customers" },
  { prefix: "/vendor/booking-history", label: "Bookings" },
  { prefix: "/vendor/table-assignment", label: "Table Assignment" },
  { prefix: "/vendor/email-templates", label: "Email Templates" },
  { prefix: "/vendor/menu-choices", label: "Menu Choice" },
  { prefix: "/vendor/transactions", label: "Transactions" },
  { prefix: "/vendor/sites-essentials", label: "Sites Essentials" },
  { prefix: "/vendor/venue-locations", label: "Event Locations" },
  { prefix: "/vendor/marketing", label: "Marketing" },
  { prefix: "/vendor/newsletter", label: "Newsletter" },
  { prefix: "/vendor/email-logs", label: "Email Logs" },
  { prefix: "/vendor/manage-roles", label: "Manage Roles" },
  { prefix: "/vendor/staff-management", label: "Staff Management" },
  { prefix: "/vendor/seo-tools", label: "Seo Tools" },
  { prefix: "/vendor/notifications", label: "Notifications" },
  { prefix: "/vendor/support", label: "Support" },
  { prefix: "/vendor/dispute-resolution", label: "Dispute Resolution" },
  { prefix: "/vendor/payment-settings", label: "Payment Settings" },
  { prefix: "/vendor/domain-settings", label: "Domain Settings" },
  { prefix: "/vendor/profile", label: "Profile" },
  { prefix: "/vendor/settings", label: "Settings" },
];

const CUSTOMER_PAGES: Array<{ prefix: string; label: string; hints?: string }> =
  [
    { prefix: "/customer/dashboard", label: "Dashboard" },
    { prefix: "/customer/profile", label: "Profile" },
    { prefix: "/customer/bookings", label: "Bookings" },
    {
      prefix: "/customer/support/new",
      label: "New enquiry",
      hints: "They are already on the New enquiry form.",
    },
    { prefix: "/customer/support/inbox", label: "Support Inbox" },
    { prefix: "/customer/support", label: "Support" },
    { prefix: "/customer/notifications", label: "Notifications" },
    { prefix: "/customer/transactions", label: "Transactions" },
  ];

const ADMIN_PAGES: Array<{ prefix: string; label: string; hints?: string }> = [
  { prefix: "/admin/dashboard", label: "Dashboard" },
  { prefix: "/admin/vendors", label: "All Venues" },
  { prefix: "/admin/transactions", label: "Transaction History" },
  { prefix: "/admin/notifications", label: "Notifications" },
  { prefix: "/admin/commission", label: "Commission Overview" },
  { prefix: "/admin/manage-roles", label: "Manage Roles" },
  { prefix: "/admin/staff", label: "Staff Management" },
  { prefix: "/admin/email-templates", label: "Email Template" },
  { prefix: "/admin/sites-essentials", label: "Site Essentials" },
  { prefix: "/admin/support", label: "Support" },
  { prefix: "/admin/dispute", label: "Dispute Resolution Centre" },
];

const PUBLIC_VENDOR_PAGES: Array<{
  prefix: string;
  label: string;
  hints?: string;
}> = [
  { prefix: "/vendor/checkout", label: "Checkout" },
  { prefix: "/contact", label: "Contact" },
  { prefix: "/auth/login", label: "Log in" },
  { prefix: "/auth/register", label: "Register" },
];

export function resolvePageContext(
  pathname: string | null | undefined,
): PageContextInfo {
  const path = (pathname || "/").split("?")[0] || "/";

  if (path.startsWith("/welcome/select-location")) {
    return {
      pathname: path,
      pageLabel: "Welcome — Select Location",
      area: "onboarding",
      hints:
        "They are choosing which venue to manage. Guide them to pick a venue, then Continue to Dashboard.",
    };
  }

  if (path.startsWith("/on-boarding") || path.startsWith("/onboarding")) {
    return {
      pathname: path,
      pageLabel: "Onboarding",
      area: "onboarding",
      hints: "They are setting up their venue — help with the current onboarding step in plain language.",
    };
  }

  const vendorHit = matchPrefix(path, VENDOR_PAGES);
  if (path.startsWith("/vendor/") && vendorHit) {
    return {
      pathname: path,
      pageLabel: vendorHit.label,
      area: "vendor",
      hints: vendorHit.hints,
    };
  }

  const customerHit = matchPrefix(path, CUSTOMER_PAGES);
  if (path.startsWith("/customer/") && customerHit) {
    return {
      pathname: path,
      pageLabel: customerHit.label,
      area: "customer",
      hints: customerHit.hints,
    };
  }

  const adminHit = matchPrefix(path, ADMIN_PAGES);
  if (path.startsWith("/admin/") && adminHit) {
    return {
      pathname: path,
      pageLabel: adminHit.label,
      area: "admin",
      hints: adminHit.hints,
    };
  }

  const publicHit = matchPrefix(path, PUBLIC_VENDOR_PAGES);
  if (publicHit) {
    return {
      pathname: path,
      pageLabel: publicHit.label,
      area: path.startsWith("/auth") ? "auth" : "public",
      hints: publicHit.hints,
    };
  }

  // Venue public browsing (location / event pages)
  if (path === "/" || path.match(/^\/[^/]+\/?$/) || path.includes("/events/")) {
    return {
      pathname: path,
      pageLabel: path === "/" ? "Home" : "Events / venue browse",
      area: "public",
      hints:
        "They are browsing the public venue site — help with finding events, booking, cart, or checkout.",
    };
  }

  return {
    pathname: path,
    pageLabel: "this page",
    area: "other",
    hints: "",
  };
}

/** System-prompt block so the AI guides based on the open page. */
export function buildCurrentPagePromptBlock(
  pathname: string | null | undefined,
): string {
  const page = resolvePageContext(pathname);

  return `
CURRENT PAGE (MUST FOLLOW — CRITICAL):
- The user is currently on: **${page.pageLabel}** (internal path for you only: ${page.pathname}).
- Guide them for **this page first**. Do not assume they are on a different screen.
- Never tell them they are on Welcome — Select Location, Checkout, or any other page unless the label above matches.
- Never mention the internal path/URL in your reply — only use the page name (e.g. “Dashboard”, “Bookings”, “New enquiry”).
- If their question is about another area, explain how to get there using menu/button names from **this** page.
${page.hints ? `- Extra hint: ${page.hints}` : ""}
`.trim();
}
