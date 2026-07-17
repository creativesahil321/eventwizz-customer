/**
 * The backend returns CMS page content grouped under an `info_pages` object
 * (terms_and_conditions, privacy_policy, refund_policy, cookie_policy,
 * vendor_terms, about_page_content, how_it_works_page_content,
 * contact_page_content). The rest of the app — public pages, the theme, and the
 * Site Essentials form — reads these as flat top-level keys.
 *
 * This helper spreads `info_pages` onto the root so every consumer keeps working
 * without special-casing the nested shape. Safe to call on any API payload:
 * returns the value untouched when `info_pages` is missing.
 */
export function flattenInfoPages<T>(data: T): T {
  if (!data || typeof data !== "object") return data;

  const record = data as Record<string, unknown>;
  const infoPages = record.info_pages;

  if (!infoPages || typeof infoPages !== "object") return data;

  return {
    ...record,
    ...(infoPages as Record<string, unknown>),
  } as T;
}
