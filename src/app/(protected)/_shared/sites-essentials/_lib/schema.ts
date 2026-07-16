import { z } from "zod";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
} from "@/lib/word-count";

/** Hero subline; was 80 — too short for full sentences (often cut mid-word in CMS). */
export const BANNER_SUB_HEADING_MAX_CHARS = 220;
export const COPYRIGHT_MAX_CHARS = 200;
import { HEADING_EMPHASIS_VALUES } from "@/lib/heading-emphasis";
import {
  BANNER_HEADING_ALIGN_VALUES,
  BANNER_HEADING_VALIGN_VALUES,
} from "@/lib/banner-heading-align";

const siteEssentialsLocationSchema = z.object({
  id: z.number().optional(),
  city: z.string(),
  slug: z.string(),
  cover_image: z.string().nullable().optional(),
  total_events: z.number().optional(),
  latest_upcoming_event: z
    .object({
      name: z.string(),
      date: z.string(),
    })
    .optional(),
});

export const SiteEssentialsSchema = z.object({
  header_logo: z.string().min(2, { message: "Header logo is required." }),
  phone: z.string().min(2, { message: "Phone is required." }),
  short_description: z
    .string()
    .min(2, { message: "Short description is required." }),
  footer_logo: z.string().min(2, { message: "Footer logo is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  directions: z.string().min(2, { message: "Directions are required." }),
  phone_number: z.string().min(2, { message: "Phone number is required." }),
  location: z.string().min(2, { message: "Location is required." }),
  font: z.enum(
    [
      "Inter",
      "Roboto",
      "Nunito",
      "Lato",
      "Montserrat",
      "Poppins",
      "Open Sans",
      "Oswald",
      "Raleway",
      "Merriweather",
      "Ubuntu",
      "Noto Sans",
      "Cabin",
      "PT Sans",
    ],
    { message: "Invalid font selection." }
  ),
  primary_color: z.string().min(2, { message: "Primary color is required." }),
  secondary_color: z
    .string()
    .min(2, { message: "Secondary color is required." }),
  terms_and_conditions: z
    .string()
    .min(2, { message: "Terms and Conditions are required." }),
  privacy_and_policy: z
    .string()
    .min(2, { message: "Privacy and Policy is required." }),
});

export type SiteEssentials = z.infer<typeof SiteEssentialsSchema>;
// Define the font keys as a union type
export type FontName =
  | "Inter"
  | "Roboto"
  | "Nunito"
  | "Lato"
  | "Montserrat"
  | "Poppins"
  | "Open Sans"
  | "Oswald"
  | "Raleway"
  | "Merriweather"
  | "Ubuntu"
  | "Noto Sans"
  | "Cabin"
  | "PT Sans";

const httpsStylesheetUrlSchema = z
  .string()
  .max(2048, "URL must be at most 2048 characters")
  .refine(
    (s) => {
      try {
        return new URL(s.trim()).protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid https:// stylesheet URL" },
  );

// Form schema for validation
export const siteEssentialsFormSchema = z.object({
  colors: z.object({
    primary: z.string().optional().or(z.literal("")),
    secondary: z.string().optional().or(z.literal("")),
    header: z.string().optional().or(z.literal("")),
    footer: z.string().optional().or(z.literal("")),
    background: z.string().optional().or(z.literal("")),
    surface: z.string().optional().or(z.literal("")),
    text: z.string().optional().or(z.literal("")),
    textDimmed: z.string().optional().or(z.literal("")),
    socialLogin: z.object({
      google: z.string().optional().or(z.literal("")),
      microsoft: z.string().optional().or(z.literal("")),
    }),
  }),
  typography: z.object({
    fontFamily: z.object({
      heading: z.string().min(1, "Heading font is required"),
      body: z.string().min(1, "Body font is required"),
    }),
    customFontStylesheetUrls: z
      .array(httpsStylesheetUrlSchema)
      .max(5, "At most 5 custom font stylesheets")
      .optional(),
    headingEmphasis: z
      .enum(HEADING_EMPHASIS_VALUES)
      .optional(),
  }),

  socialLinks: z.object({
    facebook: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal("")),
    twitter: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal("")),
    instagram: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal("")),
    linkedin: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal("")),
    youtube: z
      .string()
      .url("Please enter a valid URL")
      .optional()
      .or(z.literal("")),
  }),
  seo: z.object({
    title: z.string().min(1, "SEO title is required"),
    description: z.string().min(1, "SEO description is required"),
    keywords: z.string().min(1, "SEO keywords are required"),
  }),
  name: z.string().max(50, "Site name must not exceed 50 characters").optional(),
  copyright: z
    .string()
    .min(1, "Copyright text is required")
    .max(
      COPYRIGHT_MAX_CHARS,
      `Copyright text must not exceed ${COPYRIGHT_MAX_CHARS} characters`,
    ),
  logo: z.any().optional(),
  favicon: z.any().optional(),
  domain: z.string().nullable().optional(),
  website_role: z.string().optional(),
  // Website content fields with updated names
  banner_heading: z
    .string()
    .max(500, "Banner heading is too long")
    .nullable()
    .optional()
    .refine(
      (s) => !s || countWords(s) <= BANNER_HEADING_MAX_WORDS,
      `Banner heading must not exceed ${BANNER_HEADING_MAX_WORDS} words`,
    ),
  banner_sub_heading: z
    .string()
    .max(
      BANNER_SUB_HEADING_MAX_CHARS,
      `Banner sub heading must not exceed ${BANNER_SUB_HEADING_MAX_CHARS} characters`,
    )
    .nullable()
    .optional(),
  banner_heading_accent: z
    .string()
    .max(120, "Accent phrase must not exceed 120 characters")
    .nullable()
    .optional(),
  banner_heading_align: z.enum(BANNER_HEADING_ALIGN_VALUES).optional(),
  banner_heading_valign: z.enum(BANNER_HEADING_VALIGN_VALUES).optional(),
  cover_image: z.any().optional(),
  cover_video: z.any().optional(),
  // Homepage layout fields with updated names
  about_title: z
    .string()
    .max(40, "About title must not exceed 40 characters")
    .nullable()
    .optional(),
  about_description: z.string().nullable().optional(),
  about_link_title: z
    .string()
    .max(18, "Button text must not exceed 18 characters")
    .nullable()
    .optional(),
  about_cta_link: z.string().nullable().optional(),
  terms_and_conditions: z.string().nullable().optional(),
  privacy_policy: z.string().nullable().optional(),
  refund_policy: z.string().nullable().optional(),
  cookie_policy: z.string().nullable().optional(),
  vendor_terms: z.string().nullable().optional(),
  about_page_content: z.string().nullable().optional(),
  how_it_works_page_content: z.string().nullable().optional(),
  contact_page_content: z.string().nullable().optional(),
  company_legal_name: z.string().nullable().optional(),
  company_number: z.string().nullable().optional(),
  company_registered_office: z.string().nullable().optional(),
  company_phone: z.string().nullable().optional(),
  company_email: z.string().nullable().optional(),
  event_title_1: z
    .string()
    .max(40, "Event title must not exceed 40 characters")
    .nullable()
    .optional(),
  event_title_2: z
    .string()
    .max(40, "Event title must not exceed 40 characters")
    .nullable()
    .optional(),
  event_gallery_title: z
    .string()
    .max(40, "Event gallery title must not exceed 40 characters")
    .nullable()
    .optional(),
  // Multi-location main home page (vendor root before location pick)
  main_landing_cover_image: z.any().optional(),
  main_landing_banner_heading: z
    .string()
    .max(500, "Main landing heading is too long")
    .nullable()
    .optional()
    .refine(
      (s) => !s || countWords(s) <= BANNER_HEADING_MAX_WORDS,
      `Main landing heading must not exceed ${BANNER_HEADING_MAX_WORDS} words`,
    ),
  main_landing_banner_sub_heading: z
    .string()
    .max(
      BANNER_SUB_HEADING_MAX_CHARS,
      `Main landing sub heading must not exceed ${BANNER_SUB_HEADING_MAX_CHARS} characters`,
    )
    .nullable()
    .optional(),
  main_landing_locations_list_title: z
    .string()
    .max(60, "Locations list title must not exceed 60 characters")
    .nullable()
    .optional(),
  main_landing_locations_list_subtitle: z
    .string()
    .max(120, "Locations list subtitle must not exceed 120 characters")
    .nullable()
    .optional(),
  /** From API — used for main landing preview only */
  locations: z.array(siteEssentialsLocationSchema).optional(),
  /** Read-only from API when previewing a location (`?slug=`) */
  slug: z.string().optional(),
  latest_events: z.array(z.record(z.unknown())).optional(),
  upcoming_events: z.array(z.record(z.unknown())).optional(),
  event_gallery: z
    .array(z.union([z.string(), z.object({ id: z.number().optional(), url: z.string() })]))
    .optional(),
  // Theme animations
  theme_animations: z
    .object({
      theme: z.string().optional(),
      enabled: z.boolean().optional(),
      intensity: z.enum(["low", "medium", "high"]).optional(),
    })
    .optional(),
});

export type SiteEssentialsFormValues = z.infer<typeof siteEssentialsFormSchema>;
