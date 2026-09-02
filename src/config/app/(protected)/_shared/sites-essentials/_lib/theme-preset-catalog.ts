import type { ThemePresetsCatalog } from "@/services/common/theme/theme-presets.type";
import {
  SITE_THEME_PRESETS,
  TRY_THEME_COLOR_GRID_OPTIONS,
  TRY_THEME_FONT_GRID_OPTIONS,
  allPresetGridCdnStylesheetUrls,
  allPresetGridGoogleFontFamilies,
  isVenueThemePresetId,
  siteEssentialsFontPairKey,
  type SiteThemePreset,
  type TryThemeColorGridOption,
  type TryThemeFontGridOption,
} from "./site-theme-presets";
import { normalizeCustomFontStylesheetUrls } from "@/lib/site-custom-font-stylesheets";
import { isLightUiBackground } from "@/lib/wcag-color-contrast";

export type ThemePresetGroupKey = "venue" | "modern" | "classic" | "extra";

export type CatalogColorGridOption = TryThemeColorGridOption & {
  group: ThemePresetGroupKey;
  isLight: boolean;
  kind: "recipe" | "palette";
  headingFontLabel?: string;
  bodyFontLabel?: string;
};

export type CatalogFontGridOption = TryThemeFontGridOption & {
  group: ThemePresetGroupKey;
};

export type TryThemeCatalogView = {
  defaultPresetId: string;
  colorOptions: CatalogColorGridOption[];
  fontOptions: CatalogFontGridOption[];
  googleFamilies: string[];
  cdnStylesheetUrls: string[];
  recipesById: Map<string, SiteThemePreset>;
  fromApi: boolean;
};

function groupFromPresetId(id: string): ThemePresetGroupKey {
  if (id.startsWith("venue-")) return "venue";
  if (id.startsWith("lovable-")) return "modern";
  return "classic";
}

function catalogPresetToSiteThemePreset(
  preset: ThemePresetsCatalog["presets"][number],
): SiteThemePreset | null {
  if (preset.kind !== "recipe" || !preset.typography) return null;
  return {
    id: preset.id as SiteThemePreset["id"],
    name: preset.name,
    tagline: preset.tagline,
    headingFontLabel: preset.headingFontLabel,
    bodyFontLabel: preset.bodyFontLabel,
    headingEmphasis: preset.headingEmphasis,
    swatch: preset.swatch,
    colors: preset.colors,
    typography: {
      fontFamily: { ...preset.typography.fontFamily },
      customFontStylesheetUrls: [
        ...(preset.typography.customFontStylesheetUrls ?? []),
      ],
    },
  };
}

function uniqueFontKey(heading: string, body: string): string {
  return `${heading}\0${body}`;
}

export function buildTryThemeCatalogView(
  catalog: ThemePresetsCatalog | null | undefined,
): TryThemeCatalogView {
  if (catalog && catalog.presets.length > 0) {
    return buildFromApiCatalog(catalog);
  }
  return buildFromStaticFallback();
}

function buildFromApiCatalog(catalog: ThemePresetsCatalog): TryThemeCatalogView {
  const recipesById = new Map<string, SiteThemePreset>();
  const colorOptions: CatalogColorGridOption[] = [];
  const seenColors = new Set<string>();

  for (const preset of catalog.presets) {
    const colorKey = JSON.stringify([
      preset.colors.primary,
      preset.colors.secondary,
      preset.colors.header,
      preset.colors.footer,
      preset.colors.background,
      preset.colors.surface,
      preset.colors.text,
      preset.colors.textDimmed,
    ]);
    if (seenColors.has(colorKey)) continue;
    seenColors.add(colorKey);

    if (preset.kind === "recipe") {
      const recipe = catalogPresetToSiteThemePreset(preset);
      if (recipe) recipesById.set(preset.id, recipe);
      colorOptions.push({
        source: "preset",
        id: preset.id as SiteThemePreset["id"],
        name: preset.name,
        tagline: preset.tagline,
        swatch: preset.swatch,
        colors: preset.colors,
        group: preset.group,
        isLight:
          typeof preset.isLight === "boolean"
            ? preset.isLight
            : isLightUiBackground(preset.colors.background),
        kind: "recipe",
        headingFontLabel: preset.headingFontLabel,
        bodyFontLabel: preset.bodyFontLabel,
      });
    } else {
      colorOptions.push({
        source: "extra",
        key: preset.id,
        name: preset.name,
        tagline: preset.tagline,
        swatch: preset.swatch,
        colors: preset.colors,
        group: "extra",
        isLight:
          typeof preset.isLight === "boolean"
            ? preset.isLight
            : isLightUiBackground(preset.colors.background),
        kind: "palette",
      });
    }
  }

  const fontOptions: CatalogFontGridOption[] = [];
  const seenFonts = new Set<string>();
  for (const recipe of recipesById.values()) {
    const key = siteEssentialsFontPairKey(recipe.typography);
    if (seenFonts.has(key)) continue;
    seenFonts.add(key);
    fontOptions.push({
      source: "preset",
      id: recipe.id,
      headingFontLabel: recipe.headingFontLabel,
      bodyFontLabel: recipe.bodyFontLabel,
      headingStack: recipe.typography.fontFamily.heading,
      bodyStack: recipe.typography.fontFamily.body,
      tagline: recipe.tagline,
      group: groupFromPresetId(recipe.id),
    });
  }
  for (const pair of catalog.fontPairs) {
    const key = uniqueFontKey(pair.headingStack, pair.bodyStack);
    if (seenFonts.has(key)) continue;
    seenFonts.add(key);
    fontOptions.push({
      source: "extra",
      key: pair.id,
      headingFontLabel: pair.headingFontLabel,
      bodyFontLabel: pair.bodyFontLabel,
      headingStack: pair.headingStack,
      bodyStack: pair.bodyStack,
      tagline: pair.tagline,
      group: "extra",
    });
  }

  const cdnStylesheetUrls: string[] = [];
  const seenCdn = new Set<string>();
  for (const recipe of recipesById.values()) {
    for (const href of normalizeCustomFontStylesheetUrls(
      recipe.typography.customFontStylesheetUrls,
    )) {
      if (seenCdn.has(href)) continue;
      seenCdn.add(href);
      cdnStylesheetUrls.push(href);
    }
  }

  return {
    defaultPresetId: catalog.defaultPresetId || "lovable-clean-white",
    colorOptions,
    fontOptions,
    googleFamilies:
      catalog.googleFamilies.length > 0
        ? catalog.googleFamilies
        : [
            ...new Set(
              [...recipesById.values()].flatMap((r) => [
                r.headingFontLabel,
                r.bodyFontLabel,
              ]),
            ),
          ],
    cdnStylesheetUrls,
    recipesById,
    fromApi: true,
  };
}

function buildFromStaticFallback(): TryThemeCatalogView {
  const recipesById = new Map<string, SiteThemePreset>();
  for (const preset of SITE_THEME_PRESETS) {
    recipesById.set(preset.id, preset);
  }

  const colorOptions: CatalogColorGridOption[] = TRY_THEME_COLOR_GRID_OPTIONS.map(
    (opt) => {
      if (opt.source === "preset") {
        return {
          ...opt,
          group: groupFromPresetId(opt.id),
          isLight: isLightUiBackground(opt.colors.background),
          kind: "recipe" as const,
          headingFontLabel: recipesById.get(opt.id)?.headingFontLabel,
          bodyFontLabel: recipesById.get(opt.id)?.bodyFontLabel,
        };
      }
      return {
        ...opt,
        group: "extra" as const,
        isLight: isLightUiBackground(opt.colors.background),
        kind: "palette" as const,
      };
    },
  );

  const fontOptions: CatalogFontGridOption[] = TRY_THEME_FONT_GRID_OPTIONS.map(
    (opt) =>
      opt.source === "preset"
        ? { ...opt, group: groupFromPresetId(opt.id) }
        : { ...opt, group: "extra" as const },
  );

  return {
    defaultPresetId: "lovable-clean-white",
    colorOptions,
    fontOptions,
    googleFamilies: allPresetGridGoogleFontFamilies(),
    cdnStylesheetUrls: allPresetGridCdnStylesheetUrls(),
    recipesById,
    fromApi: false,
  };
}

export function isRecipeColorOption(
  opt: CatalogColorGridOption,
): opt is CatalogColorGridOption & { source: "preset"; id: string } {
  return opt.kind === "recipe" && opt.source === "preset";
}

export { isVenueThemePresetId };
