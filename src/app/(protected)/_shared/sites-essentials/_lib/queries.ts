"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import siteEssentialsService from "@/services/common/site-essentials/site-essentials.service";
import { SiteEssentialsFormValues } from "./schema";

// Query key for site essentials
export const siteEssentialsKeys = {
  all: ["site-essentials"] as const,
  details: () => [...siteEssentialsKeys.all, "details"] as const,
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

/**
 * Hook to update site essentials with TanStack Query mutation
 */
export const useSiteEssentialsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SiteEssentialsFormValues>) =>
      siteEssentialsService.updateSiteEssentials(data),
    onSuccess: (data) => {
      // Immediately update the cache with the new data
      queryClient.setQueryData(siteEssentialsKeys.details(), data);
    },
  });
};
