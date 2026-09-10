/**
 * One-off: dump the Next.js Try theme catalog as GET /theme/presets `data`.
 * Run: npx esbuild scripts/dump-theme-catalog.ts --bundle --platform=node --format=cjs --outfile=tmp-dump.cjs --alias:@=./src && node tmp-dump.cjs
 */
import {
  SITE_THEME_PRESETS,
  TRY_THEME_EXTRA_COLOR_PALETTES,
  TRY_THEME_EXTRA_FONT_PAIRS,
  allPresetGridGoogleFontFamilies,
} from "../src/app/(protected)/_shared/sites-essentials/_lib/site-theme-presets";
import { isLightUiBackground } from "../src/lib/wcag-color-contrast";
import { SITE_ESSENTIALS_GOOGLE_FONT_NAMES } from "../src/lib/site-typography-google-fonts";
import { normalizeHeadingEmphasis } from "../src/lib/heading-emphasis";

function groupFromId(id: string): "venue" | "modern" | "classic" {
  if (id.startsWith("venue-")) return "venue";
  if (id.startsWith("lovable-")) return "modern";
  return "classic";
}

const recipes = SITE_THEME_PRESETS.map((preset, index) => ({
  id: preset.id,
  kind: "recipe" as const,
  group: groupFromId(preset.id),
  name: preset.name,
  tagline: preset.tagline,
  headingFontLabel: preset.headingFontLabel,
  bodyFontLabel: preset.bodyFontLabel,
  headingEmphasis: normalizeHeadingEmphasis(preset.headingEmphasis),
  swatch: preset.swatch,
  sortOrder: (index + 1) * 10,
  isLight: isLightUiBackground(preset.colors.background),
  colors: preset.colors,
  typography: {
    fontFamily: { ...preset.typography.fontFamily },
    customFontStylesheetUrls: [
      ...(preset.typography.customFontStylesheetUrls ?? []),
    ],
    headingEmphasis: normalizeHeadingEmphasis(preset.headingEmphasis),
  },
}));

const palettes = TRY_THEME_EXTRA_COLOR_PALETTES.map((palette, index) => ({
  id: palette.key,
  kind: "palette" as const,
  group: "extra" as const,
  name: palette.name,
  tagline: palette.tagline,
  headingFontLabel: "",
  bodyFontLabel: "",
  headingEmphasis: "uniform" as const,
  swatch: palette.swatch,
  sortOrder: 10000 + (index + 1) * 10,
  isLight: isLightUiBackground(palette.colors.background),
  colors: palette.colors,
}));

const CDN_ONLY_FAMILIES = new Set([
  "Allura",
  "Brownhill Script",
  "Great Vibes",
  "Pinyon Script",
]);

const catalog = {
  default_preset_id: "lovable-clean-white",
  presets: [...recipes, ...palettes],
  font_pairs: TRY_THEME_EXTRA_FONT_PAIRS.map((pair) => ({
    id: pair.key,
    headingFontLabel: pair.headingFontLabel,
    bodyFontLabel: pair.bodyFontLabel,
    headingStack: pair.headingStack,
    bodyStack: pair.bodyStack,
    tagline: pair.tagline,
  })),
  google_families: [
    ...new Set([
      ...SITE_ESSENTIALS_GOOGLE_FONT_NAMES,
      ...allPresetGridGoogleFontFamilies(),
    ]),
  ]
    .filter((name) => !CDN_ONLY_FAMILIES.has(name))
    .sort((a, b) => a.localeCompare(b)),
};

process.stdout.write(`${JSON.stringify(catalog, null, 2)}\n`);
process.stderr.write(
  [
    `recipes=${recipes.length}`,
    `palettes=${palettes.length}`,
    `font_pairs=${catalog.font_pairs.length}`,
    `google_families=${catalog.google_families.length}`,
    `presets_total=${catalog.presets.length}`,
  ].join(" ") + "\n",
);
