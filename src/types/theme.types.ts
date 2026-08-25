/**
 * Theme System - Type Definitions
 *
 * Defines the structure of theme data that can be customized per domain.
 */

/**
 * Theme color configuration
 */
export interface ThemeColors {
  primary?: string; // Main brand color
  secondary?: string; // Secondary brand color
  header?: string; // Header background color
  footer?: string; // Footer background color
  background?: string; // Page background
  surface?: string; // Card/element surfaces
  text?: string; // Main text color
  textDimmed?: string; // Secondary/dimmed text color
  socialLogin?: {
    google?: string; // Google login button color
    microsoft?: string; // Microsoft login button color
    [key: string]: string | undefined; // Other login platforms
  };
}

import type { HeadingEmphasis } from "@/lib/heading-emphasis";

/**
 * Typography configuration
 */
export interface ThemeTypography {
  fontFamily: {
    heading: string; // Font for headings
    body: string; // Font for body text
  };
  /** Optional https:// stylesheet URLs (e.g. CDNFonts) for non–Google Fonts. */
  customFontStylesheetUrls?: string[];
  /**
   * How marketing headings render on the public vendor site.
   * Omitted or unknown values are treated as `uniform` on the frontend.
   */
  headingEmphasis?: HeadingEmphasis;
}

/**
 * Contact details configuration
 * Theme API may omit alternative* fields; consumers should treat them as optional.
 */
export interface ContactDetails {
  email: string; // Primary contact email
  alternativeEmail?: string; // Alternative contact email
  phone: string; // Primary phone number
  alternativePhone?: string; // Alternative phone number
  address: string; // Physical address
  /** Legacy / alternate API key — prefer `phone` */
  phoneNumber?: string;
  alternativePhoneNumber?: string;
  alternativeAddress?: string;
}

/**
 * Social media links configuration
 */
export interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  [platform: string]: string | undefined;
}

/**
 * SEO configuration
 */
export interface SEO {
  title: string;
  description: string;
  keywords: string;
}

/**
 * Latest upcoming event information for a location
 */
export interface LatestUpcomingEvent {
  name: string;
  date: string;
}

/**
 * Lightweight live/bookable event from GET /theme/settings → data.live_events.
 * Used by the public chatbot for direct booking redirects.
 */
export interface LiveEvent {
  title: string;
  slug: string;
  location_slug: string;
  location_city: string;
}

/**
 * Location data structure with event information
 * Theme `/theme/settings` may include per-location contact fields.
 */
export interface LocationData {
  id?: number;
  is_default?: unknown;
  city: string;
  slug: string;
  address?: string | null;
  email?: string | null;
  /** Per-location phone from theme settings API */
  phone_number?: string | null;
  cover_image?: string | null;
  total_events?: number;
  latest_upcoming_event?: LatestUpcomingEvent;
}

/**
 * Main theme schema interface defining all customizable properties
 * This is primarily used in API responses and theme service
 */
export interface ThemeSchema {
  colors?: {
    primary: string;
    secondary: string;
    header?: string;
    footer?: string;
    background?: string;
    surface?: string;
    text?: string;
    textDimmed?: string;
    socialLogin?: {
      google?: string;
      microsoft?: string;
      [platform: string]: string | undefined;
    };
  };
  typography?: {
    fontFamily?: {
      heading?: string;
      body?: string;
    };
    customFontStylesheetUrls?: string[];
    headingEmphasis?: HeadingEmphasis;
  };

  /** Catalog recipe id, or null when the vendor customized tokens. */
  theme_preset_id?: string | null;

  logo?: string;
  favicon?: string;
  /**
   * DB-backed cache-buster for stable-URL assets (`logo`, `favicon`,
   * `main_landing_cover_image`). ISO-8601 UTC; null until first replace.
   * Same value on SSR + client — use with `addCacheBusting(url, media_updated_at)`.
   */
  media_updated_at?: string | null;
  name?: string;
  /**
   * Domain role (admin, vendor, customer)
   */
  website_role?: string;

  // Location data
  locations?: LocationData[];

  /**
   * Active/bookable events for public chat redirects.
   * Keep lean: title + slugs only (no heavy event payloads).
   */
  live_events?: LiveEvent[];

  // Landing page content fields
  banner_heading?: string;
  /** Substring of banner_heading for accent tail: heading font + primary when headingEmphasis is accent_tail */
  banner_heading_accent?: string | null;
  /** Landing hero heading + subheading alignment; omit = center */
  banner_heading_align?: "left" | "center" | "right";
  /** Landing hero vertical position; omit = center */
  banner_heading_valign?: "top" | "center" | "bottom";
  banner_sub_heading?: string;
  cover_image?: string;
  cover_video?: string; // Video URL for landing page banner

  /** Multi-location vendor home (before location selection) */
  main_landing_cover_image?: string;
  main_landing_banner_heading?: string;
  main_landing_banner_sub_heading?: string;
  main_landing_locations_list_title?: string;
  main_landing_locations_list_subtitle?: string;

  // About section fields
  about_title?: string;
  about_description?: string;
  about_link_title?: string;
  about_cta_link?: string;

  // Public CMS pages (global)
  terms_and_conditions?: string;
  privacy_policy?: string;
  refund_policy?: string;
  cookie_policy?: string;
  vendor_terms?: string;
  about_page_content?: string;
  how_it_works_page_content?: string;
  contact_page_content?: string;
  company_legal_name?: string;
  company_number?: string;
  company_registered_office?: string;
  company_phone?: string;
  company_email?: string;

  // Event section fields
  event_title_1?: string;
  event_title_2?: string;
  event_gallery_title?: string;

  // Admin marketing home (white-label) section content — generic keys.
  home_hero_eyebrow?: string;
  home_hero_title?: string;
  home_hero_subtitle?: string;
  home_hero_primary_cta?: string;
  home_hero_secondary_cta?: string;
  /** CTA target URLs/paths (empty = default book-a-call behaviour). */
  home_hero_primary_cta_link?: string;
  home_hero_secondary_cta_link?: string;
  /** Hero background image URL (GET) / File (PATCH). */
  home_hero_background_image?: string;
  home_intro_title?: string;
  /** Rich HTML */
  home_intro_body?: string;
  home_partners_title?: string;
  home_partners_subtitle?: string;
  /** Trusted-by partner logo image URLs (up to 6). */
  home_partner_logo_1?: string;
  home_partner_logo_2?: string;
  home_partner_logo_3?: string;
  home_partner_logo_4?: string;
  home_partner_logo_5?: string;
  home_partner_logo_6?: string;
  home_audience_title?: string;
  home_audience_subtitle?: string;
  /** Audience cards ("Who is it for?") — 6 fixed slots (title, description, image URL). */
  home_audience_1_title?: string;
  home_audience_1_description?: string;
  home_audience_1_image?: string;
  home_audience_2_title?: string;
  home_audience_2_description?: string;
  home_audience_2_image?: string;
  home_audience_3_title?: string;
  home_audience_3_description?: string;
  home_audience_3_image?: string;
  home_audience_4_title?: string;
  home_audience_4_description?: string;
  home_audience_4_image?: string;
  home_audience_5_title?: string;
  home_audience_5_description?: string;
  home_audience_5_image?: string;
  home_audience_6_title?: string;
  home_audience_6_description?: string;
  home_audience_6_image?: string;
  home_features_title?: string;
  home_features_subtitle?: string;
  /** Feature items ("Why use?") — 10 fixed slots (title + icon name). */
  home_feature_1_title?: string;
  home_feature_1_icon?: string;
  home_feature_2_title?: string;
  home_feature_2_icon?: string;
  home_feature_3_title?: string;
  home_feature_3_icon?: string;
  home_feature_4_title?: string;
  home_feature_4_icon?: string;
  home_feature_5_title?: string;
  home_feature_5_icon?: string;
  home_feature_6_title?: string;
  home_feature_6_icon?: string;
  home_feature_7_title?: string;
  home_feature_7_icon?: string;
  home_feature_8_title?: string;
  home_feature_8_icon?: string;
  home_feature_9_title?: string;
  home_feature_9_icon?: string;
  home_feature_10_title?: string;
  home_feature_10_icon?: string;
  home_showcase_title?: string;
  /** Rich HTML */
  home_showcase_body?: string;
  home_showcase_checklist_title?: string;
  home_showcase_cta?: string;
  home_showcase_cta_link?: string;
  /** Showcase poster image URL (GET) / File (PATCH). */
  home_showcase_image?: string;
  /** Showcase demo video (YouTube/Vimeo/MP4 URL). Empty = no video. */
  home_showcase_video_url?: string;
  home_news_title?: string;
  home_news_subtitle?: string;
  home_faq_title?: string;
  home_faq_subtitle?: string;
  /**
   * Repeatable FAQ list on the admin home page. Returned as an array on GET;
   * may arrive as a JSON-encoded string when sent via multipart PATCH.
   */
  home_faq_items?: Array<{ question: string; answer: string }> | string;

  // Additional fields
  copyright?: string;
  domain?: string;
  /** Display symbol from tenant/theme API (e.g. £, $, €) */
  currency_symbol?: string;
  contactDetails?: ContactDetails;
  socialLinks?: SocialLinks;
  seo?: SEO;
}

/**
 * Complete theme settings with all required properties
 */
export interface ThemeSettings {
  colors: ThemeColors;
  typography: ThemeTypography;
  contactDetails: ContactDetails;
  socialLinks: SocialLinks;
  seo: SEO;
  logo: string;
  favicon: string;
  name: string;
  copyright: string;
  domain: string;
  website_role: string;
  /** Resolved display symbol for money formatting */
  currency_symbol: string;
  /** Active/bookable events for chatbot booking redirects */
  live_events?: LiveEvent[];
  locations?: LocationData[];
}

/**
 * API response for theme data
 */
export interface ThemeApiResponse {
  status: boolean;
  message: string;
  data: ThemeSettings;
  errors: string[];
}
