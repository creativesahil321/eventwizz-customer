import type { ThemeSchema } from "@/types/theme.types";
import { normalizeThemeTypography } from "@/lib/normalize-theme-payload";

/**
 * Google Fonts offered as presets in Site Essentials typography.
 */
export const SITE_ESSENTIALS_GOOGLE_FONT_NAMES = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Poppins",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Inter",
  "DM Sans",
  "Libre Baskerville",
  "Work Sans",
  /* Premium / display — events & venues (Try theme + Typography) */
  "Cinzel",
  "Cormorant Garamond",
  "Fraunces",
  "DM Serif Display",
  "Crimson Text",
  "EB Garamond",
  "Outfit",
  "Plus Jakarta Sans",
  "Sora",
  "Space Grotesk",
  "Syne",
  "Instrument Sans",
  "Afacad",
  "Figtree",
  "Source Sans 3",
  "Nunito Sans",
  "Libre Caslon Display",
  "Karla",
  "Marcellus",
  "Public Sans",
  "Jost",
  "Archivo",
  "Baloo 2",
  "Abril Fatface",
] as const;

const ALLOWLISTED_GOOGLE_FONTS = new Set<string>(
  SITE_ESSENTIALS_GOOGLE_FONT_NAMES,
);

const GENERIC_CSS_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
  "inherit",
  "initial",
  "unset",
]);

/** Google families loaded with a serif fallback in CSS stacks */
const SERIF_GOOGLE_FONT_NAMES = new Set<string>([
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Libre Baskerville",
  "Cinzel",
  "Cormorant Garamond",
  "Fraunces",
  "DM Serif Display",
  "Crimson Text",
  "EB Garamond",
  "Libre Caslon Display",
  "Marcellus",
  "Abril Fatface",
]);

export function siteEssentialsGoogleFontStack(name: string): string {
  const suffix = SERIF_GOOGLE_FONT_NAMES.has(name) ? "serif" : "sans-serif";
  return `${name}, ${suffix}`;
}

/** Preset options for the typography form (single source of truth). */
export const SITE_ESSENTIALS_GOOGLE_FONTS_UI = SITE_ESSENTIALS_GOOGLE_FONT_NAMES.map(
  (n) => ({ name: n, value: siteEssentialsGoogleFontStack(n) })
);

export const THEME_GOOGLE_FONTS_LINK_ID = "site-essentials-google-fonts-theme";

/**
 * First font family from a CSS font stack (e.g. `"Open Sans", sans-serif` → Open Sans).
 */
export function primaryFontFamilyFromStack(stack: string): string {
  const trimmed = stack.trim();
  const quoted = trimmed.match(/^["']([^"']+)["']\s*,/);
  if (quoted?.[1]) return quoted[1].trim();
  const part = trimmed.split(",")[0]?.trim() ?? "";
  return part.replace(/^["']|["']$/g, "").trim();
}

/** Trial / custom vendor fonts that must not hit fonts.googleapis.com (404 HTML). */
function isBlockedGoogleFontFamily(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/trial/i.test(trimmed)) return true;
  if (/cameraplain/i.test(trimmed)) return true;
  return false;
}

export function isAllowlistedGoogleFontFamily(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || isBlockedGoogleFontFamily(trimmed)) return false;
  return ALLOWLISTED_GOOGLE_FONTS.has(trimmed);
}

/** Families declared in a fonts.googleapis.com stylesheet URL. */
export function extractGoogleFontFamiliesFromStylesheetUrl(url: string): string[] {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("fonts.googleapis.com")) return [];
    const families: string[] = [];
    for (const value of parsed.searchParams.getAll("family")) {
      const decoded = decodeURIComponent(value.replace(/\+/g, " "));
      const name = decoded.split(":")[0]?.trim();
      if (name) families.push(name);
    }
    return families;
  } catch {
    return [];
  }
}

export function filterAllowlistedGoogleFontFamilies(
  families: string[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const family of families) {
    if (!isAllowlistedGoogleFontFamily(family)) continue;
    if (seen.has(family)) continue;
    seen.add(family);
    out.push(family);
  }
  return out;
}

export function collectSiteEssentialsGoogleFamilies(
  ...stacks: (string | undefined | null)[]
): string[] {
  const out: string[] = [];
  for (const stack of stacks) {
    if (!stack) continue;
    const primary = primaryFontFamilyFromStack(stack);
    if (!primary) continue;
    if (GENERIC_CSS_FAMILIES.has(primary.toLowerCase())) continue;
    out.push(primary);
  }
  return filterAllowlistedGoogleFontFamilies(out);
}

function collectGoogleFamiliesFromThemeCustomUrls(
  urls: unknown,
): string[] {
  if (!Array.isArray(urls)) return [];
  const families: string[] = [];
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (!parsed.hostname.includes("fonts.googleapis.com")) continue;
      families.push(...extractGoogleFontFamiliesFromStylesheetUrl(trimmed));
    } catch {
      continue;
    }
  }
  return filterAllowlistedGoogleFontFamilies(families);
}

/**
 * Google Fonts CSS2 URL for the given families (weights used across headings/body).
 */
export function siteEssentialsGoogleFontsStylesheetHref(
  families: string[]
): string | null {
  if (families.length === 0) return null;
  const params = families
    .map(
      (name) =>
        `family=${encodeURIComponent(name)}:wght@400;500;600;700`
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export function googleFontsHrefFromTheme(
  theme: ThemeSchema | null | undefined
): string | null {
  const normalized = theme ? normalizeThemeTypography(theme) : theme;
  const heading = normalized?.typography?.fontFamily?.heading;
  const body = normalized?.typography?.fontFamily?.body;
  const fromStacks = collectSiteEssentialsGoogleFamilies(heading, body);
  const fromLegacyCustomUrls = collectGoogleFamiliesFromThemeCustomUrls(
    normalized?.typography?.customFontStylesheetUrls,
  );
  const families = filterAllowlistedGoogleFontFamilies([
    ...fromStacks,
    ...fromLegacyCustomUrls,
  ]);
  return siteEssentialsGoogleFontsStylesheetHref(families);
}

/** Keeps one <link> in document head for tenant theme Google Fonts (SSR + client updates). */
export function syncDocumentGoogleFontLinkForTheme(
  theme: ThemeSchema | null | undefined
): void {
  if (typeof document === "undefined") return;
  const href = googleFontsHrefFromTheme(theme);
  let link = document.getElementById(
    THEME_GOOGLE_FONTS_LINK_ID
  ) as HTMLLinkElement | null;

  if (!href) {
    link?.remove();
    return;
  }

  if (!link) {
    link = document.createElement("link");
    link.id = THEME_GOOGLE_FONTS_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = href;
}
