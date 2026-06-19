import type { SiteEssentials } from "@/services/common/site-essentials/type";
import type { SiteEssentialsFormValues } from "./schema";
import {
  normalizeSiteEssentialsEvents,
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
  if (typeof apiVal === "string" && apiVal.trim().length > 0) {
    return apiVal;
  }
  return formVal ?? apiVal ?? null;
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
  if (!api) return formData;

  /** `locations` is read-only from API — never let stale form/preview cache override. */
  const apiLocations = Array.isArray(api.locations) ? api.locations : [];
  const formLocations = Array.isArray(formData.locations) ? formData.locations : [];
  const locations = apiLocations.length > 0 ? apiLocations : formLocations;

  return {
    ...formData,
    locations,
    logo: coalesceMedia(formData.logo, api.logo) as SiteEssentialsFormValues["logo"],
    favicon: coalesceMedia(
      formData.favicon,
      api.favicon,
    ) as SiteEssentialsFormValues["favicon"],
    main_landing_cover_image: coalesceMedia(
      formData.main_landing_cover_image,
      api.main_landing_cover_image,
    ) as SiteEssentialsFormValues["main_landing_cover_image"],
    cover_image: coalesceMedia(
      formData.cover_image,
      api.cover_image,
    ) as SiteEssentialsFormValues["cover_image"],
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
    about_title: coalesceText(formData.about_title, api.about_title),
    about_description: coalesceText(
      formData.about_description,
      api.about_description,
    ),
    about_link_title: coalesceText(
      formData.about_link_title,
      api.about_link_title,
    ),
    about_cta_link: coalesceText(formData.about_cta_link, api.about_cta_link),
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
    slug: formData.slug?.trim() || api.slug?.trim() || undefined,
    latest_events: (
      normalizeSiteEssentialsEvents(formData.latest_events).length > 0
        ? normalizeSiteEssentialsEvents(formData.latest_events)
        : normalizeSiteEssentialsEvents(api.latest_events)
    ) as unknown as SiteEssentialsFormValues["latest_events"],
    upcoming_events: (
      normalizeSiteEssentialsEvents(formData.upcoming_events).length > 0
        ? normalizeSiteEssentialsEvents(formData.upcoming_events)
        : normalizeSiteEssentialsEvents(api.upcoming_events)
    ) as unknown as SiteEssentialsFormValues["upcoming_events"],
    event_gallery:
      normalizeSiteEssentialsGallery(formData.event_gallery).length > 0
        ? normalizeSiteEssentialsGallery(formData.event_gallery)
        : normalizeSiteEssentialsGallery(api.event_gallery),
  };
}
