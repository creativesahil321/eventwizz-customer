/**
 * Shared types for the "Import from website" feature.
 *
 * Kept in a dedicated, dependency-free module so both the server route handler
 * and the client hook/apply helpers can import them without pulling server-only
 * code into the client bundle.
 */

/** AI-rewritten (or verbatim) textual content mapped to Site Essentials fields. */
export interface WebsiteImportContent {
  /** Suggested site/brand name (informational — Site Name is system-managed). */
  name?: string;
  banner_heading?: string;
  banner_sub_heading?: string;
  about_title?: string;
  /** Plain text (no HTML) — used for the About section description. */
  about_description?: string;
  /** Short footer blurb under the logo (plain text, max 180 chars). */
  footer_brand_description?: string;
  event_title_1?: string;
  event_title_2?: string;
  event_gallery_title?: string;
  seo: {
    title: string;
    description: string;
    keywords: string;
  };
  /** Short copyright / disclaimer line (rich text allowed). */
  copyright?: string;
  /** Rich-text HTML for the About info page. */
  about_page_content?: string;
  /** Rich-text HTML for the Contact info page. */
  contact_page_content?: string;
  company_legal_name?: string;
  company_email?: string;
  company_phone?: string;
  company_registered_office?: string;
  /** Optional FAQ pairs discovered on the source site. */
  faqs?: Array<{ question: string; answer: string }>;
}

/** Absolute image URLs discovered on the source site. */
export interface WebsiteImportImages {
  logo?: string;
  cover?: string;
  favicon?: string;
  gallery: string[];
}

export interface WebsiteImportTypography {
  /** CSS font stack for headings (e.g. "Playfair Display, serif"). */
  heading?: string;
  /** CSS font stack for body text (e.g. "Lato, sans-serif"). */
  body?: string;
  /** Detected family names (for the preview UI). */
  headingName?: string;
  bodyName?: string;
  /** Font stylesheet URLs to load non-preset families (https only). */
  stylesheetUrls: string[];
}

export interface WebsiteImportSocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
}

/** Contrast-safe theme built from the scraped palette (preserves dark brands). */
export interface WebsiteImportColorTheme {
  primary: string;
  secondary: string;
  header: string;
  footer: string;
  background: string;
  surface: string;
  text: string;
  textDimmed: string;
  socialLogin: {
    google: string;
    microsoft: string;
  };
}

export interface WebsiteImportResult {
  sourceUrl: string;
  content: WebsiteImportContent;
  images: WebsiteImportImages;
  typography: WebsiteImportTypography;
  socialLinks: WebsiteImportSocialLinks;
  /**
   * Ranked unique palette (hex) from the page — most brand-relevant first.
   * Frequency-aware; not a flat WordPress editor swatch dump.
   */
  colors: string[];
  /**
   * Ready-to-apply theme derived from `colors`. Prefer this over re-running
   * `/api/ai/color-theme` (which forces a light "professional" look).
   */
  colorTheme?: WebsiteImportColorTheme;
  contact: {
    emails: string[];
    phones: string[];
  };
  /** True when the AI paraphrased the copy; false when imported verbatim. */
  rewritten: boolean;
  /**
   * Soft warnings for a successful import that is missing assets
   * (e.g. no usable cover images found).
   */
  warnings?: string[];
}

/** Structured API error body for the import-website route. */
export interface WebsiteImportErrorBody {
  error: string;
  code?:
    | "invalid_url"
    | "fetch_failed"
    | "blocked"
    | "no_content"
    | "timeout"
    | "server_error";
  /** Short UK-English guidance for the user. */
  hint?: string;
}

export interface WebsiteImportRequestBody {
  url: string;
  /** When true (default) the AI rewrites copy to be original. */
  rewrite?: boolean;
}
