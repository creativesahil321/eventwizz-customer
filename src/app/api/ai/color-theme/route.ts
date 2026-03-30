import { NextResponse } from "next/server";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { env } from "@/env";

type ColorTheme = {
  primary: string;
  secondary: string;
  header: string;
  footer: string;
  background: string;
  surface: string;
  text: string;
  textDimmed: string;
  socialLogin: {
    google: string;
    microsoft: string;
  };
};

type LogoColorTone = "dark" | "light" | "colorful" | "unsure";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/;
const GRADIENT_REGEX = /^linear-gradient\(/;

const FALLBACK_DARK_TEXT = "#0F172A";
const FALLBACK_LIGHT_TEXT = "#F8FAFC";
const FALLBACK_LIGHT_SURFACE = "#FFFFFF";
const FALLBACK_DARK_SURFACE = "#111827";
const FALLBACK_LIGHT_MUTED = "#64748B";
const FALLBACK_DARK_MUTED = "#CBD5E1";

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function analyzeWebsiteTheme(url: string): Promise<{
  title?: string;
  colors: string[];
}> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; EventWizzThemeBot/1.0; +https://eventwizz.com)",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Website returned status ${response.status}`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim();

  const colors = Array.from(
    new Set(
      (html.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) ?? [])
        .map((c) => normalizeHexColor(c))
        .slice(0, 24),
    ),
  );

  return { title, colors };
}

function isNightlifeOrHighEnergyTheme(themeLower: string): boolean {
  return (
    themeLower.includes("dj") ||
    themeLower.includes("club") ||
    themeLower.includes("night") ||
    themeLower.includes("afrobeats") ||
    themeLower.includes("bashment") ||
    themeLower.includes("rave") ||
    themeLower.includes("neon")
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function hexToHsl(hexColor: string): { h: number; s: number; l: number } {
  const hex = normalizeHexColor(hexColor);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;

  switch (max) {
    case r:
      h = ((g - b) / d) % 6;
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
      break;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = clamp(s / 100, 0, 1);
  const light = clamp(l / 100, 0, 1);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function softenHex(
  hexColor: string,
  options: { maxSaturation?: number; minLightness?: number; maxLightness?: number },
): string {
  if (!isValidHex(hexColor)) return hexColor;
  const { h, s, l } = hexToHsl(hexColor);
  const saturation = clamp(s, 0, options.maxSaturation ?? 100);
  const lightness = clamp(
    l,
    options.minLightness ?? 0,
    options.maxLightness ?? 100,
  );
  return hslToHex(h, saturation, lightness);
}

function resolveEffectiveLogoTone(
  logoColorTone: LogoColorTone | undefined,
  logoColorHex?: string,
): LogoColorTone {
  if (logoColorHex && isValidHex(logoColorHex)) {
    // Very bright logos (e.g. white) should force dark header/footer.
    return isDarkColor(normalizeHexColor(logoColorHex)) ? "dark" : "light";
  }
  return logoColorTone ?? "unsure";
}

function enforceProfessionalAesthetic(
  theme: ColorTheme,
  prefersLightProfessional: boolean,
  logoTone: LogoColorTone,
): { theme: ColorTheme; applied: boolean } {
  let applied = false;
  const next = { ...theme, socialLogin: { ...theme.socialLogin } };

  const applyIfChanged = (current: string, updated: string): string => {
    if (normalizeHexColor(current) !== normalizeHexColor(updated)) {
      applied = true;
    }
    return updated;
  };

  const prefersDarkHeader = logoTone === "light";
  const prefersLightHeader = logoTone === "dark";

  if (prefersLightProfessional) {
    // Primary: restrained accent (not neon); secondary: very soft tint for full-width bands.
    next.primary = applyIfChanged(
      next.primary,
      softenHex(next.primary, { maxSaturation: 56, minLightness: 26, maxLightness: 56 }),
    );
    next.secondary = applyIfChanged(
      next.secondary,
      softenHex(next.secondary, { maxSaturation: 14, minLightness: 93, maxLightness: 98 }),
    );
    // Clean, premium baseline similar to luxury venue websites.
    if (prefersDarkHeader) {
      next.header = applyIfChanged(
        next.header,
        softenHex(next.header, {
          maxSaturation: 16,
          minLightness: 16,
          maxLightness: 28,
        }),
      );
      next.footer = applyIfChanged(
        next.footer,
        softenHex(next.footer, {
          maxSaturation: 18,
          minLightness: 18,
          maxLightness: 32,
        }),
      );
    } else if (prefersLightHeader) {
      next.header = applyIfChanged(
        next.header,
        softenHex(next.header, {
          maxSaturation: 8,
          minLightness: 94,
          maxLightness: 99,
        }),
      );
      next.footer = applyIfChanged(
        next.footer,
        softenHex(next.footer, {
          maxSaturation: 14,
          minLightness: 90,
          maxLightness: 98,
        }),
      );
    } else {
      next.header = applyIfChanged(
        next.header,
        softenHex(next.header, {
          maxSaturation: 8,
          minLightness: 94,
          maxLightness: 99,
        }),
      );
      next.footer = applyIfChanged(
        next.footer,
        softenHex(next.footer, {
          maxSaturation: 14,
          minLightness: 90,
          maxLightness: 98,
        }),
      );
    }

    next.surface = applyIfChanged(next.surface, "#FFFFFF");
    if (isValidHex(next.background)) {
      next.background = applyIfChanged(
        next.background,
        softenHex(next.background, { maxSaturation: 10, minLightness: 95, maxLightness: 99 }),
      );
    }
  } else {
    // Nightlife: richer but still polished; secondary stays usable for bands without mud.
    next.primary = applyIfChanged(
      next.primary,
      softenHex(next.primary, { maxSaturation: 78, minLightness: 26, maxLightness: 60 }),
    );
    next.secondary = applyIfChanged(
      next.secondary,
      softenHex(next.secondary, { maxSaturation: 48, minLightness: 28, maxLightness: 58 }),
    );
  }

  return { theme: next, applied };
}

// Helper function to normalize hex colors (convert #333 to #333333)
function normalizeHexColor(color: string): string {
  if (color.length === 4) {
    // Convert #333 to #333333
    return color + color.slice(1);
  }
  return color;
}

function isValidHex(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

// Helper function to calculate color brightness (0-255) for quick heuristics
function getColorBrightness(hexColor: string): number {
  const normalizedColor = normalizeHexColor(hexColor);
  const r = parseInt(normalizedColor.substr(1, 2), 16);
  const g = parseInt(normalizedColor.substr(3, 2), 16);
  const b = parseInt(normalizedColor.substr(5, 2), 16);
  // Use luminance formula
  return r * 0.299 + g * 0.587 + b * 0.114;
}

// Helper function to check if color is dark (brightness < 128)
function isDarkColor(hexColor: string): boolean {
  return getColorBrightness(hexColor) < 128;
}

function relativeLuminance(hexColor: string): number {
  const normalizedColor = normalizeHexColor(hexColor);
  const r = parseInt(normalizedColor.slice(1, 3), 16) / 255;
  const g = parseInt(normalizedColor.slice(3, 5), 16) / 255;
  const b = parseInt(normalizedColor.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

  return (
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  );
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractBackgroundAnchors(background: string): string[] {
  if (isValidHex(background)) {
    return [normalizeHexColor(background)];
  }

  const hexMatches = background.match(/#[0-9A-Fa-f]{3,6}/g);
  if (hexMatches && hexMatches.length > 0) {
    return hexMatches.map((c) => normalizeHexColor(c));
  }

  return ["#FFFFFF"];
}

function minContrastAgainstBackground(
  foreground: string,
  background: string,
): number {
  const anchors = extractBackgroundAnchors(background);
  return anchors.reduce((min, anchor) => {
    const ratio = contrastRatio(foreground, anchor);
    return Math.min(min, ratio);
  }, Number.POSITIVE_INFINITY);
}

function pickReadableText(background: string): string {
  const darkCandidate = FALLBACK_DARK_TEXT;
  const lightCandidate = FALLBACK_LIGHT_TEXT;

  const darkContrast = minContrastAgainstBackground(darkCandidate, background);
  const lightContrast = minContrastAgainstBackground(lightCandidate, background);

  return darkContrast >= lightContrast ? darkCandidate : lightCandidate;
}

function pickReadableMutedText(background: string, preferredText: string): string {
  const darkPreferred = isDarkColor(preferredText);
  const candidate = darkPreferred ? FALLBACK_LIGHT_MUTED : FALLBACK_DARK_MUTED;
  const minRatio = 3;

  if (minContrastAgainstBackground(candidate, background) >= minRatio) {
    return candidate;
  }

  return pickReadableText(background);
}

function ensureReadablePair(
  foreground: string,
  background: string,
  minRatio = 4.5,
): string {
  if (!isValidHex(foreground)) return pickReadableText(background);
  if (
    minContrastAgainstBackground(normalizeHexColor(foreground), background) >=
    minRatio
  ) {
    return normalizeHexColor(foreground);
  }
  return pickReadableText(background);
}

function sanitizeThemeForReadability(
  colorTheme: ColorTheme,
  logoColorTone: LogoColorTone = "unsure",
): { theme: ColorTheme; autoAdjusted: boolean; adjustments: string[] } {
  const adjustments: string[] = [];
  const normalized: ColorTheme = {
    ...colorTheme,
    primary: normalizeHexColor(colorTheme.primary),
    secondary: normalizeHexColor(colorTheme.secondary),
    header: normalizeHexColor(colorTheme.header),
    footer: normalizeHexColor(colorTheme.footer),
    background: colorTheme.background.startsWith("#")
      ? normalizeHexColor(colorTheme.background)
      : colorTheme.background,
    surface: normalizeHexColor(colorTheme.surface),
    text: normalizeHexColor(colorTheme.text),
    textDimmed: normalizeHexColor(colorTheme.textDimmed),
    socialLogin: {
      google: normalizeHexColor(colorTheme.socialLogin.google),
      microsoft: normalizeHexColor(colorTheme.socialLogin.microsoft),
    },
  };

  const prefersDarkHeader = logoColorTone === "light";
  const prefersLightHeader = logoColorTone === "dark";

  const headerTarget = prefersDarkHeader
    ? FALLBACK_DARK_SURFACE
    : prefersLightHeader
      ? FALLBACK_LIGHT_SURFACE
      : normalized.header;

  const footerTarget = prefersDarkHeader
    ? "#1F2937"
    : prefersLightHeader
      ? "#F8FAFC"
      : normalized.footer;

  const textCandidates = [FALLBACK_DARK_TEXT, FALLBACK_LIGHT_TEXT];
  const readableBaseText =
    isValidHex(normalized.text) && textCandidates.includes(normalizeHexColor(normalized.text))
      ? normalizeHexColor(normalized.text)
      : textCandidates
          .map((candidate) => ({
            candidate,
            score: Math.min(
              minContrastAgainstBackground(candidate, normalized.surface),
              minContrastAgainstBackground(candidate, normalized.background),
              minContrastAgainstBackground(candidate, headerTarget),
              minContrastAgainstBackground(candidate, footerTarget),
            ),
          }))
          .sort((a, b) => b.score - a.score)[0].candidate;

  const unifiedText = ensureReadablePair(readableBaseText, normalized.surface);

  const adjustedHeader = ensureReadablePair(unifiedText, headerTarget) === unifiedText
    ? headerTarget
    : isDarkColor(unifiedText)
      ? FALLBACK_LIGHT_SURFACE
      : FALLBACK_DARK_SURFACE;

  const adjustedFooter = ensureReadablePair(unifiedText, footerTarget) === unifiedText
    ? footerTarget
    : isDarkColor(unifiedText)
      ? "#F8FAFC"
      : "#1F2937";

  const adjustedSurface = ensureReadablePair(unifiedText, normalized.surface) === unifiedText
    ? normalized.surface
    : isDarkColor(unifiedText)
      ? FALLBACK_LIGHT_SURFACE
      : FALLBACK_DARK_SURFACE;

  // Keep gradient backgrounds whenever possible; contrast is evaluated across all stops.
  const adjustedBackground = normalized.background;

  const adjustedDimmed = pickReadableMutedText(adjustedSurface, unifiedText);

  const finalTheme: ColorTheme = {
    ...normalized,
    header: adjustedHeader,
    footer: adjustedFooter,
    surface: adjustedSurface,
    background: adjustedBackground,
    text: unifiedText,
    textDimmed: adjustedDimmed,
  };

  if (JSON.stringify(finalTheme) !== JSON.stringify(normalized)) {
    adjustments.push("Applied accessibility contrast guardrails across text, surface, background, header, and footer.");
  }
  if (prefersDarkHeader || prefersLightHeader) {
    adjustments.push("Applied logo-color guidance for header/footer polarity.");
  }

  return {
    theme: finalTheme,
    autoAdjusted: adjustments.length > 0,
    adjustments,
  };
}

// Helper function to validate contrast and return detailed info
function validateContrast(colorTheme: ColorTheme): {
  hasErrors: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const textIsDark = isDarkColor(colorTheme.text);
  const headerIsDark = isDarkColor(colorTheme.header);
  const footerIsDark = isDarkColor(colorTheme.footer);

  // Check text vs header contrast
  if (textIsDark === headerIsDark) {
    errors.push(
      `Poor contrast: Text (${colorTheme.text}) and header (${colorTheme.header}) have similar brightness levels. ` +
        `Text is ${textIsDark ? "dark" : "light"} but header is also ${
          headerIsDark ? "dark" : "light"
        }.`
    );
  }

  // Check text vs footer contrast
  if (textIsDark === footerIsDark) {
    errors.push(
      `Poor contrast: Text (${colorTheme.text}) and footer (${colorTheme.footer}) have similar brightness levels. ` +
        `Text is ${textIsDark ? "dark" : "light"} but footer is also ${
          footerIsDark ? "dark" : "light"
        }.`
    );
  }

  return {
    hasErrors: errors.length > 0,
    errors,
  };
}

export async function POST(req: Request) {
  try {
    const {
      businessType,
      mood,
      style,
      existingBrand,
      customTheme,
      websiteUrl,
      eventType,
      logoColorTone,
      logoColorHex,
    } =
      await req.json();

    if (!env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "AI service is not properly configured" },
        { status: 500 }
      );
    }

    // Build contextual prompt based on user inputs
    let contextPrompt = "";
    let websiteAnalysis: { title?: string; colors: string[] } | null = null;

    let prefersLightProfessional = true;

    if (websiteUrl && typeof websiteUrl === "string" && websiteUrl.trim()) {
      const cleanUrl = websiteUrl.trim();
      if (!isValidHttpUrl(cleanUrl)) {
        return NextResponse.json(
          { error: "Please provide a valid website URL starting with http:// or https://" },
          { status: 400 },
        );
      }
      try {
        websiteAnalysis = await analyzeWebsiteTheme(cleanUrl);
      } catch (error) {
        return NextResponse.json(
          {
            error: "Could not analyze this website URL. Please check the link and try again.",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 400 },
        );
      }
    }

    // Handle custom theme input (free text)
    if (websiteAnalysis) {
      contextPrompt = `Generate a professional color theme inspired by website: "${websiteUrl}". `;
      if (websiteAnalysis.title) {
        contextPrompt += `Website title: "${websiteAnalysis.title}". `;
      }
      if (websiteAnalysis.colors.length > 0) {
        contextPrompt += `Extracted website colors: ${websiteAnalysis.colors.join(", ")}. `;
      }
      contextPrompt +=
        "Use this as inspiration, but optimize for readability, cleaner modern aesthetics, and professional event platform UI.";
    } else if (customTheme && customTheme.trim()) {
      contextPrompt = `Generate a professional color theme for: "${customTheme.trim()}". `;

      // Add specific theme context based on common keywords
      const themeLower = customTheme.toLowerCase();
      prefersLightProfessional = !isNightlifeOrHighEnergyTheme(themeLower);

      if (
        themeLower.includes("christmas") ||
        themeLower.includes("new year") ||
        themeLower.includes("halloween") ||
        themeLower.includes("valentine") ||
        themeLower.includes("easter") ||
        themeLower.includes("diwali") ||
        themeLower.includes("eid")
      ) {
        if (themeLower.includes("christmas")) {
          contextPrompt +=
            "Create festive Christmas event colors with rich seasonal contrast and polished holiday elegance. ";
        } else if (themeLower.includes("new year")) {
          contextPrompt +=
            "Create New Year party colors with premium midnight tones, metallic accents, and celebratory contrast. ";
        } else if (themeLower.includes("halloween")) {
          contextPrompt +=
            "Create Halloween event colors with bold dramatic contrast, dark surfaces, and clear readable highlights. ";
        } else if (themeLower.includes("valentine")) {
          contextPrompt +=
            "Create Valentine's event colors with romantic but professional warm tones and strong readability. ";
        } else if (themeLower.includes("easter")) {
          contextPrompt +=
            "Create Easter event colors with soft spring tones balanced by professional contrast. ";
        } else if (themeLower.includes("diwali")) {
          contextPrompt +=
            "Create Diwali event colors inspired by festive jewel tones, warmth, and elegant high contrast. ";
        } else if (themeLower.includes("eid")) {
          contextPrompt +=
            "Create Eid event colors with elegant celebratory tones, refined contrast, and a premium feel. ";
        }
      } else if (
        themeLower.includes("bottomless brunch") ||
        themeLower.includes("lipstick powder") ||
        themeLower.includes("paint")
      ) {
        if (themeLower.includes("bottomless brunch")) {
          contextPrompt +=
            "Create bottomless brunch colors with bright daytime social vibes and clean, readable contrast. ";
        } else {
          contextPrompt +=
            "Create lipstick powder and paint event colors with beauty-inspired tones while maintaining professional readability. ";
        }
      } else if (
        themeLower.includes("live music") ||
        themeLower.includes("gig") ||
        themeLower.includes("dj night") ||
        themeLower.includes("club") ||
        themeLower.includes("comedy") ||
        themeLower.includes("drag") ||
        themeLower.includes("afrobeats") ||
        themeLower.includes("bashment") ||
        themeLower.includes("open mic") ||
        themeLower.includes("spoken word")
      ) {
        if (themeLower.includes("live music") || themeLower.includes("gig")) {
          contextPrompt +=
            "Create live music and gigs colors with energetic stage-friendly tones and excellent text contrast. ";
        } else if (themeLower.includes("dj night") || themeLower.includes("club")) {
          contextPrompt +=
            "Create DJ and club event colors with nightlife mood, tasteful vibrance, and highly legible UI contrast. ";
        } else if (themeLower.includes("comedy")) {
          contextPrompt +=
            "Create comedy show colors with approachable lively tones and clean readability for listings and CTA buttons. ";
        } else if (themeLower.includes("drag")) {
          contextPrompt +=
            "Create drag show and brunch colors with expressive, bold palettes while preserving professional accessibility. ";
        } else if (
          themeLower.includes("afrobeats") ||
          themeLower.includes("bashment")
        ) {
          contextPrompt +=
            "Create afrobeats and bashment event colors with rhythmic bold tones and polished high-contrast surfaces. ";
        } else {
          contextPrompt +=
            "Create open mic and spoken word event colors with artistic, intimate tones and strong readability. ";
        }
      } else if (
        themeLower.includes("food & drink") ||
        themeLower.includes("food and drink") ||
        themeLower.includes("festival") ||
        themeLower.includes("street food") ||
        themeLower.includes("market")
      ) {
        if (themeLower.includes("street food") || themeLower.includes("market")) {
          contextPrompt +=
            "Create street food market colors with warm urban tones and clear contrast for menu and event cards. ";
        } else {
          contextPrompt +=
            "Create food and drink festival colors with appetizing lively tones and professional contrast. ";
        }
      } else if (
        themeLower.includes("pride") ||
        themeLower.includes("day rave") ||
        themeLower.includes("outdoor party") ||
        themeLower.includes("themed parties") ||
        themeLower.includes("themed party")
      ) {
        if (themeLower.includes("pride")) {
          contextPrompt +=
            "Create pride event colors with inclusive vibrant tones, balanced saturation, and accessible contrast. ";
        } else if (
          themeLower.includes("day rave") ||
          themeLower.includes("outdoor party")
        ) {
          contextPrompt +=
            "Create day rave and outdoor party colors with sunny energetic tones and strong readability under bright backgrounds. ";
        } else {
          contextPrompt +=
            "Create themed party colors with flexible celebratory palettes and polished contrast-safe UI colors. ";
        }
      } else if (
        themeLower.includes("networking") ||
        themeLower.includes("business event") ||
        themeLower.includes("workshop") ||
        themeLower.includes("masterclass")
      ) {
        if (themeLower.includes("networking") || themeLower.includes("business")) {
          contextPrompt +=
            "Create networking and business event colors with professional trust-building tones and premium contrast. ";
        } else {
          contextPrompt +=
            "Create workshop and masterclass colors with clear educational UI hierarchy and highly readable palettes. ";
        }
      } else if (themeLower.includes("wedding") || themeLower.includes("bridal")) {
        contextPrompt +=
          "Create elegant, romantic colors perfect for weddings with soft pastels, golds, and whites. ";
      } else if (
        themeLower.includes("birthday") ||
        themeLower.includes("party")
      ) {
        contextPrompt +=
          "Create vibrant, celebratory colors perfect for birthday parties with bright, fun colors. ";
      } else if (
        themeLower.includes("christmas") ||
        themeLower.includes("holiday")
      ) {
        contextPrompt +=
          "Create festive Christmas/holiday colors with traditional reds, greens, golds, and whites. ";
      } else if (
        themeLower.includes("superhero") ||
        themeLower.includes("comic")
      ) {
        contextPrompt +=
          "Create superhero/comic book themed colors with bold, vibrant colors. ";
      } else if (
        themeLower.includes("movie") ||
        themeLower.includes("cinema")
      ) {
        contextPrompt +=
          "Create movie/cinema themed colors with dramatic, cinematic colors. ";
      } else if (themeLower.includes("masculine")) {
        contextPrompt +=
          "Create bold, professional colors with strong contrast suitable for corporate or athletic events. ";
      } else if (
        themeLower.includes("girls") ||
        themeLower.includes("feminine")
      ) {
        contextPrompt +=
          "Create feminine, elegant colors perfect for girls' events with soft, beautiful colors. ";
      } else if (
        themeLower.includes("corporate") ||
        themeLower.includes("business")
      ) {
        contextPrompt +=
          "Create professional, corporate colors with sophisticated, business-appropriate colors. ";
      } else if (
        themeLower.includes("sports") ||
        themeLower.includes("athletic")
      ) {
        contextPrompt +=
          "Create energetic, sports-themed colors with dynamic, athletic colors. ";
      } else if (
        themeLower.includes("music") ||
        themeLower.includes("concert")
      ) {
        contextPrompt +=
          "Create musical, concert-themed colors with dynamic, rhythm-inspired colors. ";
      } else if (
        themeLower.includes("art") ||
        themeLower.includes("creative")
      ) {
        contextPrompt +=
          "Create artistic, creative colors with expressive, imaginative colors. ";
      } else if (
        themeLower.includes("nature") ||
        themeLower.includes("outdoor")
      ) {
        contextPrompt +=
          "Create natural, outdoor-themed colors with earth tones and nature-inspired colors. ";
      } else if (
        themeLower.includes("vintage") ||
        themeLower.includes("retro")
      ) {
        contextPrompt +=
          "Create vintage, retro colors with classic, nostalgic color palettes. ";
      } else if (
        themeLower.includes("modern") ||
        themeLower.includes("contemporary")
      ) {
        contextPrompt +=
          "Create modern, contemporary colors with sleek, current design trends. ";
      } else if (
        themeLower.includes("luxury") ||
        themeLower.includes("premium")
      ) {
        contextPrompt +=
          "Create luxury, premium colors with sophisticated, high-end color palettes. ";
      } else if (
        themeLower.includes("minimalist") ||
        themeLower.includes("minimal")
      ) {
        contextPrompt +=
          "Create minimalist colors with clean, simple, and elegant color schemes. ";
      } else if (themeLower.includes("dark") || themeLower.includes("gothic")) {
        contextPrompt +=
          "Create dark, gothic colors with mysterious, dramatic color palettes. ";
      } else if (
        themeLower.includes("bright") ||
        themeLower.includes("vibrant")
      ) {
        contextPrompt +=
          "Create bright, vibrant colors with energetic, lively color schemes. ";
      } else if (themeLower.includes("pastel") || themeLower.includes("soft")) {
        contextPrompt +=
          "Create pastel, soft colors with gentle, soothing color palettes. ";
      } else if (
        themeLower.includes("neon") ||
        themeLower.includes("electric")
      ) {
        contextPrompt +=
          "Create neon, electric colors with bold, glowing color schemes. ";
      } else if (themeLower.includes("ocean") || themeLower.includes("sea")) {
        contextPrompt +=
          "Create ocean-themed colors with blues, teals, and sea-inspired colors. ";
      } else if (
        themeLower.includes("forest") ||
        themeLower.includes("woodland")
      ) {
        contextPrompt +=
          "Create forest-themed colors with greens, browns, and woodland colors. ";
      } else if (
        themeLower.includes("sunset") ||
        themeLower.includes("sunrise")
      ) {
        contextPrompt +=
          "Create sunset/sunrise colors with warm oranges, pinks, and purples. ";
      } else if (
        themeLower.includes("galaxy") ||
        themeLower.includes("space")
      ) {
        contextPrompt +=
          "Create galaxy/space colors with deep purples, blues, and cosmic colors. ";
      } else if (
        themeLower.includes("tropical") ||
        themeLower.includes("island")
      ) {
        contextPrompt +=
          "Create tropical colors with bright, island-inspired colors. ";
      } else if (themeLower.includes("autumn") || themeLower.includes("fall")) {
        contextPrompt +=
          "Create autumn colors with warm oranges, reds, and browns. ";
      } else if (
        themeLower.includes("spring") ||
        themeLower.includes("fresh")
      ) {
        contextPrompt +=
          "Create spring colors with fresh greens, pinks, and light colors. ";
      } else if (themeLower.includes("winter") || themeLower.includes("snow")) {
        contextPrompt +=
          "Create winter colors with cool blues, whites, and silver tones. ";
      } else if (
        themeLower.includes("summer") ||
        themeLower.includes("beach")
      ) {
        contextPrompt +=
          "Create summer colors with bright yellows, blues, and beach colors. ";
      } else {
        contextPrompt += "Create colors that match the theme described. ";
      }
    } else {
      // Fallback to original business type approach
      contextPrompt = "Generate a professional color theme for a ";

      if (eventType) {
        contextPrompt += `${eventType} event `;
      } else if (businessType) {
        contextPrompt += `${businessType} business `;
      } else {
        contextPrompt += "event management business ";
      }

      if (mood) {
        contextPrompt += `with a ${mood} mood `;
      }

      if (style) {
        contextPrompt += `and ${style} style `;
      }
    }

    if (existingBrand) {
      contextPrompt += `that complements existing brand colors: ${existingBrand} `;
    }
    if (logoColorTone) {
      contextPrompt += `Logo color guidance: the site logo is primarily ${logoColorTone}. `;
      if (logoColorTone === "light") {
        contextPrompt +=
          "Because logo is light/white, header and footer must be dark enough for logo visibility. ";
      } else if (logoColorTone === "dark") {
        contextPrompt +=
          "Because logo is dark, header and footer should stay light for strong logo visibility. ";
      }
    }
    if (logoColorHex) {
      contextPrompt += `Primary logo color hex is ${logoColorHex}. `;
    }

    if (prefersLightProfessional) {
      contextPrompt +=
        "Visual direction: modern premium venue style, clean and light (similar to luxury event websites). Prefer soft neutral backgrounds, white/off-white surfaces, and restrained accents. Avoid neon or overly saturated colors. Keep the look elegant and calm. Secondary is often used as full-width section bands—output secondary as a very light, low-saturation tint (whisper of the palette); put brand emphasis on primary and header/footer, not loud secondary fills. ";
    } else {
      contextPrompt +=
        "Visual direction: keep a polished nightlife feel, but avoid muddy dark palettes and preserve clean readability. ";
    }

    // Encourage gradients for visually expressive themes while still allowing solid colors.
    if (customTheme && typeof customTheme === "string") {
      const lower = customTheme.toLowerCase();
      if (
        lower.includes("sunset") ||
        lower.includes("sunrise") ||
        lower.includes("ocean") ||
        lower.includes("galaxy") ||
        lower.includes("neon") ||
        lower.includes("tropical")
      ) {
        contextPrompt +=
          "Prefer a gradient background for this theme if it improves aesthetics and readability. ";
      }
    }

    contextPrompt += `

IMPORTANT: Ensure the text color and header/footer colors have opposing brightness levels.
For example, if you choose dark text like #333333, then header and footer MUST be light colors like #ffffff or #f8f9fa.
If you choose light text like #ffffff, then header and footer MUST be dark colors like #000000 or #2d3748.
NEVER use the same color or similar brightness for text and header/footer.`;

    const systemPrompt = `You are a professional UI/UX color scheme designer specializing in web applications and event platforms.

CRITICAL INSTRUCTIONS:
1. You MUST respond with ONLY a valid JSON object
2. NO explanations, descriptions, or additional text
3. ALL colors must be in HEX format (#RRGGBB or #RGB)
4. Prefer 6-character hex format (#RRGGBB) for better precision
5. MANDATORY: Ensure high contrast between text and header/footer colors
6. Create cohesive, professional color palettes
7. Consider modern design trends and color psychology
8. ABSOLUTE RULE: Text and header/footer MUST have opposing brightness levels

Required JSON structure:
{
  "primary": "#hexcolor",
  "secondary": "#hexcolor", 
  "header": "#hexcolor",
  "footer": "#hexcolor",
  "background": "#hexcolor",
  "surface": "#hexcolor",
  "text": "#hexcolor",
  "textDimmed": "#hexcolor",
  "socialLogin": {
    "google": "#hexcolor",
    "microsoft": "#hexcolor"
  }
}

IMPORTANT: For background, you can use either:
1. A solid hex color (#RRGGBB) for simple themes
2. A CSS linear-gradient for more dynamic themes (e.g., "linear-gradient(to right, #ff6b6b, #4ecdc4)")
Choose based on the theme - gradients work great for dynamic themes like sunsets, ocean, galaxy, etc.
When the user's theme implies atmosphere/depth (luxury, wedding, nightlife, cinematic, elegant, dark, sunset, ocean), prefer a subtle linear-gradient instead of flat solid.

Guidelines:
- Primary: Main brand color, professional and controlled (avoid over-saturation)
- Secondary: For professional/light themes, a very soft neutral tint suitable for large section backgrounds (low saturation, high lightness); not a loud mid-tone accent
- Header/Footer: Container backgrounds that should contrast with text colors
- Background: Prefer light neutral base for professional themes (solid or subtle gradient)
- Surface: Prefer white or very light neutral for clean cards/panels
- Text: High contrast with surface/background for readability
- TextDimmed: Secondary text color, still readable but less prominent
- Social Login: Colors that work well with respective brand guidelines

STYLE QUALITY RULES:
1. Default to clean, premium, modern palettes (not flashy/neon) unless the theme explicitly requests nightlife.
2. Avoid very dark + very saturated combinations that feel heavy.
3. Keep backgrounds/surfaces visually calm so photos and content stand out.
4. Use accent colors sparingly; prioritize clarity and professionalism.

CRITICAL CONTRAST RULES (MUST FOLLOW):
1. If text is DARK (black, dark gray), then header/footer MUST be LIGHT (white, light gray, light colors)
2. If text is LIGHT (white, light gray), then header/footer MUST be DARK (black, dark gray, dark colors)
3. Text and textDimmed should always be readable on surface color
4. Header and footer colors should provide strong contrast for text visibility
5. NEVER use similar darkness levels for text and header/footer backgrounds

FORBIDDEN COMBINATIONS (DO NOT USE):
- Text: #333333 + Header/Footer: #333333 (BOTH DARK - INVISIBLE!)
- Text: #000000 + Header/Footer: #222222 (BOTH DARK - INVISIBLE!)
- Text: #ffffff + Header/Footer: #f5f5f5 (BOTH LIGHT - INVISIBLE!)
- Text: #666666 + Header/Footer: #555555 (BOTH DARK - POOR CONTRAST!)

CORRECT COMBINATIONS (USE THESE):
- Text: #333333 (dark) → Header/Footer: #ffffff, #f8f9fa (light)
- Text: #ffffff (light) → Header/Footer: #000000, #1a1a1a (dark)
- Text: #000000 (dark) → Header/Footer: #ffffff, #f5f5f5 (light)
- Text: #f8f9fa (light) → Header/Footer: #2d3748, #1a202c (dark)

Remember: Return solid hex colors for most fields, but background can be either solid hex color or CSS gradient for more dynamic themes.`;

    // Use the fallback system to try models in sequence
    const result: FallbackResult = await tryModelsWithFallback(
      env.GROQ_API_KEY,
      {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: contextPrompt,
          },
        ],
        temperature: 0.8, // Higher creativity for color generation
        max_tokens: 500,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to generate color theme. API error.",
          details: result.error,
          modelsTried: result.modelsTried,
        },
        { status: result.status || 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: "No response data from AI" },
        { status: 500 }
      );
    }

    const aiResponse = result.data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      return NextResponse.json(
        { error: "Failed to generate color theme. No response from AI." },
        { status: 500 }
      );
    }

    try {
      // Clean the response to extract JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const colorTheme = JSON.parse(jsonMatch[0]) as ColorTheme;

      // Validate the color theme structure
      const requiredFields = [
        "primary",
        "secondary",
        "header",
        "footer",
        "background",
        "surface",
        "text",
        "textDimmed",
      ];

      for (const field of requiredFields) {
        if (!colorTheme[field as keyof ColorTheme]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      if (
        !colorTheme.socialLogin ||
        !colorTheme.socialLogin.google ||
        !colorTheme.socialLogin.microsoft
      ) {
        throw new Error("Missing socialLogin colors");
      }

      // Validate hex colors (except background which can be gradient)
      for (const [key, value] of Object.entries(colorTheme)) {
        if (key === "socialLogin") continue; // Handle separately

        if (key === "background") {
          // Background can be hex or gradient
          if (
            typeof value === "string" &&
            !HEX_COLOR_REGEX.test(value) &&
            !GRADIENT_REGEX.test(value)
          ) {
            throw new Error(`Invalid background color format: ${value}`);
          }
        } else if (typeof value === "string" && !HEX_COLOR_REGEX.test(value)) {
          throw new Error(`Invalid hex color format for ${key}: ${value}`);
        }
      }

      // Validate social login colors
      if (!HEX_COLOR_REGEX.test(colorTheme.socialLogin.google)) {
        throw new Error(
          `Invalid google color: ${colorTheme.socialLogin.google}`
        );
      }
      if (!HEX_COLOR_REGEX.test(colorTheme.socialLogin.microsoft)) {
        throw new Error(
          `Invalid microsoft color: ${colorTheme.socialLogin.microsoft}`
        );
      }

      const effectiveLogoTone = resolveEffectiveLogoTone(
        (logoColorTone as LogoColorTone | undefined) ?? "unsure",
        typeof logoColorHex === "string" ? logoColorHex.trim() : undefined,
      );

      // Check and auto-adjust contrast for accessibility across all core surfaces
      const { theme: readabilitySafeTheme, autoAdjusted, adjustments } =
        sanitizeThemeForReadability(
          colorTheme,
          effectiveLogoTone,
        );
      const {
        theme: finalColorTheme,
        applied: professionalStyleApplied,
      } = enforceProfessionalAesthetic(
        readabilitySafeTheme,
        prefersLightProfessional,
        effectiveLogoTone,
      );
      if (professionalStyleApplied) {
        adjustments.push("Applied clean professional style balancing to reduce over-saturated or overly dark colors.");
      }
      const contrastValidation = validateContrast(finalColorTheme);

      // Normalize all hex colors to 6-character format using the adjusted theme
      const normalizedColorTheme = {
        primary: normalizeHexColor(finalColorTheme.primary),
        secondary: normalizeHexColor(finalColorTheme.secondary),
        header: normalizeHexColor(finalColorTheme.header),
        footer: normalizeHexColor(finalColorTheme.footer),
        background: finalColorTheme.background.startsWith("#")
          ? normalizeHexColor(finalColorTheme.background)
          : finalColorTheme.background,
        surface: normalizeHexColor(finalColorTheme.surface),
        text: normalizeHexColor(finalColorTheme.text),
        textDimmed: normalizeHexColor(finalColorTheme.textDimmed),
        socialLogin: {
          google: normalizeHexColor(finalColorTheme.socialLogin.google),
          microsoft: normalizeHexColor(finalColorTheme.socialLogin.microsoft),
        },
      };

      return NextResponse.json({
        colorTheme: normalizedColorTheme,
        message:
          autoAdjusted || contrastValidation.hasErrors
            ? "Color theme generated and auto-adjusted for optimal contrast!"
            : "Color theme generated successfully!",
        adjustments,
        model: result.model,
        modelUsed: result.modelUsed,
      });
    } catch (parseError) {
      return NextResponse.json(
        {
          error:
            "Failed to parse AI response. The AI returned invalid color data.",
          details:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parsing error",
        },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to generate color theme. Please try again later." },
      { status: 500 }
    );
  }
}
