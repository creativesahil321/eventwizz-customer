import type {
  OnboardingFormData,
  StepFiveType,
} from "../_components/form-provider/schema";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { siteEssentialsToPreviewRootStyle } from "@/app/(protected)/_shared/sites-essentials/_lib/preview-root-style";
import type { ThemeSchema } from "@/types/theme.types";
import { normalizeSlug } from "@/lib/utils";
import { ONBOARDING_DEFAULT_THEME } from "./onboarding-default-theme";
import { hasPlainText } from "@/lib/plain-text-length";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";

export { siteEssentialsToPreviewRootStyle };

function previewMediaUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value instanceof File) {
    return (value as File & { preview?: string }).preview?.trim() || "";
  }
  if (value && typeof value === "object" && "preview" in value) {
    const preview = (value as { preview?: unknown }).preview;
    return typeof preview === "string" ? preview.trim() : "";
  }
  return "";
}

function parsePositivePrice(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function minPriceFromDate(date: StepFiveType["dates"][number]): number | null {
  const nums: number[] = [];
  for (const ticket of date.tickets ?? []) {
    const n = parsePositivePrice(ticket.price);
    if (n != null) nums.push(n);
  }
  for (const table of date.tables ?? []) {
    const n = parsePositivePrice(table.price);
    if (n != null) nums.push(n);
  }
  return nums.length > 0 ? Math.min(...nums) : null;
}

function collectOnboardingPreviewPrice(
  form: OnboardingFormData,
  dates: StepFiveType["dates"],
): number | null {
  const ticketPrices = dates
    .map((date) => minPriceFromDate(date))
    .filter((n): n is number => n != null);
  if (ticketPrices.length > 0) return Math.min(...ticketPrices);

  const brochurePrices: number[] = [];
  const rooms = form.multiSpace?.rooms ?? [];
  if (form.multiSpace?.enabled && rooms.length > 0) {
    for (const room of rooms) {
      const n = parsePositivePrice(room.brochure?.price_start_from);
      if (n != null) brochurePrices.push(n);
    }
  }
  const topLevel = parsePositivePrice(form.stepSeven?.price_start_from);
  if (topLevel != null) brochurePrices.push(topLevel);
  return brochurePrices.length > 0 ? Math.min(...brochurePrices) : null;
}

function collectOnboardingPreviewDates(
  form: OnboardingFormData,
): StepFiveType["dates"] {
  const rooms = form.multiSpace?.rooms ?? [];
  if (form.multiSpace?.enabled && rooms.length > 0) {
    const merged: StepFiveType["dates"] = [];
    for (const room of rooms) {
      const dates = room.dates?.dates;
      if (Array.isArray(dates) && dates.length > 0) {
        merged.push(...dates);
      }
    }
    if (merged.length > 0) return merged;
  }
  return form.stepFive?.dates ?? [];
}

function collectOnboardingSchedulerTimes(form: OnboardingFormData): {
  start: string | null;
  end: string | null;
} {
  const rooms = form.multiSpace?.rooms ?? [];
  const rows =
    form.multiSpace?.enabled && rooms.length > 0
      ? rooms[0]?.package?.event_schedular
      : form.stepFour?.event_schedular;
  const times = (Array.isArray(rows) ? rows : [])
    .map((row) => String(row?.time ?? "").trim())
    .filter(Boolean);
  return {
    start: times[0] ?? null,
    end: times.length > 1 ? times[times.length - 1] : null,
  };
}

function collectOnboardingGallery(
  form: OnboardingFormData,
): NonNullable<SiteEssentialsFormValues["event_gallery"]> {
  const rooms = form.multiSpace?.rooms ?? [];
  const gallery =
    form.multiSpace?.enabled && rooms.length > 0
      ? rooms[0]?.package?.gallery
      : form.stepFour?.gallery;
  if (!Array.isArray(gallery)) return [];

  const urls: NonNullable<SiteEssentialsFormValues["event_gallery"]> = [];
  gallery.forEach((item, index) => {
    const url =
      typeof item === "string"
        ? (item as string).trim()
        : previewMediaUrl(item) ||
          (item && typeof item === "object" && "url" in item
            ? String((item as { url?: string }).url ?? "").trim()
            : "");
    if (!url) return;
    urls.push({ id: index + 1, url });
  });
  return urls;
}

/**
 * Location homepage preview cards must use the draft event — never the
 * hardcoded “Live Music Night” sample.
 */
export function buildOnboardingPreviewListingEvents(
  form: OnboardingFormData,
  categoryName?: string | null,
): Record<string, unknown>[] {
  const name =
    form.stepThree?.event_name?.trim() ||
    form.stepThree?.event_banner_heading?.trim() ||
    "";
  if (!name) return [];

  const dates = collectOnboardingPreviewDates(form);
  const dated = dates
    .map((date) => String(date.event_date ?? "").trim())
    .filter((eventDate) => eventDate.length > 0)
    .sort((a, b) => a.localeCompare(b));
  const nextDate = dated[0] ?? null;
  const lowestPrice = collectOnboardingPreviewPrice(form, dates);
  const { start, end } = collectOnboardingSchedulerTimes(form);
  const categoryLabel = categoryName?.trim() || null;

  return [
    {
      name,
      slug: normalizeSlug(name) || "event",
      banner_image: previewMediaUrl(form.stepThree?.event_banner_image),
      lowest_price: lowestPrice,
      event_category_name: categoryLabel,
      category: categoryLabel
        ? { id: form.stepThree?.event_category_id ?? 0, name: categoryLabel, slug: "" }
        : null,
      next_available_date: nextDate,
      event_date: nextDate,
      start_time: start,
      end_time: end,
    },
  ];
}

function themeColorsToFormColors(
  theme: ThemeSchema | null | undefined,
): SiteEssentialsFormValues["colors"] {
  const c = theme?.colors;
  const d = ONBOARDING_DEFAULT_THEME.colors!;
  return {
    primary: c?.primary ?? d.primary,
    secondary: c?.secondary ?? d.secondary,
    header: c?.header ?? d.header,
    footer: c?.footer ?? d.footer,
    background: c?.background ?? d.background,
    surface: c?.surface ?? d.surface,
    text: c?.text ?? d.text,
    textDimmed: c?.textDimmed ?? d.textDimmed,
    socialLogin: {
      google: c?.socialLogin?.google ?? d.socialLogin?.google ?? "",
      microsoft: c?.socialLogin?.microsoft ?? d.socialLogin?.microsoft ?? "",
    },
  };
}

/**
 * Maps onboarding step 1–2 + tenant theme into Site Essentials shape so the same
 * Try theme UI and CSS variable bundle as Site Essentials / preview can run here.
 */
export function buildOnboardingStepTwoSiteEssentialsValues(
  form: OnboardingFormData,
  theme: ThemeSchema | null | undefined,
  categoryName?: string | null,
): SiteEssentialsFormValues {
  const s1 = form.stepOne;
  const s2 = form.stepTwo;
  const year = new Date().getFullYear();
  const venueName = (s1?.name ?? "").trim();
  const listingEvents: Record<string, unknown>[] = buildOnboardingPreviewListingEvents(form, categoryName);
  const gallery = collectOnboardingGallery(form);

  return {
    colors: themeColorsToFormColors(theme),
    typography: {
      fontFamily: {
        heading:
          theme?.typography?.fontFamily?.heading ??
          ONBOARDING_DEFAULT_THEME.typography?.fontFamily?.heading ??
          "Space Grotesk, sans-serif",
        body:
          theme?.typography?.fontFamily?.body ??
          ONBOARDING_DEFAULT_THEME.typography?.fontFamily?.body ??
          "Inter, sans-serif",
      },
      customFontStylesheetUrls:
        theme?.typography?.customFontStylesheetUrls ?? [],
      headingEmphasis:
        theme?.typography?.headingEmphasis ??
        ONBOARDING_DEFAULT_THEME.typography?.headingEmphasis ??
        "accent_tail",
    },
    socialLinks: {
      facebook: theme?.socialLinks?.facebook ?? "",
      twitter: theme?.socialLinks?.twitter ?? "",
      instagram: theme?.socialLinks?.instagram ?? "",
      linkedin: theme?.socialLinks?.linkedin ?? "",
      youtube: theme?.socialLinks?.youtube ?? "",
    },
    seo: {
      title: venueName,
      description: s2?.about_description?.trim() || s1?.description?.trim() || "",
      keywords: "",
    },
    name: venueName,
    copyright:
      theme?.copyright?.trim() ||
      (venueName ? `© ${year} ${venueName}` : `© ${year}`),
    footer_brand_description:
      (hasPlainText(s2?.footer_brand_description)
        ? s2.footer_brand_description
        : firstFooterBrandDescription(
            s2?.about_description,
            s1?.description,
          )) ?? "",
    logo: s2?.logo ?? null,
    favicon: null,
    banner_heading: s2?.banner_heading ?? "",
    banner_heading_accent: theme?.banner_heading_accent ?? "",
    banner_heading_align: theme?.banner_heading_align ?? "center",
    banner_heading_valign: theme?.banner_heading_valign ?? "center",
    banner_sub_heading: s2?.banner_sub_heading ?? "",
    cover_image: s2?.cover_image ?? null,
    cover_video: null,
    about_title: s2?.about_title ?? "",
    about_description: s2?.about_description?.trim() || s1?.description?.trim() || "",
    company_phone: s1?.contact_number ?? null,
    company_email: s1?.email ?? null,
    company_registered_office: s1?.address ?? null,
    contactDetails: {
      phone: s1?.contact_number ?? "",
      email: s1?.email ?? "",
      address: s1?.address ?? "",
    },
    about_link_title: "",
    about_cta_link: "",
    event_title_1: "",
    event_title_2: "",
    event_gallery_title: "",
    upcoming_events: listingEvents,
    event_gallery: gallery,
    domain: null,
    website_role: undefined,
    theme_animations: undefined,
  };
}

