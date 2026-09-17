import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import type { Colors, Typography } from "@/services/common/site-essentials/type";

export type ThemePresetKind = "recipe" | "palette";
export type ThemePresetGroup =
  | "premium"
  | "venue"
  | "modern"
  | "classic"
  | "extra";

export const PLATFORM_DEFAULT_PRESET_ID = "gallery-neutral";

export type ThemePresetColors = Colors;

export type ThemePresetTypography = Typography;

export type ThemePresetTokensV2 = {
  background: string;
  surface: string;
  secondary: string;
  header: string;
  onHeader: string;
  footer: string;
  onFooter: string;
  onFooterMuted: string;
  text: string;
  muted: string;
  border: string;
  borderStrong: string;
  primary: string;
  accent: string;
  accentText: string;
  button: string;
  buttonText: string;
  buttonHover: string;
  focus: string;
  overlay: string;
};

export type ThemeCatalogPreset = {
  id: string;
  kind: ThemePresetKind;
  group: ThemePresetGroup;
  name: string;
  tagline: string;
  headingFontLabel: string;
  bodyFontLabel: string;
  headingEmphasis: HeadingEmphasis;
  swatch: [string, string, string];
  sortOrder: number;
  isLight: boolean;
  version?: number;
  colors: ThemePresetColors;
  tokens?: ThemePresetTokensV2;
  typography?: ThemePresetTypography;
};

export type ThemeCatalogFontPair = {
  id: string;
  headingFontLabel: string;
  bodyFontLabel: string;
  headingStack: string;
  bodyStack: string;
  tagline: string;
};

export type ThemePresetsCatalog = {
  defaultPresetId: string;
  themeSchemaVersion?: number;
  presets: ThemeCatalogPreset[];
  fontPairs: ThemeCatalogFontPair[];
  googleFamilies: string[];
};

export type ThemePresetsCatalogResponse = {
  status: boolean;
  message: string;
  data: unknown;
  errors: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readString(
  record: Record<string, unknown> | null,
  camel: string,
  snake: string,
  fallback = "",
): string {
  if (!record) return fallback;
  const raw = record[camel] ?? record[snake];
  return typeof raw === "string" ? raw.trim() : fallback;
}

function readNumber(
  record: Record<string, unknown> | null,
  camel: string,
  snake: string,
  fallback = 0,
): number {
  if (!record) return fallback;
  const raw = record[camel] ?? record[snake];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

function readBoolean(
  record: Record<string, unknown> | null,
  camel: string,
  snake: string,
  fallback = false,
): boolean {
  if (!record) return fallback;
  const raw = record[camel] ?? record[snake];
  return typeof raw === "boolean" ? raw : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
}

function normalizeKind(raw: string): ThemePresetKind {
  return raw === "palette" ? "palette" : "recipe";
}

const PREMIUM_PRESET_IDS = new Set([
  "gallery-neutral",
  "country-estate",
  "harbour-slate",
  "boardroom-navy",
  "porcelain-blush",
  "walled-garden",
  "claret-reserve",
  "evergreen-noel",
  "midnight-champagne",
  "smoked-oak",
]);

function normalizeGroup(id: string, raw: string): ThemePresetGroup {
  if (
    raw === "premium" ||
    raw === "venue" ||
    raw === "modern" ||
    raw === "classic" ||
    raw === "extra"
  ) {
    return raw;
  }
  if (PREMIUM_PRESET_IDS.has(id)) return "premium";
  if (id.startsWith("venue-")) return "venue";
  if (id.startsWith("lovable-")) return "modern";
  return "classic";
}

const TOKEN_KEYS: (keyof ThemePresetTokensV2)[] = [
  "background",
  "surface",
  "secondary",
  "header",
  "onHeader",
  "footer",
  "onFooter",
  "onFooterMuted",
  "text",
  "muted",
  "border",
  "borderStrong",
  "primary",
  "accent",
  "accentText",
  "button",
  "buttonText",
  "buttonHover",
  "focus",
  "overlay",
];

function normalizeTokens(raw: unknown): ThemePresetTokensV2 | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const tokens = {} as ThemePresetTokensV2;
  for (const key of TOKEN_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || !value.trim()) return undefined;
    tokens[key] = value.trim();
  }
  return tokens;
}

function normalizeSwatch(
  raw: unknown,
  colors: ThemePresetColors,
): [string, string, string] {
  if (Array.isArray(raw) && raw.length >= 3) {
    const a = typeof raw[0] === "string" ? raw[0] : colors.header;
    const b = typeof raw[1] === "string" ? raw[1] : colors.primary;
    const c = typeof raw[2] === "string" ? raw[2] : colors.secondary;
    return [a, b, c];
  }
  return [colors.header, colors.primary, colors.secondary];
}

const FALLBACK_SOCIAL = {
  google: "#4285F4",
  microsoft: "#1877f2",
};

function normalizeColors(raw: unknown): ThemePresetColors | null {
  const record = asRecord(raw);
  if (!record) return null;
  const social = asRecord(record.socialLogin);
  const primary = typeof record.primary === "string" ? record.primary : "";
  const secondary = typeof record.secondary === "string" ? record.secondary : "";
  const header = typeof record.header === "string" ? record.header : primary;
  const footer = typeof record.footer === "string" ? record.footer : header;
  const background =
    typeof record.background === "string" ? record.background : "#ffffff";
  const surface = typeof record.surface === "string" ? record.surface : "#ffffff";
  const text = typeof record.text === "string" ? record.text : "#17171c";
  const textDimmed =
    typeof record.textDimmed === "string" ? record.textDimmed : "#71717a";
  if (!primary || !secondary) return null;
  return {
    primary,
    secondary,
    header,
    footer,
    background,
    surface,
    text,
    textDimmed,
    socialLogin: {
      google:
        typeof social?.google === "string" && social.google.trim()
          ? social.google
          : FALLBACK_SOCIAL.google,
      microsoft:
        typeof social?.microsoft === "string" && social.microsoft.trim()
          ? social.microsoft
          : FALLBACK_SOCIAL.microsoft,
    },
  };
}

function normalizeTypography(raw: unknown): ThemePresetTypography | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const fontFamily = asRecord(record.fontFamily);
  const heading =
    (typeof fontFamily?.heading === "string" && fontFamily.heading) ||
    (typeof record.heading === "string" && record.heading) ||
    "";
  const body =
    (typeof fontFamily?.body === "string" && fontFamily.body) ||
    (typeof record.body === "string" && record.body) ||
    "";
  if (!heading.trim() || !body.trim()) return undefined;
  return {
    fontFamily: { heading, body },
    customFontStylesheetUrls: readStringArray(record.customFontStylesheetUrls),
    headingEmphasis: normalizeHeadingEmphasis(record.headingEmphasis),
  };
}

function normalizePreset(raw: unknown): ThemeCatalogPreset | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = readString(record, "id", "id");
  if (!id) return null;
  const colors = normalizeColors(record.colors);
  if (!colors) return null;
  const kind = normalizeKind(readString(record, "kind", "kind", "recipe"));
  const headingFontLabel = readString(
    record,
    "headingFontLabel",
    "heading_font_label",
  );
  const bodyFontLabel = readString(record, "bodyFontLabel", "body_font_label");
  const headingEmphasisRaw =
    record.headingEmphasis ?? record.heading_emphasis;
  return {
    id,
    kind,
    group: normalizeGroup(id, readString(record, "group", "group")),
    name: readString(record, "name", "name", id),
    tagline: readString(record, "tagline", "tagline"),
    headingFontLabel,
    bodyFontLabel,
    headingEmphasis: normalizeHeadingEmphasis(headingEmphasisRaw),
    swatch: normalizeSwatch(record.swatch, colors),
    sortOrder: readNumber(record, "sortOrder", "sort_order", 0),
    isLight: readBoolean(record, "isLight", "is_light", false),
    version: readNumber(record, "version", "version", 0) || undefined,
    colors,
    tokens: normalizeTokens(record.tokens),
    typography: normalizeTypography(record.typography),
  };
}

function normalizeFontPair(raw: unknown): ThemeCatalogFontPair | null {
  const record = asRecord(raw);
  if (!record) return null;
  const id = readString(record, "id", "id") || readString(record, "key", "key");
  const headingStack = readString(record, "headingStack", "heading_stack");
  const bodyStack = readString(record, "bodyStack", "body_stack");
  if (!id || !headingStack || !bodyStack) return null;
  return {
    id,
    headingFontLabel: readString(
      record,
      "headingFontLabel",
      "heading_font_label",
      headingStack.split(",")[0]?.trim() ?? "",
    ),
    bodyFontLabel: readString(
      record,
      "bodyFontLabel",
      "body_font_label",
      bodyStack.split(",")[0]?.trim() ?? "",
    ),
    headingStack,
    bodyStack,
    tagline: readString(record, "tagline", "tagline"),
  };
}

export function normalizeThemePresetsCatalog(
  data: unknown,
): ThemePresetsCatalog | null {
  let record = asRecord(data);
  if (!record) return null;
  const nested = asRecord(record.data);
  if (!Array.isArray(record.presets) && nested && Array.isArray(nested.presets)) {
    record = nested;
  }
  const presetsRaw = record.presets;
  if (!Array.isArray(presetsRaw)) return null;
  const presets = presetsRaw
    .map(normalizePreset)
    .filter((item): item is ThemeCatalogPreset => item != null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const fontPairsRaw = record.fontPairs ?? record.font_pairs;
  const fontPairs = Array.isArray(fontPairsRaw)
    ? fontPairsRaw
        .map(normalizeFontPair)
        .filter((item): item is ThemeCatalogFontPair => item != null)
    : [];
  const googleFamilies = readStringArray(
    record.googleFamilies ?? record.google_families,
  );
  return {
    defaultPresetId:
      readString(record, "defaultPresetId", "default_preset_id") ||
      PLATFORM_DEFAULT_PRESET_ID,
    themeSchemaVersion:
      readNumber(record, "themeSchemaVersion", "theme_schema_version", 0) ||
      undefined,
    presets,
    fontPairs,
    googleFamilies,
  };
}

export function isThemeRecipePreset(
  preset: ThemeCatalogPreset,
): boolean {
  return preset.kind === "recipe";
}
