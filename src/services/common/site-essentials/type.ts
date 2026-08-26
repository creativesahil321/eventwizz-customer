import type { Event, GalleryImage } from "@/services/common/events/type";
import type { LocationData } from "@/types/theme.types";

export interface SocialLoginColors {
  google: string;
  microsoft: string;
}

export interface Colors {
  primary: string;
  secondary: string;
  header: string;
  footer: string;
  background: string;
  surface: string;
  text: string;
  textDimmed: string;
  socialLogin: SocialLoginColors;
}

export interface FontFamily {
  heading: string;
  body: string;
}

export interface Typography {
  fontFamily: FontFamily;
  /** https:// CSS URLs for webfonts not on Google Fonts (max 5). */
  customFontStylesheetUrls?: string[];
  /** Public-site heading style; omit = uniform */
  headingEmphasis?: "uniform" | "accent_tail" | "full_primary";
}

export interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
}

export interface SEO {
  title: string;
  description: string;
  keywords: string;
}

export interface SiteEssentialsContactDetails {
  email?: string;
  phone?: string;
  phoneNumber?: string;
  address?: string;
  alternativeEmail?: string;
  alternativePhone?: string;
  alternativePhoneNumber?: string;
  alternativeAddress?: string;
}

export interface SiteEssentials {
  colors: Colors;
  typography: Typography;
  /**
   * Catalog recipe currently applied. `null` = custom colors/fonts.
   * Palette ids are never stored here.
   */
  theme_preset_id?: string | null;
  socialLinks: SocialLinks;
  seo: SEO;
  /** Vendor-level contact (same shape as public theme `contactDetails`) */
  contactDetails?: SiteEssentialsContactDetails;
  logo: string;
  favicon: string;
  /** ISO-8601 UTC; bumped when logo / favicon / main_landing_cover_image is replaced */
  media_updated_at?: string | null;
  name: string;
  copyright: string;
  /** Short blurb under the footer logo. Falls back to about_description when empty. */
  footer_brand_description?: string | null;
  domain: string | null;
  website_role: string;
  banner_heading: string | null;
  /** Optional; omit until API supports it */
  banner_heading_accent?: string | null;
  /** Hero heading + subheading alignment; omit = center */
  banner_heading_align?: "left" | "center" | "right";
  /** Hero block vertical position in band; omit = center */
  banner_heading_valign?: "top" | "center" | "bottom";
  banner_sub_heading: string | null;
  about_title: string | null;
  about_description: string | null;
  about_link_title: string | null;
  about_cta_link: string | null;
  terms_and_conditions?: string | null;
  privacy_policy?: string | null;
  refund_policy?: string | null;
  cookie_policy?: string | null;
  vendor_terms?: string | null;
  about_page_content?: string | null;
  how_it_works_page_content?: string | null;
  contact_page_content?: string | null;
  company_legal_name?: string | null;
  company_number?: string | null;
  company_registered_office?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  event_title_1: string | null;
  event_title_2: string | null;
  event_gallery_title: string | null;
  cover_image: string | null;
  cover_video: string | null;
  main_landing_cover_image?: string | null;
  main_landing_banner_heading?: string | null;
  main_landing_banner_sub_heading?: string | null;
  main_landing_locations_list_title?: string | null;
  main_landing_locations_list_subtitle?: string | null;
  /** Read-only list for main landing preview */
  locations?: LocationData[];
  /** Read-only — location slug when GET includes `?slug=` */
  slug?: string | null;
  /** Read-only — marketing cards for location preview */
  latest_events?: Event[];
  upcoming_events?: Event[];
  /** URL strings or `{ id, url }` objects */
  event_gallery?: GalleryImage[] | string[];
}

export interface SiteEssentialsResponse {
  status: boolean;
  message: string;
  data: SiteEssentials;
  errors: string[];
}
