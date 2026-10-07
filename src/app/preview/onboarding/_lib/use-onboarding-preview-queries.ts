"use client";

import { useQuery } from "@tanstack/react-query";
import siteEssentialsService from "@/services/common/site-essentials/site-essentials.service";
import type { OnboardingPreviewEventData } from "./onboarding-preview-types";

export type { OnboardingPreviewEventData } from "./onboarding-preview-types";

const onboardingPreviewKeys = {
  all: ["onboarding-preview"] as const,
  main: () => [...onboardingPreviewKeys.all, "main"] as const,
  location: (slug: string) =>
    [...onboardingPreviewKeys.all, "location", slug] as const,
  event: (eventSlug: string) =>
    [...onboardingPreviewKeys.all, "event", eventSlug] as const,
};

/** Main Landing Page — `?is_onboarding=true` */
export function useOnboardingPreviewMainQuery() {
  return useQuery({
    queryKey: onboardingPreviewKeys.main(),
    queryFn: () =>
      siteEssentialsService.getSiteEssentials({ is_onboarding: true }),
    staleTime: 1000 * 60 * 5,
    // Reviewing the site must show what onboarding just saved.
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

/** Location Page — `?is_onboarding=true&slug={slug}` */
export function useOnboardingPreviewLocationQuery(
  slug: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: onboardingPreviewKeys.location(slug ?? ""),
    queryFn: () =>
      siteEssentialsService.getSiteEssentials({
        is_onboarding: true,
        slug: slug!,
      }),
    enabled: enabled && Boolean(slug?.trim()),
    staleTime: 1000 * 60 * 5,
    // Reviewing the site must show what onboarding just saved.
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

/** Event Page — `?is_onboarding=true&event_slug={slug}` */
export function useOnboardingPreviewEventQuery(
  eventSlug: string | undefined,
  enabled = true,
) {
  return useQuery<OnboardingPreviewEventData>({
    queryKey: onboardingPreviewKeys.event(eventSlug ?? ""),
    queryFn: () =>
      siteEssentialsService.getSiteEssentials({
        is_onboarding: true,
        event_slug: eventSlug!,
      }) as Promise<OnboardingPreviewEventData>,
    enabled: enabled && Boolean(eventSlug?.trim()),
    staleTime: 1000 * 60 * 5,
    // Reviewing the site must show what onboarding just saved.
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}
