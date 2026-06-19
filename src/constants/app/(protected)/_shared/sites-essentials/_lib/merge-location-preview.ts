import type { SiteEssentials } from "@/services/common/site-essentials/type";
import type { SiteEssentialsFormValues } from "./schema";
import { mergeSiteEssentialsPreviewWithApi } from "./merge-preview-with-api";
import {
  normalizeSiteEssentialsEvents,
  normalizeSiteEssentialsGallery,
} from "./site-essentials-preview-events";

/** Location-scoped fields returned when fetching site essentials with a slug. */
const LOCATION_SCOPED_KEYS = [
  "banner_heading",
  "banner_sub_heading",
  "banner_heading_accent",
  "banner_heading_align",
  "banner_heading_valign",
  "cover_image",
  "cover_video",
  "about_title",
  "about_description",
  "about_link_title",
  "about_cta_link",
  "event_title_1",
  "event_title_2",
  "event_gallery_title",
  "slug",
  "latest_events",
  "upcoming_events",
  "event_gallery",
] as const;

/** Never replaced by per-location API — main landing review uses these from the editor. */
const MAIN_LANDING_KEYS = [
  "main_landing_cover_image",
  "main_landing_banner_heading",
  "main_landing_banner_sub_heading",
  "main_landing_locations_list_title",
  "main_landing_locations_list_subtitle",
] as const;

/** Filled from API only when the editor/preview snapshot has no value. */
const READONLY_FROM_API_KEYS = new Set<
  (typeof LOCATION_SCOPED_KEYS)[number]
>(["latest_events", "upcoming_events", "event_gallery", "slug"]);

export type MergeLocationPreviewOptions = {
  /** True when the vendor has only one location — editor fields always win. */
  isSingleLocation?: boolean;
  /** Slug of the location currently being previewed (multi-location). */
  previewSlug?: string;
};

function formFieldHasValue(value: unknown): boolean {
  if (value instanceof File) return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value != null && value !== "";
}

function shouldPreferFormLocationField(
  global: SiteEssentialsFormValues,
  formVal: unknown,
  options?: MergeLocationPreviewOptions,
): boolean {
  if (!formFieldHasValue(formVal)) return false;

  if (options?.isSingleLocation) return true;

  const formSlug = global.slug?.trim() ?? "";
  const previewSlug = options?.previewSlug?.trim() ?? "";

  if (previewSlug && formSlug) {
    return formSlug === previewSlug;
  }

  // Multi-location: don't apply another location's unsaved form fields.
  if (previewSlug && !formSlug) return false;

  return true;
}

function preserveMainLandingFields(
  merged: SiteEssentialsFormValues,
  global: SiteEssentialsFormValues,
): SiteEssentialsFormValues {
  const result = { ...merged };
  for (const key of MAIN_LANDING_KEYS) {
    if (key in global) {
      (result as Record<string, unknown>)[key] =
        global[key as keyof SiteEssentialsFormValues];
    }
  }
  return result;
}

/**
 * Builds preview form values for a location page: global branding/theme from the
 * editor snapshot, location hero/about/events from the slug-specific API response.
 */
export function mergeGlobalWithLocationSiteEssentials(
  global: SiteEssentialsFormValues,
  perLocation: SiteEssentials,
  locationLabel?: string,
  options?: MergeLocationPreviewOptions,
): SiteEssentialsFormValues {
  const apiFill: Partial<SiteEssentialsFormValues> = {};

  for (const key of LOCATION_SCOPED_KEYS) {
    if (READONLY_FROM_API_KEYS.has(key)) continue;

    const formVal = global[key as keyof SiteEssentialsFormValues];
    if (shouldPreferFormLocationField(global, formVal, options)) continue;

    const apiVal = perLocation[key as keyof SiteEssentials];
    if (apiVal !== undefined && apiVal !== null && apiVal !== "") {
      (apiFill as Record<string, unknown>)[key] = apiVal;
    }
  }

  const previewSlug =
    options?.previewSlug?.trim() ||
    perLocation.slug?.trim() ||
    global.slug?.trim() ||
    undefined;

  const merged = mergeSiteEssentialsPreviewWithApi(
    {
      ...global,
      ...apiFill,
      slug: previewSlug,
      locations: global.locations ?? perLocation.locations,
    },
    perLocation,
  );

  let result = preserveMainLandingFields(merged, global);

  const formSlug = global.slug?.trim() ?? "";
  const usePerLocationReadonlyFields =
    Boolean(previewSlug) &&
    !options?.isSingleLocation &&
    formSlug !== previewSlug;

  if (usePerLocationReadonlyFields) {
    result = {
      ...result,
      slug: previewSlug,
      latest_events: normalizeSiteEssentialsEvents(
        perLocation.latest_events,
      ) as unknown as SiteEssentialsFormValues["latest_events"],
      upcoming_events: normalizeSiteEssentialsEvents(
        perLocation.upcoming_events,
      ) as unknown as SiteEssentialsFormValues["upcoming_events"],
      event_gallery: normalizeSiteEssentialsGallery(perLocation.event_gallery),
    };
  }

  if (locationLabel?.trim()) {
    result = { ...result, name: locationLabel.trim() };
  }

  return result;
}
