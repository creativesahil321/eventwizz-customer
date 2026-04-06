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

export interface SiteEssentials {
  colors: Colors;
  typography: Typography;
  socialLinks: SocialLinks;
  seo: SEO;
  logo: string;
  favicon: string;
  name: string;
  copyright: string;
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
  event_title_1: string | null;
  event_title_2: string | null;
  event_gallery_title: string | null;
  cover_image: string | null;
  cover_video: string | null;
}

export interface SiteEssentialsResponse {
  status: boolean;
  message: string;
  data: SiteEssentials;
  errors: string[];
}
