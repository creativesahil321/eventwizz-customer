import type { SiteEssentials } from "@/services/common/site-essentials/type";
import type { SiteEssentialsFormValues } from "./schema";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";

type MediaField = string | File | null | undefined;

/**
 * API may return nested `fontFamily.{heading,body}` or flat `typography.{heading,body}`.
 * The form always uses the nested shape.
 */
export function normalizeSiteEssentialsTypography(
  raw: unknown,
): SiteEssentialsFormValues["typography"] {
  if (!raw || typeof raw !== "object") {
    return {
      fontFamily: { heading: "", body: "" },
      customFontStylesheetUrls: [],
      headingEmphasis: "uniform",
    };
  }

  const record = raw as Record<string, unknown>;
  const fontFamilyRaw =
    record.fontFamily && typeof record.fontFamily === "object"
      ? (record.fontFamily as Record<string, unknown>)
      : {};

  const heading =
    (typeof fontFamilyRaw.heading === "string" && fontFamilyRaw.heading.trim()) ||
    (typeof record.heading === "string" && record.heading.trim()) ||
    "";

  const body =
    (typeof fontFamilyRaw.body === "string" && fontFamilyRaw.body.trim()) ||
    (typeof record.body === "string" && record.body.trim()) ||
    "";

  const customFontStylesheetUrls = Array.isArray(record.customFontStylesheetUrls)
    ? record.customFontStylesheetUrls.filter(
        (url): url is string => typeof url === "string" && url.trim().length > 0,
      )
    : [];

  return {
    fontFamily: { heading, body },
    customFontStylesheetUrls,
    headingEmphasis: normalizeHeadingEmphasis(record.headingEmphasis),
  };
}

function preserveMediaField(
  cloned: MediaField,
  original: MediaField,
): string | File | null {
  if (original instanceof File) return original;
  if (typeof original === "string") return original;
  return cloned ?? null;
}

/**
 * FAQ items may arrive as an array (GET) or a JSON string (echoed back from a
 * multipart PATCH). The form always needs a mutable array so `useFieldArray`
 * can bind to it.
 */
function normalizeFaqItems(
  raw: unknown,
): SiteEssentialsFormValues["home_faq_items"] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try {
      list = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item) => ({
      question: String(item.question ?? ""),
      answer: String(item.answer ?? ""),
    }));
}

/**
 * Deep-clone site essentials for react-hook-form.
 * TanStack Query (and some merges) return frozen objects; RHF `values` / `reset`
 * must receive a mutable copy or nested assigns throw (e.g. typography.headingEmphasis).
 */
export function toMutableSiteEssentialsFormValues(
  source: SiteEssentialsFormValues | SiteEssentials,
): SiteEssentialsFormValues {
  const cloned = JSON.parse(JSON.stringify(source)) as SiteEssentialsFormValues;

  return {
    ...cloned,
    logo: preserveMediaField(cloned.logo, source.logo),
    favicon: preserveMediaField(cloned.favicon, source.favicon),
    cover_image: preserveMediaField(cloned.cover_image, source.cover_image),
    cover_video: preserveMediaField(cloned.cover_video, source.cover_video),
    main_landing_cover_image: preserveMediaField(
      cloned.main_landing_cover_image,
      source.main_landing_cover_image,
    ),
    typography: normalizeSiteEssentialsTypography(source.typography),
    theme_preset_id:
      "theme_preset_id" in source
        ? ((source as { theme_preset_id?: string | null }).theme_preset_id ??
          null)
        : (cloned.theme_preset_id ?? null),
    banner_heading_accent: cloned.banner_heading_accent ?? "",
    banner_heading_align: cloned.banner_heading_align ?? "center",
    banner_heading_valign: cloned.banner_heading_valign ?? "center",
    home_faq_items: normalizeFaqItems(
      (source as { home_faq_items?: unknown }).home_faq_items,
    ),
  };
}
