"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import siteEssentialsService from "@/services/common/site-essentials/site-essentials.service";
import { themeKeys } from "@/hooks/use-theme-query";
import { SiteEssentialsFormValues } from "./schema";
import { toSiteEssentialsUpdatePayload } from "./payload";

// Query key for site essentials
export const siteEssentialsKeys = {
  all: ["site-essentials"] as const,
  details: () => [...siteEssentialsKeys.all, "details"] as const,
  bySlug: (slug: string) =>
    [...siteEssentialsKeys.all, "by-slug", slug] as const,
};

/**
 * Hook to fetch site essentials data with TanStack Query caching
 */
export const useSiteEssentialsQuery = () => {
  return useQuery({
    queryKey: siteEssentialsKeys.details(),
    queryFn: () => siteEssentialsService.getSiteEssentials(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/** Fetch site essentials for a specific location (preview / review flow). */
export const useSiteEssentialsBySlugQuery = (
  slug: string | null | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: siteEssentialsKeys.bySlug(slug ?? ""),
    queryFn: () =>
      siteEssentialsService.getSiteEssentials({ slug: slug! }),
    enabled: enabled && Boolean(slug?.trim()),
    staleTime: 1000 * 60 * 2,
  });
};

/**
 * Hook to update site essentials with TanStack Query mutation
 */
/** Reset theme (colors + typography) to platform defaults — persists via API. */
export const useResetSiteEssentialsThemeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => siteEssentialsService.resetSiteEssentialsThemeToDefault(),
    onSuccess: (data) => {
      queryClient.setQueryData(siteEssentialsKeys.details(), data);
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
    },
  });
};

export const useSiteEssentialsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SiteEssentialsFormValues>) =>
      siteEssentialsService.updateSiteEssentials(
        toSiteEssentialsUpdatePayload(data as SiteEssentialsFormValues),
      ),
    onSuccess: (data) => {
      // Immediately update the cache with the new data.
      // dataUpdatedAt changes → logo/favicon previews get a fresh ?v= cache key
      // (backend often overwrites the same storage path).
      queryClient.setQueryData(siteEssentialsKeys.details(), data);
      void queryClient.invalidateQueries({ queryKey: themeKeys.all });
    },
  });
};
