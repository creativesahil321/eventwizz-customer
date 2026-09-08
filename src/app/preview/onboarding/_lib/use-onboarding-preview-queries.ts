"use client";

import { useQuery } from "@tanstack/react-query";
import siteEssentialsService from "@/services/common/site-essentials/site-essentials.service";
import type { SiteEssentials } from "@/services/common/site-essentials/type";

export type OnboardingPreviewEventData = SiteEssentials & {
  event?: {
    event_id?: number;
    is_rooms?: boolean;
    logo?: string | null;
    favicon?: string | null;
    copyright?: string | null;
    footer_brand_description?: string | null;
    address?: string;
    phone?: string;
    email?: string | null;
    event_name?: string;
    slug?: string;
    event_banner_image?: string | null;
    event_banner_video?: string | null;
    event_banner_heading?: string;
    event_banner_sub_heading?: string;
    /** Parent location hero position on `?event_slug=` payloads. */
    banner_heading_align?: "left" | "center" | "right" | null;
    banner_heading_valign?: "top" | "center" | "bottom" | null;
    about_event_heading?: string;
    about_event_sub_heading?: string;
    about_event_description?: string;
    /** Flat single-event payload (`is_rooms: false`) — same fields as room entries. */
    event_schedular_title?: string;
    event_schedule_subtitle?: string;
    event_schedular_background_image?: string | null;
    event_schedular?: Array<{ time: string; title: string }>;
    package_title?: string;
    package_description?: string;
    package_image?: string | null;
    package_details?: Array<{ title: string }>;
    dates?: Array<{
      event_date: string;
      price: number;
      sold_out: boolean;
    }>;
    event_galley?: Array<{ url: string }>;
    menu_title?: string;
    menu_background_image?: string | null;
    menu_description?: string;
    menus?: Array<{
      name: string;
      items: Array<{ title: string; description: string }>;
    }>;
    drink_title?: string;
    drink_description?: string;
    packages?: Array<{
      id: number;
      title: string;
      description: string;
      price: string;
      available_quantity: number;
    }>;
    event_address?: string;
    lat?: string;
    long?: string;
    brochure_pdf?: string | null;
    brochure_pdf_2?: string | null;
    faq_pdf?: string | null;
    rooms?: Record<
      string,
      {
        room_id?: number;
        event_schedular_title?: string;
        event_schedule_subtitle?: string;
        event_schedular_background_image?: string | null;
        event_schedular?: Array<{ time: string; title: string }>;
        package_title?: string;
        package_description?: string;
        package_image?: string | null;
        package_details?: Array<{ title: string }>;
        dates?: Array<{
          event_date: string;
          price: number;
          sold_out: boolean;
        }>;
        event_galley?: Array<{ url: string }>;
        menu_title?: string;
        menu_background_image?: string | null;
        menu_description?: string;
        menus?: Array<{
          name: string;
          items: Array<{ title: string; description: string }>;
        }>;
        drink_title?: string;
        drink_description?: string;
        packages?: Array<{
          id: number;
          title: string;
          description: string;
          price: string;
          available_quantity: number;
        }>;
        event_address?: string;
        lat?: string;
        long?: string;
        brochure_pdf?: string | null;
        brochure_pdf_2?: string | null;
      }
    >;
    faqs?: Array<{ question: string; answer: string }>;
  };
};

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
    refetchOnWindowFocus: false,
  });
}
