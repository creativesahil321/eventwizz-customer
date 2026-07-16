import type { ThemeSchema } from "@/types/theme.types";

/** Top-level vendor CMS pages shown in the footer */
export type VendorCmsPageKey = "policies" | "contact";

/** Sections within the combined Terms & Privacy page */
export type VendorPolicySectionKey = "terms" | "privacy" | "refund";

export interface VendorCmsPageContent {
  title: string;
  body: string;
}

export interface VendorPolicySection {
  key: VendorPolicySectionKey;
  label: string;
  title: string;
  body: string;
}

export const VENDOR_FOOTER_PAGE_LINKS: Array<{
  href: string;
  label: string;
  page: VendorCmsPageKey;
}> = [
  { href: "/policies", label: "Terms & Privacy", page: "policies" },
  { href: "/contact", label: "Contact Us", page: "contact" },
];

export const VENDOR_POLICY_SECTIONS: Array<{
  key: VendorPolicySectionKey;
  label: string;
}> = [
  { key: "terms", label: "Terms & Conditions" },
  { key: "privacy", label: "Privacy" },
  { key: "refund", label: "Refund" },
];

function withVenueName(template: string, venueName: string): string {
  return template.replace(/\{\{venueName\}\}/g, venueName);
}

const POLICY_SECTION_DUMMY: Record<
  VendorPolicySectionKey,
  Omit<VendorPolicySection, "key">
> = {
  terms: {
    label: "Terms & Conditions",
    title: "Terms & Conditions",
    body: `<p><strong>1. INTRODUCTION</strong></p>
<p>1.1 These terms and conditions govern your use of the {{venueName}} website and booking services. By using our site or completing a booking, you accept these terms in full.</p>
<p>1.2 Please read these terms carefully before placing an order. If you do not agree, you should not use this website.</p>
<p><strong>2. BOOKINGS &amp; PAYMENTS</strong></p>
<p>2.1 All bookings are subject to availability and confirmation.</p>
<p>2.2 Prices, deposits, and payment schedules are shown at checkout and may vary by event.</p>
<p>2.3 We reserve the right to refuse or cancel bookings that appear fraudulent or breach these terms.</p>
<p><strong>3. CANCELLATIONS &amp; REFUNDS</strong></p>
<p>3.1 Cancellation and refund policies are displayed during checkout and on your booking confirmation.</p>
<p>3.2 Where refunds apply, they will be processed to the original payment method unless otherwise stated.</p>
<p><strong>4. ATTENDANCE</strong></p>
<p>4.1 Please arrive on time. Late arrival may affect your experience and is at the venue&apos;s discretion.</p>
<p>4.2 We may refuse entry where conduct poses a risk to staff, guests, or property.</p>
<p><strong>5. LIABILITY</strong></p>
<p>5.1 {{venueName}} is not liable for indirect or consequential loss except where required by applicable law.</p>
<p><strong>6. CHANGES</strong></p>
<p>6.1 We may update these terms from time to time. Continued use of the site constitutes acceptance of the updated terms.</p>`,
  },
  privacy: {
    label: "Privacy",
    title: "Privacy",
    body: `<p>{{venueName}} is committed to protecting your privacy. This policy explains how we collect, use, and safeguard personal information when you visit our website or book with us.</p>
<p><strong>Information we collect</strong></p>
<p>We may collect your name, email address, phone number, billing details, and booking information when you register, subscribe, or purchase tickets.</p>
<p><strong>How we use your information</strong></p>
<ul>
<li>To process bookings and send confirmations</li>
<li>To communicate important updates about your event</li>
<li>To improve our services and customer experience</li>
<li>With your consent, to send marketing communications</li>
</ul>
<p><strong>Data retention</strong></p>
<p>We retain personal data only for as long as necessary to fulfil bookings, comply with legal obligations, and resolve disputes.</p>
<p><strong>Your rights</strong></p>
<p>You may request access, correction, or deletion of your personal data by contacting us via our Contact page.</p>
<p><strong>Cookies</strong></p>
<p>We use cookies to improve site functionality and analyse usage. You can manage cookie preferences in your browser settings.</p>`,
  },
  refund: {
    label: "Refund",
    title: "Refund",
    body: `<p>This refund policy applies to bookings made with {{venueName}} through our website.</p>
<p><strong>Eligibility</strong></p>
<p>Refund eligibility depends on the event type, timing of cancellation, and the terms shown at checkout. Please review the refund terms on your booking confirmation.</p>
<p><strong>Cancellations by the customer</strong></p>
<ul>
<li>Refund requests must be submitted in writing via our Contact page.</li>
<li>Deposits may be non-refundable unless stated otherwise at the time of booking.</li>
<li>Partial refunds may apply where only part of a booking is cancelled.</li>
</ul>
<p><strong>Cancellations by the venue</strong></p>
<p>If we cancel or reschedule an event, affected customers will be offered a full refund or transfer to a new date, at our discretion.</p>
<p><strong>Processing</strong></p>
<p>Approved refunds are returned to the original payment method within 5–10 working days, depending on your bank or card provider.</p>
<p><strong>Non-refundable items</strong></p>
<p>Service fees, processing charges, or third-party add-ons may be non-refundable where stated at checkout.</p>`,
  },
};

export const VENDOR_CMS_DUMMY: Record<
  Exclude<VendorCmsPageKey, "policies">,
  VendorCmsPageContent
> = {
  contact: {
    title: "Contact Us",
    body: `<p>We would love to hear from you. Reach out using the details below and we will get back to you as soon as we can.</p>
<p>For booking enquiries, please include your preferred date, party size, and any special requirements.</p>`,
  },
};

function pickThemeHtml(
  ...values: Array<string | null | undefined>
): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

const THEME_FIELD_BY_SECTION: Partial<
  Record<VendorPolicySectionKey, keyof ThemeSchema>
> = {
  terms: "terms_and_conditions",
  privacy: "privacy_policy",
  refund: "refund_policy",
};

export function resolveVendorPolicySections(
  theme?: ThemeSchema | null,
): VendorPolicySection[] {
  const venueName = theme?.name?.trim() || "Our venue";

  return VENDOR_POLICY_SECTIONS.map(({ key, label }) => {
    const dummy = POLICY_SECTION_DUMMY[key];
    const themeField = THEME_FIELD_BY_SECTION[key];
    const customBody =
      themeField && theme
        ? pickThemeHtml(theme[themeField] as string | undefined)
        : null;

    return {
      key,
      label,
      title: dummy.title,
      body: withVenueName(customBody || dummy.body, venueName),
    };
  });
}

export function resolveVendorPolicySection(
  section: VendorPolicySectionKey,
  theme?: ThemeSchema | null,
): VendorPolicySection {
  return (
    resolveVendorPolicySections(theme).find((s) => s.key === section) ??
    resolveVendorPolicySections(theme)[0]
  );
}

export function isValidPolicySection(
  value: string | null | undefined,
): value is VendorPolicySectionKey {
  return VENDOR_POLICY_SECTIONS.some((s) => s.key === value);
}

export function resolveVendorCmsContent(
  page: VendorCmsPageKey,
  theme?: ThemeSchema | null,
): VendorCmsPageContent {
  const venueName = theme?.name?.trim() || "Our venue";

  if (page === "policies") {
    const terms = resolveVendorPolicySection("terms", theme);
    return { title: "Policies", body: terms.body };
  }

  const dummy = VENDOR_CMS_DUMMY.contact;
  return {
    title: dummy.title,
    body: withVenueName(
      pickThemeHtml(theme?.contact_page_content) || dummy.body,
      venueName,
    ),
  };
}

export function isVendorPublicSite(
  subdomain?: string | null,
  theme?: ThemeSchema | null,
): boolean {
  return subdomain === "vendor" || theme?.website_role === "vendor";
}
