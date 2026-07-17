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
    theme?.company_phone?.trim() ||
    theme?.contactDetails?.phone?.trim() ||
    ADMIN_COMPANY_INFO.phone;
  const email =
    theme?.company_email?.trim() ||
    theme?.contactDetails?.email?.trim() ||
    ADMIN_COMPANY_INFO.email;

  return {
    legalName:
      theme?.company_legal_name?.trim() ||
      theme?.name?.trim() ||
      ADMIN_COMPANY_INFO.legalName,
    companyNumber:
      theme?.company_number?.trim() || ADMIN_COMPANY_INFO.companyNumber,
    registeredOffice:
      theme?.company_registered_office?.trim() ||
      theme?.contactDetails?.address?.trim() ||
      ADMIN_COMPANY_INFO.registeredOffice,
    phone,
    phoneHref: toPhoneHref(phone) || ADMIN_COMPANY_INFO.phoneHref,
    email,
  };
}

/**
 * Footer copyright line. Prefers the tenant-provided `theme.copyright` string
 * (already formatted by the backend), falling back to a generated line so the
 * footer is never blank.
 */
export function resolveAdminCopyright(theme?: ThemeSchema | null): string {
  const custom = theme?.copyright?.trim();
  if (custom) return custom;

  const legalName = resolveAdminCompanyInfo(theme).legalName;
  return `© ${new Date().getFullYear()} ${legalName}. All rights reserved.`;
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

/** Raw HTML content keyed by info-page key (e.g. `privacy_policy`). */
export type InfoPageContentMap = Record<string, string | null | undefined>;

export function resolveAdminContactContent(
  theme?: ThemeSchema | null,
  contentByKey?: InfoPageContentMap,
) {
  const customBody = pickThemeHtml(
    contentByKey?.contact_page_content,
    theme?.contact_page_content,
  );
  return {
    title: ADMIN_CONTACT_CONTENT.title,
    body: customBody || ADMIN_CONTACT_CONTENT.body,
  };
}

/** Custom About page HTML from the info-pages API / theme, or null for default. */
export function resolveAdminAboutHtml(
  theme?: ThemeSchema | null,
  contentByKey?: InfoPageContentMap,
): string | null {
  return pickThemeHtml(
    contentByKey?.about_page_content,
    theme?.about_page_content,
  );
}

/** Custom How It Works HTML from the info-pages API / theme, or null for default. */
export function resolveAdminHowItWorksHtml(
  theme?: ThemeSchema | null,
  contentByKey?: InfoPageContentMap,
): string | null {
  return pickThemeHtml(
    contentByKey?.how_it_works_page_content,
    theme?.how_it_works_page_content,
  );
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

export function resolveAdminPolicySections(
  theme?: ThemeSchema | null,
  contentByKey?: InfoPageContentMap,
): PolicySection[] {
  return ADMIN_POLICY_SECTIONS.map(({ key }) => {
    const dummy = POLICY_SECTION_DUMMY[key];
    const themeField = THEME_FIELD_BY_SECTION[key];
    const customBody = themeField
      ? pickThemeHtml(
          contentByKey?.[themeField],
          theme?.[themeField] as string | undefined,
        )
      : null;

    return { key, ...dummy, body: customBody || dummy.body };
  });
}

export function resolveAdminPolicySection(
  section: PolicySectionKey,
  theme?: ThemeSchema | null,
  contentByKey?: InfoPageContentMap,
): PolicySection {
  const sections = resolveAdminPolicySections(theme, contentByKey);
  return sections.find((s) => s.key === section) ?? sections[0];
}

export function isValidAdminPolicySection(
  value: string | null | undefined,
): value is PolicySectionKey {
  return ADMIN_POLICY_SECTIONS.some((s) => s.key === value);
}

/**
 * Admin marketing home content — resolved from the theme (white-label keys) with
 * the current platform copy as fallback. The repeatable lists (partner logos,
 * audience cards, feature items, news articles, FAQ Q&As) stay in their section
 * components; only the surrounding text and the hero background are editable.
 */
export interface AdminHomeContent {
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    primaryCtaLink: string;
    secondaryCtaLink: string;
    backgroundImage: string;
  };
  intro: { title: string; body: string };
  partners: { title: string; subtitle: string; logos: string[] };
  audience: {
    title: string;
    subtitle: string;
    cards: AdminHomeCard[];
  };
  features: {
    title: string;
    subtitle: string;
    items: AdminHomeFeature[];
  };
  showcase: {
    title: string;
    body: string;
    checklistTitle: string;
    cta: string;
    ctaLink: string;
    image: string;
    videoUrl: string;
  };
  news: { title: string; subtitle: string };
  faq: { title: string; subtitle: string; items: HomeFaqItem[] };
}

export interface HomeFaqItem {
  question: string;
  answer: string;
}

export interface AdminHomeCard {
  title: string;
  description: string;
  image: string;
}

export interface AdminHomeFeature {
  title: string;
  /** Icon name from the shared admin-home icon registry. */
  icon: string;
}

export const ADMIN_HOME_DEFAULTS: AdminHomeContent = {
  hero: {
    eyebrow: "Trusted by 100+ UK venues",
    title: "Event Management Software for Venues",
    subtitle:
      "Manage your venue, your way, with an event management platform that allows you to sell tickets online at the touch of a button.",
    primaryCta: "Book a demo",
    secondaryCta: "Learn More",
    primaryCtaLink: "",
    secondaryCtaLink: "",
    backgroundImage: "/assets/images/admin/hero-venue.jpg",
  },
  intro: {
    title: "What is Event Wizz?",
    body: "<p>We're an event booking and management platform for UK businesses just like yours. With our software, you can create and manage events, sell tickets online, and accept secure payments, all in one place.</p><p>It's easier than ever to manage your venue and keep your customers happy with event management software that packs all you need into one simple dashboard. Your branded website will be on a dedicated subdomain, so you can maintain brand consistency.</p>",
  },
  partners: {
    title: "Trusted By",
    subtitle:
      "Don't just take our word for it. We're trusted by venues and businesses across the UK.",
    logos: [],
  },
  audience: {
    title: "Who Is Event Wizz For?",
    subtitle:
      "Any business that runs events will benefit from Event Wizz. Create ticketed events, accept payment, and allow menu choices, all from your venue's own branded site.",
    cards: [
      {
        title: "Christmas & Seasonal Events",
        description:
          "Sell Christmas event tickets and tables with menu choices and guest seating plans.",
        image: "/assets/images/admin/event-christmas.jpg",
      },
      {
        title: "NYE Parties",
        description:
          "Offer standing tickets, table bookings, and add-ons for New Year celebrations.",
        image: "/assets/images/admin/event-nye.jpg",
      },
      {
        title: "Dining Events",
        description:
          "Run dinners, special menus, and tasting events with online booking and guest options.",
        image: "/assets/images/admin/event-dining.jpg",
      },
      {
        title: "University Balls & Parties",
        description:
          "Create ticketed student events with easy online booking and guest lists.",
        image: "/assets/images/admin/event-university.jpg",
      },
      {
        title: "Corporate Events",
        description:
          "Manage registrations, bookings, and payments for corporate or private hire events.",
        image: "/assets/images/admin/event-corporate.jpg",
      },
      {
        title: "Nightlife Events",
        description:
          "Sell tickets for pub nights, live entertainment, and seasonal nightlife bookings.",
        image: "/assets/images/admin/event-nightlife.jpg",
      },
    ],
  },
  features: {
    title: "Why Use Event Wizz?",
    subtitle:
      "Everything you need to run seamless, profitable events — all in one place.",
    items: [
      { title: "Get Started In As Few As 15 Minutes", icon: "Clock" },
      { title: "Generate Your Own Shareable Microsite", icon: "Globe" },
      {
        title: "Integrate With Your Internal Platforms & Systems",
        icon: "Monitor",
      },
      { title: "Fully Automated Menu Planning", icon: "UtensilsCrossed" },
      {
        title: "Upsell Extra Features & More Expensive Packages",
        icon: "TrendingUp",
      },
      { title: "Sell Tables Or Tickets", icon: "Ticket" },
      { title: "Automate Your Processes To Save Time", icon: "Cog" },
      { title: "Keep Your Branding", icon: "Palette" },
      { title: "Add Your Menu Choices", icon: "ClipboardList" },
      {
        title: "Secure Online Portal For Customers & Venue Admins",
        icon: "ShieldCheck",
      },
    ],
  },
  showcase: {
    title: "Event Management Software to Revolutionise Your Venue",
    body: "<p>We're built for wedding venues, pubs, event spaces, and restaurants; businesses just like yours. We'll save you valuable time and improve the customer experience with the ability to sell tickets online and manage your events from one easy-to-use dashboard.</p><p>You can manage everything from how guests choose their menu options to how your events can be booked.</p>",
    checklistTitle: "You stay in charge of:",
    cta: "Book a demo",
    ctaLink: "",
    image: "/assets/images/admin/dashboard-mockup.jpg",
    videoUrl: "",
  },
  news: {
    title: "Latest News & Articles",
    subtitle: "Insights, tips, and best practices from our team",
  },
  faq: {
    title: "Frequently Asked Questions",
    subtitle: "Everything you need to know.",
    items: [
      {
        question: "Who is Event Wizz for?",
        answer:
          "Event Wizz is for any business that would benefit from an event management platform. Pubs, restaurants, wedding venues, and event spaces alike can enjoy an easy-to-use system with everything you need for smooth booking and management.",
      },
      {
        question: "Will I get my own branded website?",
        answer:
          "Yes, you'll get a branded website to allow for instantly recognisable brand consistency that your customers will recognise. There are SEO settings to help you climb to the top of Google.",
      },
      {
        question: "Can I sell tickets online for Christmas and NYE events?",
        answer:
          "Absolutely. Event Wizz allows you to sell tickets and tables for Christmas, New Year's Eve, and other seasonal events. You can even upload special packages, such as VIP options and standing tickets.",
      },
      {
        question: "How quickly can I set up my website?",
        answer:
          "With the help of guided onboarding, you can set up your event management site within around 15 minutes.",
      },
      {
        question: "Can I manage more than one event at once?",
        answer:
          "Absolutely! With our extensive event management platform, you can manage and advertise more than one event at once, providing an all-in-one space for customers to explore your upcoming events and purchase tickets.",
      },
      {
        question: "Do I need technical skills to use the platform?",
        answer:
          "Not at all. Our platform is suitable for everyone, from tech-savvy experts to novices. Our step-by-step process makes it easy to create your own event booking site with zero experience.",
      },
    ],
  },
};

/** Max FAQ items rendered / editable on the admin home page. */
export const HOME_FAQ_MAX_ITEMS = 8;

/**
 * Normalises the theme `home_faq_items` value (array or JSON string) into a
 * clean list of Q&As, dropping empty rows and capping at the max.
 */
function parseFaqItems(
  raw: ThemeSchema["home_faq_items"],
): HomeFaqItem[] | null {
  let list: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      list = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list)) return null;

  const items = list
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question = String((item as HomeFaqItem).question ?? "").trim();
      const answer = String((item as HomeFaqItem).answer ?? "").trim();
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((item): item is HomeFaqItem => item !== null)
    .slice(0, HOME_FAQ_MAX_ITEMS);

  return items.length > 0 ? items : null;
}

function pick(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/** True for absolute http(s) links (open in a new tab); false for internal paths. */
export function isExternalUrl(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

/**
 * Normalises a demo-video URL into something embeddable. YouTube/Vimeo links
 * become iframe embed URLs; everything else is treated as a direct video file.
 */
export function resolveVideoEmbed(
  url: string,
): { type: "iframe" | "video"; src: string } {
  const value = url.trim();
  const youtube = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${youtube[1]}?autoplay=1&rel=0`,
    };
  }
  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`,
    };
  }
  return { type: "video", src: value };
}

/**
 * Builds the 6 audience cards. Each field (title/description/image) falls back
 * independently to the default card at the same position, so partial edits still
 * render a complete grid.
 */
function resolveAudienceCards(
  theme: ThemeSchema | null | undefined,
  defaults: AdminHomeCard[],
): AdminHomeCard[] {
  const slots: Array<Partial<AdminHomeCard>> = [
    {
      title: theme?.home_audience_1_title,
      description: theme?.home_audience_1_description,
      image: theme?.home_audience_1_image,
    },
    {
      title: theme?.home_audience_2_title,
      description: theme?.home_audience_2_description,
      image: theme?.home_audience_2_image,
    },
    {
      title: theme?.home_audience_3_title,
      description: theme?.home_audience_3_description,
      image: theme?.home_audience_3_image,
    },
    {
      title: theme?.home_audience_4_title,
      description: theme?.home_audience_4_description,
      image: theme?.home_audience_4_image,
    },
    {
      title: theme?.home_audience_5_title,
      description: theme?.home_audience_5_description,
      image: theme?.home_audience_5_image,
    },
    {
      title: theme?.home_audience_6_title,
      description: theme?.home_audience_6_description,
      image: theme?.home_audience_6_image,
    },
  ];

  return defaults.map((def, i) => {
    const slot = slots[i] ?? {};
    return {
      title: pick(slot.title, def.title),
      description: pick(slot.description, def.description),
      image: pick(slot.image, def.image),
    };
  });
}

/**
 * Builds the 10 feature items. Title and icon fall back independently to the
 * default at the same position, so partial edits still render a full grid.
 */
function resolveFeatureItems(
  theme: ThemeSchema | null | undefined,
  defaults: AdminHomeFeature[],
): AdminHomeFeature[] {
  const slots: Array<Partial<AdminHomeFeature>> = [
    { title: theme?.home_feature_1_title, icon: theme?.home_feature_1_icon },
    { title: theme?.home_feature_2_title, icon: theme?.home_feature_2_icon },
    { title: theme?.home_feature_3_title, icon: theme?.home_feature_3_icon },
    { title: theme?.home_feature_4_title, icon: theme?.home_feature_4_icon },
    { title: theme?.home_feature_5_title, icon: theme?.home_feature_5_icon },
    { title: theme?.home_feature_6_title, icon: theme?.home_feature_6_icon },
    { title: theme?.home_feature_7_title, icon: theme?.home_feature_7_icon },
    { title: theme?.home_feature_8_title, icon: theme?.home_feature_8_icon },
    { title: theme?.home_feature_9_title, icon: theme?.home_feature_9_icon },
    { title: theme?.home_feature_10_title, icon: theme?.home_feature_10_icon },
  ];

  return defaults.map((def, i) => {
    const slot = slots[i] ?? {};
    return {
      title: pick(slot.title, def.title),
      icon: pick(slot.icon, def.icon),
    };
  });
}

export function resolveAdminHomeContent(
  theme?: ThemeSchema | null,
): AdminHomeContent {
  const d = ADMIN_HOME_DEFAULTS;
  return {
    hero: {
      eyebrow: pick(theme?.home_hero_eyebrow, d.hero.eyebrow),
      title: pick(theme?.home_hero_title, d.hero.title),
      subtitle: pick(theme?.home_hero_subtitle, d.hero.subtitle),
      primaryCta: pick(theme?.home_hero_primary_cta, d.hero.primaryCta),
      secondaryCta: pick(theme?.home_hero_secondary_cta, d.hero.secondaryCta),
      primaryCtaLink: pick(
        theme?.home_hero_primary_cta_link,
        d.hero.primaryCtaLink,
      ),
      secondaryCtaLink: pick(
        theme?.home_hero_secondary_cta_link,
        d.hero.secondaryCtaLink,
      ),
      backgroundImage: pick(
        theme?.home_hero_background_image,
        d.hero.backgroundImage,
      ),
    },
    intro: {
      title: pick(theme?.home_intro_title, d.intro.title),
      body: pick(theme?.home_intro_body, d.intro.body),
    },
    partners: {
      title: pick(theme?.home_partners_title, d.partners.title),
      subtitle: pick(theme?.home_partners_subtitle, d.partners.subtitle),
      logos: [
        theme?.home_partner_logo_1,
        theme?.home_partner_logo_2,
        theme?.home_partner_logo_3,
        theme?.home_partner_logo_4,
        theme?.home_partner_logo_5,
        theme?.home_partner_logo_6,
      ]
        .map((url) => url?.trim())
        .filter((url): url is string => Boolean(url)),
    },
    audience: {
      title: pick(theme?.home_audience_title, d.audience.title),
      subtitle: pick(theme?.home_audience_subtitle, d.audience.subtitle),
      cards: resolveAudienceCards(theme, d.audience.cards),
    },
    features: {
      title: pick(theme?.home_features_title, d.features.title),
      subtitle: pick(theme?.home_features_subtitle, d.features.subtitle),
      items: resolveFeatureItems(theme, d.features.items),
    },
    showcase: {
      title: pick(theme?.home_showcase_title, d.showcase.title),
      body: pick(theme?.home_showcase_body, d.showcase.body),
      checklistTitle: pick(
        theme?.home_showcase_checklist_title,
        d.showcase.checklistTitle,
      ),
      cta: pick(theme?.home_showcase_cta, d.showcase.cta),
      ctaLink: pick(theme?.home_showcase_cta_link, d.showcase.ctaLink),
      image: pick(theme?.home_showcase_image, d.showcase.image),
      videoUrl: pick(theme?.home_showcase_video_url, d.showcase.videoUrl),
    },
    news: {
      title: pick(theme?.home_news_title, d.news.title),
      subtitle: pick(theme?.home_news_subtitle, d.news.subtitle),
    },
    faq: {
      title: pick(theme?.home_faq_title, d.faq.title),
      subtitle: pick(theme?.home_faq_subtitle, d.faq.subtitle),
      items: parseFaqItems(theme?.home_faq_items) ?? d.faq.items,
    },
  };
}
