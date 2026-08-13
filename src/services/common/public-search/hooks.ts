"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  publicSearchKeys,
  publicSearchService,
} from "./public-search.service";
import type {
  PublicAvailabilityParams,
  PublicSearchParams,
} from "./type";

/** User-entered filters that should trigger a search request. */
function hasSearchIntent(params: PublicSearchParams): boolean {
  const hasGeo =
    typeof params.lat === "number" &&
    Number.isFinite(params.lat) &&
    typeof params.lng === "number" &&
    Number.isFinite(params.lng);

  return Boolean(
    params.q?.trim() ||
      params.city?.trim() ||
      params.location_slug?.trim() ||
      params.date?.trim() ||
      hasGeo,
  );
}

/** Location page: path slug is scope, not search intent. */
function hasLocationPageSearchIntent(
  params: Omit<PublicSearchParams, "location_slug">,
): boolean {
  return Boolean(params.q?.trim() || params.date?.trim() || params.city?.trim());
}

export function usePublicSearch(
  domain: string | null | undefined,
  params: PublicSearchParams,
  options?: { enabled?: boolean },
) {
  const enabled =
    Boolean(domain) &&
    hasSearchIntent(params) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: publicSearchKeys.search(domain ?? "", params),
    queryFn: () => publicSearchService.search(domain!, params),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function usePublicLocationSearch(
  domain: string | null | undefined,
  locationSlug: string | null | undefined,
  params: Omit<PublicSearchParams, "location_slug">,
  options?: { enabled?: boolean },
) {
  const enabled =
    Boolean(domain) &&
    Boolean(locationSlug) &&
    hasLocationPageSearchIntent(params) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: publicSearchKeys.locationSearch(
      domain ?? "",
      locationSlug ?? "",
      params,
    ),
    queryFn: () =>
      publicSearchService.searchLocation(domain!, locationSlug!, params),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function usePublicAvailability(
  domain: string | null | undefined,
  params: PublicAvailabilityParams | null,
  options?: { enabled?: boolean },
) {
  const enabled =
    Boolean(domain) &&
    Boolean(params?.from && params?.to) &&
    options?.enabled !== false;

  return useQuery({
    queryKey: publicSearchKeys.availability(
      domain ?? "",
      params ?? { from: "", to: "" },
    ),
    queryFn: () => publicSearchService.availability(domain!, params!),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
