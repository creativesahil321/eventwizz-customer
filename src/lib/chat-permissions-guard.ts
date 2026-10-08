/**
 * Role-Based Access Control (RBAC) Permission Guard for EventWizz Chatbot
 *
 * Enforces strict permission boundaries across all tenant tiers (Admin staff,
 * Vendor staff, and Partner staff) so that users cannot query or disclose
 * information, secrets, or internal data for sections they lack permission to access.
 */

export type RestrictedResourceDomain =
  | "transactions"
  | "customers"
  | "events"
  | "staff"
  | "menus"
  | "locations"
  | "coupons"
  | "commissions"
  | "system_logs"
  | "disputes"
  | "email_templates"
  | "email_logs"
  | "newsletters"
  | "seo_tools"
  | "site_essentials"
  | "dashboard"
  | "vendors"
  | "payment_settings";

export interface ResourcePermissionRule {
  domain: RestrictedResourceDomain;
  label: string;
  primaryPermission: string;
  requiredPermissions: string[];
  /** RegEx patterns to detect when a user is requesting information about this domain */
  patterns: RegExp[];
}

export const RESOURCE_PERMISSION_RULES: ResourcePermissionRule[] = [
  {
    domain: "transactions",
    label: "Financial Transactions & Revenue",
    primaryPermission: "read-transaction",
    requiredPermissions: ["read-transaction", "update-transaction"],
    patterns: [
      /\b(transactions?|revenue|payouts?|financials?|earnings?|how much (money|sales|we made)|income|balance|ledger)\b/i,
      /\b(recent payments?|payment history|total sales|total gross)\b/i,
    ],
  },
  {
    domain: "customers",
    label: "Customer Information & Profiles",
    primaryPermission: "read-customer",
    requiredPermissions: [
      "read-customer",
      "create-customer",
      "update-customer",
      "delete-customer",
    ],
    patterns: [
      /\b(customers?|clients?|guest details?|customer details?|attendee info|find customer|customer list|customer emails?|customer phone)\b/i,
      /\b(who booked|customer history|customer records?)\b/i,
    ],
  },
  {
    domain: "commissions",
    label: "Admin Commissions & Platform Earnings",
    primaryPermission: "read-commission",
    requiredPermissions: ["read-commission", "read-payment"],
    patterns: [
      /\b(commissions?|admin commission|platform earnings?|commission rates?|pending payouts?)\b/i,
      /\b(commission overview|how much commission)\b/i,
    ],
  },
  {
    domain: "staff",
    label: "Staff Members & Role Permissions",
    primaryPermission: "read-staff",
    requiredPermissions: [
      "read-staff",
      "create-staff",
      "update-staff",
      "read-role-permission",
      "create-role-permission",
      "update-role-permission",
    ],
    patterns: [
      /\b(staff|team members?|staff roster|employees?|roles? and permissions?|who is on staff|list staff|user roles?)\b/i,
      /\b(manage roles?|role permissions?)\b/i,
    ],
  },
  {
    domain: "menus",
    label: "Menu Choices & Catering",
    primaryPermission: "read-menu-choice",
    requiredPermissions: [
      "read-menu-choice",
      "read-event-menu",
      "create-event-menu",
      "update-event-menu",
    ],
    patterns: [
      /\b(menu choices?|dietary choices?|guest menu|dish choices?|starter|main course|dessert choices?|meal selections?)\b/i,
    ],
  },
  {
    domain: "locations",
    label: "Locations & Addresses",
    primaryPermission: "read-location",
    requiredPermissions: [
      "read-location",
      "create-location",
      "update-location",
      "delete-location",
    ],
    patterns: [
      /\b(venue locations?|event locations?|our addresses?|room locations?|add location)\b/i,
    ],
  },
  {
    domain: "coupons",
    label: "Discount Codes & Marketing Promotions",
    primaryPermission: "read-marketing",
    requiredPermissions: ["read-marketing", "create-marketing", "update-marketing"],
    patterns: [
      /\b(coupons?|promo codes?|discounts?|voucher codes?|promotions?|active coupons?)\b/i,
    ],
  },
  {
    domain: "events",
    label: "Event Management & Creation",
    primaryPermission: "read-event",
    requiredPermissions: [
      "read-event",
      "create-event",
      "update-event",
      "delete-event",
    ],
    patterns: [
      /\b(my events|event list|create event|edit event|delete event|unlisted events?|private events?)\b/i,
    ],
  },
  {
    domain: "system_logs",
    label: "System Audit Logs & Diagnostics",
    primaryPermission: "read-system-logs",
    requiredPermissions: ["read-system-logs"],
    patterns: [
      /\b(system logs?|audit logs?|error logs?|security logs?|diagnostics?)\b/i,
    ],
  },
  {
    domain: "disputes",
    label: "Disputes & Customer Mediation",
    primaryPermission: "read-dispute",
    requiredPermissions: [
      "read-dispute",
      "create-dispute",
      "update-dispute",
      "delete-dispute",
    ],
    patterns: [
      /\b(disputes?|mediation|chargebacks?|refund claims?|dispute resolution)\b/i,
    ],
  },
  {
    domain: "vendors",
    label: "Vendor Management & Venue Directory",
    primaryPermission: "read-vendor",
    requiredPermissions: [
      "read-vendor",
      "create-vendor",
      "update-vendor",
      "change-vendor-status",
    ],
    patterns: [
      /\b(all venues|vendor list|how is .+ doing|venue directory|approve vendors?|impersonate vendor)\b/i,
    ],
  },
  {
    domain: "site_essentials",
    label: "Site Essentials & Branding",
    primaryPermission: "read-site-essential",
    requiredPermissions: ["read-site-essential", "update-site-essential"],
    patterns: [
      /\b(site essentials?|branding settings?|custom css|logo and colours?|change font)\b/i,
    ],
  },
  {
    domain: "email_templates",
    label: "Email Templates",
    primaryPermission: "read-email-template",
    requiredPermissions: [
      "read-email-template",
      "create-email-template",
      "update-email-template",
    ],
    patterns: [/\b(email templates?|automated emails?|notification email format)\b/i],
  },
  {
    domain: "email_logs",
    label: "Email Delivery Logs",
    primaryPermission: "read-email-log",
    requiredPermissions: ["read-email-log", "resend-email-log"],
    patterns: [/\b(email logs?|sent emails?|delivered emails?)\b/i],
  },
  {
    domain: "newsletters",
    label: "Newsletter Subscribers & Campaigns",
    primaryPermission: "read-newsletter",
    requiredPermissions: ["read-newsletter", "update-newsletter"],
    patterns: [/\b(newsletters?|subscriber list|newsletter campaigns?)\b/i],
  },
  {
    domain: "seo_tools",
    label: "SEO Tools & Analytics",
    primaryPermission: "read-seo-tool",
    requiredPermissions: ["read-seo-tool", "update-seo-tool"],
    patterns: [/\b(seo tools?|sitemaps?|meta tags?|search engine indexing)\b/i],
  },
  {
    domain: "payment_settings",
    label: "Payment Gateway Credentials & Accounts",
    primaryPermission: "read-account",
    requiredPermissions: ["read-account", "update-account", "read-payment"],
    patterns: [
      /\b(bank accounts?|stripe credentials?|paypal keys?|payment keys?)\b/i,
    ],
  },
  {
    domain: "dashboard",
    label: "Dashboard Metrics & Summaries",
    primaryPermission: "read-dashboard",
    requiredPermissions: ["read-dashboard"],
    patterns: [
      /\b(platform summary|dashboard summary|overall summary|executive overview)\b/i,
    ],
  },
];

/**
 * Check whether a user's granted permissions allow access to a specific resource domain.
 * If userPermissions is empty or missing for an authenticated staff user, access is refused.
 */
export function hasPermissionForDomain(
  domain: RestrictedResourceDomain,
  userPermissions?: string[] | null,
): boolean {
  if (!userPermissions || !Array.isArray(userPermissions) || userPermissions.length === 0) {
    return false;
  }

  const rule = RESOURCE_PERMISSION_RULES.find((r) => r.domain === domain);
  if (!rule) return true;

  return rule.requiredPermissions.some((perm) => userPermissions.includes(perm));
}

/**
 * Detect whether the user's prompt is targeting a restricted resource domain.
 */
export function detectRestrictedResourceIntent(
  userText: string,
): ResourcePermissionRule | null {
  const trimmed = userText.trim();
  if (!trimmed) return null;

  for (const rule of RESOURCE_PERMISSION_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(trimmed))) {
      return rule;
    }
  }

  return null;
}

/**
 * Format a polite, professional British English refusal message when access is denied by RBAC.
 */
export function buildAccessRestrictedReply(
  rule: ResourcePermissionRule,
  options?: { userName?: string | null },
): string {
  const nameSalutation = options?.userName ? `${options.userName}, ` : "";
  return (
    `**Access Restricted**\n\n` +
    `I am sorry, ${nameSalutation}but your account does not have permission to access **${rule.label}** (requires \`${rule.primaryPermission}\`).\n\n` +
    `Please speak with your venue or platform administrator to request the necessary permissions for your role.`
  );
}
