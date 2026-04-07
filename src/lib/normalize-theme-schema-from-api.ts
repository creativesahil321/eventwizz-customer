import type { ThemeSchema } from "@/types/theme.types";
import { normalizeCustomFontStylesheetUrls } from "@/lib/site-custom-font-stylesheets";

/** Laravel / legacy payloads sometimes use this key (capital S in “Sheet”). */
type ApiTypography = NonNullable<ThemeSchema["typography"]> & {
  customFontStyleSheetUrls?: string[];
};

/**
 * Merge alternate API keys into canonical `ThemeSchema` so SSR layout and
 * ThemeProvider load CDN font stylesheets and typography consistently.
 */
export function normalizeThemeSchemaFromApi(
  theme: ThemeSchema | null | undefined,
): ThemeSchema | null {
  if (theme == null) return null;
  const typo = theme.typography as ApiTypography | undefined;
  if (!typo) return theme;

  const mergedUrls =
    typo.customFontStylesheetUrls ?? typo.customFontStyleSheetUrls;
  const customFontStylesheetUrls =
    normalizeCustomFontStylesheetUrls(mergedUrls);

  const { customFontStyleSheetUrls: _legacy, ...typoRest } = typo;

  return {
    ...theme,
    typography: {
      ...typoRest,
      customFontStylesheetUrls,
    },
  };
}
