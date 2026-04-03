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
 */
export interface ContactDetails {
  email: string; // Primary contact email
  alternativeEmail: string; // Alternative contact email
  phone: string; // Primary phone number
  alternativePhone: string; // Alternative phone number
  address: string; // Physical address
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
 * Location data structure with event information
 */
export interface LocationData {
  is_default?: unknown;
  city: string;
  slug: string;
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

  logo?: string;
  favicon?: string;
  name?: string;
  /**
   * Domain role (admin, vendor, customer)
   */
  website_role?: string;

  // Location data
  locations?: LocationData[];

  // Landing page content fields
  banner_heading?: string;
  /** Substring of banner_heading to style as accent when headingEmphasis is accent_tail */
  banner_heading_accent?: string | null;
  banner_sub_heading?: string;
  cover_image?: string;
  cover_video?: string; // Video URL for landing page banner

  // About section fields
  about_title?: string;
  about_description?: string;
  about_link_title?: string;
  about_cta_link?: string;

  // Event section fields
  event_title_1?: string;
  event_title_2?: string;
  event_gallery_title?: string;

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
