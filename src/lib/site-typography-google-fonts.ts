import type { ThemeSchema } from "@/types/theme.types";

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
] as const;

const GOOGLE_SET = new Set<string>(SITE_ESSENTIALS_GOOGLE_FONT_NAMES);

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

export function collectSiteEssentialsGoogleFamilies(
  ...stacks: (string | undefined | null)[]
): string[] {
  const out = new Set<string>();
  for (const stack of stacks) {
    if (!stack) continue;
    const primary = primaryFontFamilyFromStack(stack);
    if (GOOGLE_SET.has(primary)) out.add(primary);
  }
  return [...out];
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
  if (!theme?.typography?.fontFamily) return null;
  const { heading, body } = theme.typography.fontFamily;
  const families = collectSiteEssentialsGoogleFamilies(heading, body);
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
