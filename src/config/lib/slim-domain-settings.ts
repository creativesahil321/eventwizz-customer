import type { ThemeSchema } from "@/types/theme.types";

/**
 * CMS / info-page HTML bodies. Public `/policies`, `/contact`, etc. fetch these
 * via the dedicated info-pages API (`fetchInfoPagesHtml`) — they must not bloat
 * `domain-storage` localStorage.
 */
export const DOMAIN_SETTINGS_OMITTED_KEYS = [
  "info_pages",
  "terms_and_conditions",
  "privacy_policy",
  "refund_policy",
  "cookie_policy",
  "vendor_terms",
  "about_page_content",
  "how_it_works_page_content",
  "contact_page_content",
  // Company legal block — also served via info/contact pages, not shell chrome
  "company_legal_name",
  "company_number",
  "company_registered_office",
  "company_phone",
  "company_email",
] as const satisfies ReadonlyArray<string>;

type OmittedKey = (typeof DOMAIN_SETTINGS_OMITTED_KEYS)[number];

/**
 * Drop heavy unused fields before writing theme settings to localStorage.
 * Safe to call repeatedly — returns a shallow copy without mutating the source.
 */
export function slimDomainSettingsForStorage(
  settings: ThemeSchema | null | undefined,
): ThemeSchema | null {
  if (!settings) return null;

  const slim = { ...settings } as ThemeSchema & Record<string, unknown>;

  for (const key of DOMAIN_SETTINGS_OMITTED_KEYS) {
    delete slim[key as OmittedKey];
  }

  return slim;
}
