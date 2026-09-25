import type { SiteEssentials } from "@/services/common/site-essentials/type";
import type { SiteEssentialsFormValues } from "./schema";
import type { LocationData } from "@/types/theme.types";
import {
  isBannerHeadingAlign,
  isBannerHeadingValign,
} from "@/lib/banner-heading-align";
import {
  mergeSiteEssentialsListingEvents,
  normalizeSiteEssentialsGallery,
} from "./site-essentials-preview-events";

function coalesceMedia(
  formVal: string | File | null | undefined,
  apiVal: string | null | undefined,
): string | File | null | undefined {
  if (formVal instanceof File) return formVal;
  if (formVal === null) return null;
  if (typeof formVal === "string" && formVal.trim().length > 0) {
    return formVal;
  }
  // JSON.parse(JSON.stringify(File)) becomes `{}` — treat as missing so we
  // do not skip the API URL, and never pass a non-URL into <img src>.
  if (typeof apiVal === "string" && apiVal.trim().length > 0) {
    return apiVal;
  }
  if (typeof formVal === "string" || formVal instanceof File || formVal == null) {
    return formVal ?? apiVal ?? null;
  }
  return apiVal ?? null;
}

function coalesceText(
  formVal: string | null | undefined,
  apiVal: string | null | undefined,
): string | null | undefined {
  if (typeof formVal === "string" && formVal.trim().length > 0) {
    return formVal;
  }
  if (typeof apiVal === "string" && apiVal.trim().length > 0) {
    return apiVal;
  }
  return formVal ?? apiVal ?? "";
}

function mediaToPreviewUrl(
  value: string | File | null | undefined,
): string | null {
  if (value instanceof File) return URL.createObjectURL(value);
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return null;
}

/** True for in-browser unsaved media (Import / file picker) — not a persisted API URL. */
export function isUnsavedPreviewMedia(value: unknown): boolean {
  if (value instanceof File) return true;
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.startsWith("blob:") || v.startsWith("data:");
}

/**
 * Keep API location metadata, but prefer unsaved form/import covers so Main home
 * city cards show Import/upload changes before Save.
 */
export function mergeLocationsPreferUnsavedCovers(
  apiLocations: LocationData[],
  formLocations: LocationData[] | undefined,
  editorSlug?: string | null,
  editorCover?: string | File | null,
): LocationData[] {
  if (!apiLocations.length) {
    return overlayUnsavedLocationCoverOnLocations(
      formLocations,
      editorSlug,
      editorCover,
    ) ?? [];
  }

  const formBySlug = new Map(
    (formLocations ?? [])
      .filter((loc) => typeof loc.slug === "string" && loc.slug.trim())
      .map((loc) => [loc.slug.trim(), loc] as const),
  );
  const editorCoverUrl = mediaToPreviewUrl(editorCover);
  const slug = editorSlug?.trim();

  return apiLocations.map((apiLoc) => {
    const key = apiLoc.slug?.trim();
    if (!key) return apiLoc;

    const formLoc = formBySlug.get(key);
    if (formLoc && isUnsavedPreviewMedia(formLoc.cover_image)) {
      return {
        ...apiLoc,
        cover_image: String(formLoc.cover_image).trim(),
      };
    }

    if (
      slug &&
      key === slug &&
      editorCoverUrl &&
      isUnsavedPreviewMedia(editorCover ?? editorCoverUrl)
    ) {
      return { ...apiLoc, cover_image: editorCoverUrl };
    }

    return apiLoc;
  });
}

/**
 * Paint the editor's unsaved location cover onto the matching city card so Main
 * home preview shows Import/upload changes before Save.
 */
export function overlayUnsavedLocationCoverOnLocations(
  locations: LocationData[] | undefined,
  slug: string | null | undefined,
  coverImage: string | File | null | undefined,
): LocationData[] | undefined {
  if (!locations?.length) return locations;
  const previewSlug = slug?.trim();
  const coverUrl = mediaToPreviewUrl(coverImage);
  if (!previewSlug || !coverUrl) return locations;
  if (!isUnsavedPreviewMedia(coverImage ?? coverUrl)) return locations;

  let changed = false;
  const next = locations.map((loc) => {
    if (loc.slug?.trim() !== previewSlug) return loc;
    if (loc.cover_image === coverUrl) return loc;
    changed = true;
    return { ...loc, cover_image: coverUrl };
  });
  return changed ? next : locations;
}

/** Tags which location's hero/about fields are in the editor snapshot (multi-location). */
export function withPreviewLocationSlug(
  formData: SiteEssentialsFormValues,
  slug?: string | null,
): SiteEssentialsFormValues {
  const resolved = slug?.trim() || formData.slug?.trim();
  if (!resolved) return formData;
  return { ...formData, slug: resolved };
}

/** API or merged editor snapshot — coalesce source only, not a PATCH payload. */
export type SiteEssentialsPreviewApiSource =
  | SiteEssentials
  | SiteEssentialsFormValues;

/** Ensures preview has API-backed media when form/store is missing fields. */
export function mergeSiteEssentialsPreviewWithApi(
  formData: SiteEssentialsFormValues,
  api: SiteEssentialsPreviewApiSource | undefined,
): SiteEssentialsFormValues {
  if (!api) {
    return {
      ...formData,
      locations: overlayUnsavedLocationCoverOnLocations(
        formData.locations as LocationData[] | undefined,
        formData.slug,
        formData.cover_image,
      ) as SiteEssentialsFormValues["locations"],
    };
  }

  /** Prefer API location rows, but keep unsaved Import/upload covers from the form. */
  const apiLocations = Array.isArray(api.locations) ? api.locations : [];
  const formLocations = Array.isArray(formData.locations)
    ? formData.locations
    : [];
  const coverImage = coalesceMedia(
    formData.cover_image,
    api.cover_image,
  ) as SiteEssentialsFormValues["cover_image"];
  const resolvedSlug =
    formData.slug?.trim() || api.slug?.trim() || undefined;
  const locations =
    apiLocations.length > 0
      ? mergeLocationsPreferUnsavedCovers(
          apiLocations as LocationData[],
          formLocations as LocationData[],
          resolvedSlug,
          coverImage,
        )
      : overlayUnsavedLocationCoverOnLocations(
          formLocations as LocationData[],
          resolvedSlug,
          coverImage,
        );

  return {
    ...formData,
    locations: locations as SiteEssentialsFormValues["locations"],
    logo: coalesceMedia(formData.logo, api.logo) as SiteEssentialsFormValues["logo"],
    favicon: coalesceMedia(
      formData.favicon,
      api.favicon,
    ) as SiteEssentialsFormValues["favicon"],
    main_landing_cover_image: coalesceMedia(
      formData.main_landing_cover_image,
      api.main_landing_cover_image,
    ) as SiteEssentialsFormValues["main_landing_cover_image"],
    cover_image: coverImage,
    main_landing_banner_heading: coalesceText(
      formData.main_landing_banner_heading,
      api.main_landing_banner_heading,
    ),
    main_landing_banner_sub_heading: coalesceText(
      formData.main_landing_banner_sub_heading,
      api.main_landing_banner_sub_heading,
    ),
    main_landing_locations_list_title: coalesceText(
      formData.main_landing_locations_list_title,
      api.main_landing_locations_list_title,
    ),
    main_landing_locations_list_subtitle: coalesceText(
      formData.main_landing_locations_list_subtitle,
      api.main_landing_locations_list_subtitle,
    ),
    banner_heading: coalesceText(formData.banner_heading, api.banner_heading),
    banner_sub_heading: coalesceText(
      formData.banner_sub_heading,
      api.banner_sub_heading,
    ),
    banner_heading_accent: coalesceText(
      formData.banner_heading_accent,
      api.banner_heading_accent,
    ),
    banner_heading_align: isBannerHeadingAlign(formData.banner_heading_align)
      ? formData.banner_heading_align
      : isBannerHeadingAlign(api.banner_heading_align)
        ? api.banner_heading_align
        : formData.banner_heading_align ?? api.banner_heading_align,
    banner_heading_valign: isBannerHeadingValign(formData.banner_heading_valign)
      ? formData.banner_heading_valign
      : isBannerHeadingValign(api.banner_heading_valign)
        ? api.banner_heading_valign
        : formData.banner_heading_valign ?? api.banner_heading_valign,
    about_title: coalesceText(formData.about_title, api.about_title),
    about_description: coalesceText(
      formData.about_description,
      api.about_description,
    ),
    footer_brand_description: coalesceText(
      formData.footer_brand_description,
      api.footer_brand_description,
    ),
    about_link_title: coalesceText(
      formData.about_link_title,
      api.about_link_title,
    ),
    about_cta_link: coalesceText(formData.about_cta_link, api.about_cta_link),
    terms_and_conditions: coalesceText(
      formData.terms_and_conditions,
      api.terms_and_conditions,
    ),
    privacy_policy: coalesceText(formData.privacy_policy, api.privacy_policy),
    refund_policy: coalesceText(formData.refund_policy, api.refund_policy),
    cookie_policy: coalesceText(formData.cookie_policy, api.cookie_policy),
    vendor_terms: coalesceText(formData.vendor_terms, api.vendor_terms),
    about_page_content: coalesceText(
      formData.about_page_content,
      api.about_page_content,
    ),
    how_it_works_page_content: coalesceText(
      formData.how_it_works_page_content,
      api.how_it_works_page_content,
    ),
    contact_page_content: coalesceText(
      formData.contact_page_content,
      api.contact_page_content,
    ),
    company_legal_name: coalesceText(
      formData.company_legal_name,
      api.company_legal_name,
    ),
    company_number: coalesceText(formData.company_number, api.company_number),
    company_registered_office: coalesceText(
      formData.company_registered_office,
      api.company_registered_office,
    ),
    company_phone: coalesceText(formData.company_phone, api.company_phone),
    company_email: coalesceText(formData.company_email, api.company_email),
    event_title_1: coalesceText(formData.event_title_1, api.event_title_1),
    event_title_2: coalesceText(formData.event_title_2, api.event_title_2),
    event_gallery_title: coalesceText(
      formData.event_gallery_title,
      api.event_gallery_title,
    ),
    cover_video: coalesceMedia(
      formData.cover_video,
      api.cover_video,
    ) as SiteEssentialsFormValues["cover_video"],
    slug: resolvedSlug,
    latest_events: mergeSiteEssentialsListingEvents(
      formData.latest_events,
      api.latest_events,
    ) as unknown as SiteEssentialsFormValues["latest_events"],
    upcoming_events: mergeSiteEssentialsListingEvents(
      formData.upcoming_events,
      api.upcoming_events,
    ) as unknown as SiteEssentialsFormValues["upcoming_events"],
    event_gallery:
      normalizeSiteEssentialsGallery(formData.event_gallery).length > 0
        ? normalizeSiteEssentialsGallery(formData.event_gallery)
        : normalizeSiteEssentialsGallery(api.event_gallery),
  };
}
