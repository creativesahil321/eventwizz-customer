import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  PublicAvailabilityData,
  PublicAvailabilityParams,
  PublicSearchData,
  PublicSearchParams,
} from "./type";

function cleanDomain(domain: string): string {
  return domain.split(":")[0]?.trim() || domain;
}

function buildSearchQuery(params: PublicSearchParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  const q = params.q?.trim();
  if (q) query.q = q;
  if (params.city?.trim()) query.city = params.city.trim();
  if (params.location_slug?.trim()) {
    query.location_slug = params.location_slug.trim();
  }
  if (params.date?.trim()) query.date = params.date.trim();
  if (params.mode) query.mode = params.mode;
  if (params.page != null) query.page = params.page;
  if (params.per_page != null) query.per_page = params.per_page;

  // Near Me: both coords required — backend validates required_with.
  if (
    typeof params.lat === "number" &&
    Number.isFinite(params.lat) &&
    typeof params.lng === "number" &&
    Number.isFinite(params.lng)
  ) {
    query.lat = params.lat;
    query.lng = params.lng;
    if (typeof params.radius_km === "number" && Number.isFinite(params.radius_km)) {
      query.radius_km = params.radius_km;
    }
    if (params.sort?.trim()) query.sort = params.sort.trim();
  }

  return query;
}

export const publicSearchKeys = {
  all: ["public-search"] as const,
  search: (domain: string, params: PublicSearchParams) =>
    [...publicSearchKeys.all, "search", cleanDomain(domain), params] as const,
  locationSearch: (
    domain: string,
    locationSlug: string,
    params: Omit<PublicSearchParams, "location_slug">,
  ) =>
    [
      ...publicSearchKeys.all,
      "location-search",
      cleanDomain(domain),
      locationSlug,
      params,
    ] as const,
  availability: (domain: string, params: PublicAvailabilityParams) =>
    [
      ...publicSearchKeys.all,
      "availability",
      cleanDomain(domain),
      params,
    ] as const,
};

export const publicSearchService = {
  search: async (
    domain: string,
    params: PublicSearchParams = {},
  ): Promise<PublicSearchData> => {
    const url = API_ENDPOINTS.COMMON.PUBLIC_SEARCH.SEARCH.replace(
      "{domain}",
      encodeURIComponent(cleanDomain(domain)),
    );
    return api.get<PublicSearchData>(url, {
      params: buildSearchQuery(params),
    });
  },

  searchLocation: async (
    domain: string,
    locationSlug: string,
    params: Omit<PublicSearchParams, "location_slug"> = {},
  ): Promise<PublicSearchData> => {
    const url = API_ENDPOINTS.COMMON.PUBLIC_SEARCH.LOCATION_SEARCH.replace(
      "{domain}",
      encodeURIComponent(cleanDomain(domain)),
    ).replace("{location_slug}", encodeURIComponent(locationSlug));
    return api.get<PublicSearchData>(url, {
      params: buildSearchQuery(params),
    });
  },

  availability: async (
    domain: string,
    params: PublicAvailabilityParams,
  ): Promise<PublicAvailabilityData> => {
    const url = API_ENDPOINTS.COMMON.PUBLIC_SEARCH.AVAILABILITY.replace(
      "{domain}",
      encodeURIComponent(cleanDomain(domain)),
    );
    const query: Record<string, string> = {
      from: params.from,
      to: params.to,
    };
    if (params.q?.trim()) query.q = params.q.trim();
    if (params.city?.trim()) query.city = params.city.trim();
    if (params.location_slug?.trim()) {
      query.location_slug = params.location_slug.trim();
    }
    if (params.event_slug?.trim()) query.event_slug = params.event_slug.trim();
    if (params.group_by) query.group_by = params.group_by;

    return api.get<PublicAvailabilityData>(url, { params: query });
  },
};
