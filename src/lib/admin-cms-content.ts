import type { ThemeSchema } from "@/types/theme.types";

export type PolicySectionKey =
  | "privacy"
  | "terms"
  | "cookies"
  | "refund"
  | "vendor-terms";

export interface PolicySection {
  key: PolicySectionKey;
  label: string;
  title: string;
  body: string;
}

export const ADMIN_POLICY_SECTIONS: Array<{
  key: PolicySectionKey;
  label: string;
}> = [
    { key: "privacy", label: "Privacy" },
    { key: "terms", label: "Terms & Conditions" },
    { key: "cookies", label: "Cookie Policy" },
    { key: "refund", label: "Refund" },
    { key: "vendor-terms", label: "Vendor Terms" },
  ];

export const ADMIN_FOOTER_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/contact", label: "Contact Us" },
  { href: "/policies", label: "Terms & Privacy" },
] as const;

/** @deprecated Use ADMIN_FOOTER_NAV_LINKS */
export const ADMIN_FOOTER_PAGE_LINKS = ADMIN_FOOTER_NAV_LINKS;

export const ADMIN_COMPANY_INFO = {
  legalName: "Eventwizz Limited",
  companyNumber: "11555643",
  registeredOffice: "124 City Road, London, England, EC1V 2NX",
  phone: "+44 (0)20 3925 0350",
  phoneHref: "+442039250350",
  email: "info@eventwizz.co.uk",
} as const;

export type AdminCompanyInfo = {
  legalName: string;
  companyNumber: string;
  registeredOffice: string;
  phone: string;
  phoneHref: string;
  email: string;
};

function toPhoneHref(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

export function resolveAdminCompanyInfo(
  theme?: ThemeSchema | null,
): AdminCompanyInfo {
  const phone =
    theme?.company_phone?.trim() || ADMIN_COMPANY_INFO.phone;
  const email = ADMIN_COMPANY_INFO.email;

  return {
    legalName: ADMIN_COMPANY_INFO.legalName,
    companyNumber:
      theme?.company_number?.trim() || ADMIN_COMPANY_INFO.companyNumber,
    registeredOffice:
      theme?.company_registered_office?.trim() ||
      ADMIN_COMPANY_INFO.registeredOffice,
    phone,
    phoneHref: toPhoneHref(phone) || ADMIN_COMPANY_INFO.phoneHref,
    email,
  };
}

export const ADMIN_FOOTER_BRAND_DESCRIPTION =
  "Eventwizz is a software platform providing event management, booking, and automation solutions for venues and hospitality businesses.";

export const ADMIN_FOOTER_DISCLAIMER =
  "Eventwizz is a software platform providing event management, booking, and automation solutions for venues and hospitality businesses. Payments may be processed via authorised third-party payment providers. Venues and suppliers remain responsible for the fulfilment of their services and events.";

const POLICY_SECTION_DUMMY: Record<
  PolicySectionKey,
  Omit<PolicySection, "key">
> = {
  terms: {
    label: "Terms & Conditions",
    title: "Terms & Conditions",
    body: `<p><strong>Introduction</strong></p>
<p>Welcome to EventWizz. These Terms and Conditions govern your use of our event management platform and services. By accessing or using EventWizz, you agree to be bound by these terms.</p>
<p><strong>Use of Service</strong></p>
<p>You agree to use EventWizz only for lawful purposes and in accordance with these Terms and Conditions. You must not use the service in any way that could damage, disable, or impair the platform.</p>
<p><strong>User Accounts</strong></p>
<p>When you create an account with us, you must provide accurate and complete information. You are responsible for maintaining the security of your account and password.</p>
<p><strong>Intellectual Property</strong></p>
<p>The service and its original content, features, and functionality are owned by EventWizz and are protected by international copyright, trademark, and other intellectual property laws.</p>
<p><strong>Limitation of Liability</strong></p>
<p>EventWizz shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service, except where required by applicable law.</p>
<p><strong>Changes to Terms</strong></p>
<p>We reserve the right to modify these terms at any time. We will notify users of material changes by posting the updated Terms and Conditions on this page.</p>`,
  },
  privacy: {
    label: "Privacy",
    title: "Privacy",
    body: `<p><strong>Introduction</strong></p>
<p>At EventWizz, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our event management platform.</p>
<p><strong>Information We Collect</strong></p>
<ul>
<li>Name and contact information</li>
<li>Email address and phone number</li>
<li>Event details and preferences</li>
<li>Payment information (processed securely)</li>
<li>Account credentials</li>
</ul>
<p><strong>How We Use Your Information</strong></p>
<p>We use the information we collect to provide, maintain, and improve our services, process transactions, send you updates, and respond to your inquiries.</p>
<p><strong>Data Security</strong></p>
<p>We implement appropriate technical and organisational security measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction.</p>
<p><strong>Your Rights</strong></p>
<p>You have the right to access, update, or delete your personal information at any time. You can also opt out of certain communications from us.</p>
<p><strong>Cookies and Tracking</strong></p>
<p>We use cookies and similar tracking technologies to track activity on our platform. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>`,
  },
  cookies: {
    label: "Cookie Policy",
    title: "Cookie Policy",
    body: `<p><strong>What are cookies?</strong></p>
<p>Cookies are small text files stored on your device when you visit EventWizz. They help us remember preferences, improve performance, and understand how visitors use our platform.</p>
<p><strong>How we use cookies</strong></p>
<ul>
<li>To keep you signed in and maintain secure sessions</li>
<li>To remember settings and preferences</li>
<li>To measure site traffic and improve performance</li>
<li>To support relevant marketing and campaign measurement where enabled</li>
</ul>
<p><strong>Managing cookies</strong></p>
<p>You can control or delete cookies through your browser settings. Disabling some cookies may affect how parts of the platform function.</p>
<p><strong>Third-party cookies</strong></p>
<p>Some analytics, advertising, or embedded tools may place cookies through trusted third-party providers. These providers are responsible for their own cookie practices.</p>`,
  },
  refund: {
    label: "Refund",
    title: "Refund",
    body: `<p><strong>Subscription refunds</strong></p>
<p>EventWizz subscription fees are billed according to the plan selected at signup. Refund eligibility for platform subscriptions is assessed on a case-by-case basis within 14 days of purchase where no substantial use has occurred.</p>
<p><strong>Event ticket refunds</strong></p>
<p>Ticket purchases made through vendor sites powered by EventWizz are subject to each venue&apos;s refund policy. EventWizz facilitates payments on behalf of vendors; refund decisions for event bookings are made by the event organiser unless otherwise stated at checkout.</p>
<p><strong>How to request a refund</strong></p>
<ul>
<li>For platform billing enquiries, contact <a href="mailto:support@eventwizz.com">support@eventwizz.com</a>.</li>
<li>For event booking refunds, contact the venue directly or use the details on your booking confirmation.</li>
</ul>
<p><strong>Processing times</strong></p>
<p>Approved refunds are returned to the original payment method within 5–10 working days, depending on your bank or card provider.</p>`,
  },
  "vendor-terms": {
    label: "Vendor Terms",
    title: "Vendor Terms",
    body: `<p><strong>Vendor relationship</strong></p>
<p>Vendors using EventWizz are responsible for ensuring their event listings, ticketing details, pricing, and customer communications are accurate, lawful, and up to date.</p>
<p><strong>Platform usage</strong></p>
<p>Vendors must use the platform in accordance with applicable consumer, privacy, and payment regulations. Misuse of the service, fraudulent activity, or misleading listings may result in suspension or termination.</p>
<p><strong>Payments and fulfilment</strong></p>
<p>Vendors are responsible for honouring bookings sold through their EventWizz-powered site, including delivering the event as described and handling customer queries in a timely manner.</p>
<p><strong>Refund obligations</strong></p>
<p>Where a vendor-specific refund policy applies, the vendor remains responsible for clearly communicating it to customers and processing eligible refunds in line with local law and the terms shown at checkout.</p>
<p><strong>Content and compliance</strong></p>
<p>By using EventWizz, vendors confirm they have the rights to upload all logos, images, event descriptions, and promotional content published through the platform.</p>`,
  },
};

function pickThemeHtml(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  return null;
}

const THEME_FIELD_BY_SECTION: Partial<
  Record<PolicySectionKey, keyof ThemeSchema>
> = {
  privacy: "privacy_policy",
  terms: "terms_and_conditions",
  cookies: "cookie_policy",
  refund: "refund_policy",
  "vendor-terms": "vendor_terms",
};

export const ADMIN_CONTACT_CONTENT = {
  title: "Contact Us",
  body: `<p>Have a question about EventWizz? We are here to help with onboarding, billing, and platform support.</p>
<p>For sales enquiries or a product demo, use the <strong>Book a Call</strong> option in the header, or email us directly.</p>`,
};

export function resolveAdminContactContent(theme?: ThemeSchema | null) {
  const customBody = pickThemeHtml(theme?.contact_page_content);
  return {
    title: ADMIN_CONTACT_CONTENT.title,
    body: customBody || ADMIN_CONTACT_CONTENT.body,
  };
}

export const ADMIN_CONTACT_DETAILS = {
  phone: ADMIN_COMPANY_INFO.phone,
  phoneHref: ADMIN_COMPANY_INFO.phoneHref,
  email: ADMIN_COMPANY_INFO.email,
  address: ADMIN_COMPANY_INFO.registeredOffice,
} as const;

export function resolveAdminContactDetails(theme?: ThemeSchema | null) {
  const company = resolveAdminCompanyInfo(theme);
  return {
    phone: company.phone,
    phoneHref: company.phoneHref,
    email: company.email,
    address: company.registeredOffice,
  };
}

export function resolveAdminPolicySections(): PolicySection[] {
  return ADMIN_POLICY_SECTIONS.map(({ key }) => {
    const dummy = POLICY_SECTION_DUMMY[key];
    return { key, ...dummy };
  });
}

export function resolveAdminPolicySection(section: PolicySectionKey): PolicySection {
  return (
    resolveAdminPolicySections().find((s) => s.key === section) ??
    resolveAdminPolicySections()[0]
  );
}

export function isValidAdminPolicySection(
  value: string | null | undefined,
): value is PolicySectionKey {
  return ADMIN_POLICY_SECTIONS.some((s) => s.key === value);
}
