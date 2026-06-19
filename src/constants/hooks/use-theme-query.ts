"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThemeSchema } from "@/types/theme.types";
import { themeService } from "@/services/common/theme/theme.service";

/**
 * Query keys for theme data - simplified to avoid duplicates
 */
export const themeKeys = {
  all: ["theme"] as const,
};

/**
 * Hook to fetch theme data using TanStack Query
 *
 * @param domain - Domain name to fetch theme for
 * @param initialData - Initial theme data, potentially from server-side rendering
 * @returns Theme query result with data, loading state, and error
 */
export const useThemeQuery = (
  domain: string | undefined | null,
  initialData: ThemeSchema | null = null
) => {
  // Use a mutable clone so TanStack Query never mutates a read-only (frozen) server object
  const mutableInitialData = useMemo(
    () => (initialData ? structuredClone(initialData) : undefined),
    [initialData]
  );

  return useQuery({
    // Use a single query key for all theme data
    queryKey: themeKeys.all,
    queryFn: async () => {
      if (!domain) {
        throw new Error("Domain is required to fetch theme");
      }

      const response = await themeService.getThemeSettingsByDomain(domain);

      if (!response.isSuccess || !response.data) {
        throw new Error(response.message || "Failed to fetch theme settings");
      }

      return response.data;
    },
    enabled: !!domain,
    initialData: mutableInitialData,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep unused data in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus to reduce API calls
    refetchOnMount: false, // Don't refetch on component mount if we have data
  });
};
