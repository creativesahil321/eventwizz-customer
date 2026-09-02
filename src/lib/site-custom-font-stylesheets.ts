import type { ThemeSchema } from "@/types/theme.types";

/** Matches `<link id>`s injected in root layout and synced on the client. */
export const THEME_CUSTOM_FONT_STYLESHEET_LINK_ID_PREFIX =
  "theme-custom-font-stylesheet-";

const MAX_CUSTOM_FONT_STYLESHEETS = 5;

/**
 * Sanitizes tenant-provided stylesheet URLs: https only, deduped, capped.
 */
export function normalizeCustomFontStylesheetUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of urls) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") continue;
      // Google families are consolidated in `googleFontsHrefFromTheme` — skip
      // duplicate / invalid fonts.googleapis.com links (trial fonts return HTML).
      if (parsed.hostname.includes("fonts.googleapis.com")) continue;
      const href = parsed.href;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
      if (out.length >= MAX_CUSTOM_FONT_STYLESHEETS) break;
    } catch {
      continue;
    }
  }
  return out;
}

/** Removes and re-appends theme-level custom font `<link>`s (document head). */
export function syncDocumentCustomFontStylesheetLinksForTheme(
  theme: ThemeSchema | null | undefined,
): void {
  if (typeof document === "undefined") return;
  const urls = normalizeCustomFontStylesheetUrls(
    theme?.typography?.customFontStylesheetUrls,
  );
  document
    .querySelectorAll(
      `link[id^="${THEME_CUSTOM_FONT_STYLESHEET_LINK_ID_PREFIX}"]`,
    )
    .forEach((el) => el.remove());
  urls.forEach((href, i) => {
    const link = document.createElement("link");
    link.id = `${THEME_CUSTOM_FONT_STYLESHEET_LINK_ID_PREFIX}${i}`;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  });
}
