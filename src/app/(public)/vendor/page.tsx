"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useThemeQuery } from "@/hooks/use-theme-query";
import { SingleLocationHome } from "./_components/single-location-home";
import { VendorMainLandingView } from "./_components/LocationPage/vendor-main-landing-view";
import type { LocationData } from "@/types/theme.types";
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorSiteHomePage() {
  const router = useRouter();
  const { domain, settings, isLoading: isDomainLoading } = useDomain();
  const { data: liveTheme } = useThemeQuery(domain, settings);
  const [isLoading, setIsLoading] = useState(true);

  const allLocations = useMemo(
    () => liveTheme?.locations || settings?.locations || [],
    [liveTheme?.locations, settings?.locations],
  );

  const singleLocation: LocationData | null =
    allLocations.length === 1 ? allLocations[0] : null;

  const heroImageSrc = useMemo(() => {
    const cover =
      liveTheme?.main_landing_cover_image ??
      settings?.main_landing_cover_image ??
      liveTheme?.cover_image ??
      settings?.cover_image;
    // LCP hero: keep the URL deterministic so SSR HTML and the client render match.
    // A time-based `?v=` (query dataUpdatedAt) differs between server and client and
    // forces the <img>/preload to re-download after hydration = a visible flash.
    // Any backend-provided version query in `cover` is preserved as-is.
    if (typeof cover === "string" && cover.trim().length > 0) {
      return cover.trim();
    }
    return "/assets/images/Homepage/Homepage-Banner.png";
  }, [
    liveTheme?.main_landing_cover_image,
    liveTheme?.cover_image,
    settings?.main_landing_cover_image,
    settings?.cover_image,
  ]);

  const heroHeading = useMemo(() => {
    const main =
      typeof liveTheme?.main_landing_banner_heading === "string"
        ? liveTheme.main_landing_banner_heading.trim()
        : typeof settings?.main_landing_banner_heading === "string"
          ? settings.main_landing_banner_heading.trim()
          : "";
    if (main.length > 0) return main;
    const fallback =
      typeof liveTheme?.banner_heading === "string"
        ? liveTheme.banner_heading.trim()
        : typeof settings?.banner_heading === "string"
          ? settings.banner_heading.trim()
          : "";
    return fallback.length > 0 ? fallback : "Find Events Near You";
  }, [
    liveTheme?.main_landing_banner_heading,
    liveTheme?.banner_heading,
    settings?.main_landing_banner_heading,
    settings?.banner_heading,
  ]);

  const heroSubheading = useMemo(() => {
    // Prefer dedicated main-home copy; fall back to location banner_sub_heading
    // (same pattern as heroHeading → banner_heading) when the theme API omits
    // main_landing_banner_sub_heading — otherwise the hardcoded default shows.
    const main =
      typeof liveTheme?.main_landing_banner_sub_heading === "string"
        ? liveTheme.main_landing_banner_sub_heading.trim()
        : typeof settings?.main_landing_banner_sub_heading === "string"
          ? settings.main_landing_banner_sub_heading.trim()
          : "";
    if (main.length > 0) return main;
    const fallback =
      typeof liveTheme?.banner_sub_heading === "string"
        ? liveTheme.banner_sub_heading.trim()
        : typeof settings?.banner_sub_heading === "string"
          ? settings.banner_sub_heading.trim()
          : "";
    return fallback.length > 0
      ? fallback
      : "Discover verified venues and curated events in your area. Browse by location to find the perfect experience.";
  }, [
    liveTheme?.main_landing_banner_sub_heading,
    liveTheme?.banner_sub_heading,
    settings?.main_landing_banner_sub_heading,
    settings?.banner_sub_heading,
  ]);

  const locationsListTitle = useMemo(() => {
    const t =
      typeof liveTheme?.main_landing_locations_list_title === "string"
        ? liveTheme.main_landing_locations_list_title.trim()
        : typeof settings?.main_landing_locations_list_title === "string"
          ? settings.main_landing_locations_list_title.trim()
          : "";
    return t.length > 0 ? t : "Choose Your City";
  }, [
    liveTheme?.main_landing_locations_list_title,
    settings?.main_landing_locations_list_title,
  ]);

  const locationsListSubtitle = useMemo(() => {
    const t =
      typeof liveTheme?.main_landing_locations_list_subtitle === "string"
        ? liveTheme.main_landing_locations_list_subtitle.trim()
        : typeof settings?.main_landing_locations_list_subtitle === "string"
          ? settings.main_landing_locations_list_subtitle.trim()
          : "";
    return t.length > 0 ? t : "Tap a city to see all upcoming events";
  }, [
    liveTheme?.main_landing_locations_list_subtitle,
    settings?.main_landing_locations_list_subtitle,
  ]);

  const heroAccentHint =
    typeof liveTheme?.banner_heading_accent === "string" &&
    liveTheme.banner_heading_accent.trim().length > 0
      ? liveTheme.banner_heading_accent.trim()
      : typeof settings?.banner_heading_accent === "string" &&
          settings.banner_heading_accent.trim().length > 0
        ? settings.banner_heading_accent.trim()
        : null;

  const brandName = liveTheme?.name || settings?.name || "EventWizz";

  const heroBadgeLabel = useMemo(() => {
    const legal =
      typeof liveTheme?.company_legal_name === "string" &&
      liveTheme.company_legal_name.trim().length > 0
        ? liveTheme.company_legal_name.trim()
        : typeof settings?.company_legal_name === "string" &&
            settings.company_legal_name.trim().length > 0
          ? settings.company_legal_name.trim()
          : null;
    return legal || brandName;
  }, [
    brandName,
    liveTheme?.company_legal_name,
    settings?.company_legal_name,
  ]);

  useEffect(() => {
    if (isDomainLoading) {
      return;
    }

    if (allLocations && allLocations.length > 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  }, [allLocations, isDomainLoading]);

  if (!isDomainLoading && singleLocation && settings) {
    return <SingleLocationHome location={singleLocation} settings={settings} />;
  }

  if (isDomainLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-background)]">
        <Skeleton className="h-[60px] w-full rounded-none" />
        <Skeleton className="h-[min(55dvh,590px)] w-full rounded-none" />
        <div className="mx-auto mt-8 w-full max-w-[1180px] px-4">
          <Skeleton className="mx-auto mb-6 h-10 w-56 rounded-full" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[5/6] w-full rounded-[20px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <VendorMainLandingView
      brandName={brandName}
      logo={liveTheme?.logo || settings?.logo}
      heroImageSrc={heroImageSrc}
      heroHeading={heroHeading}
      heroSubheading={heroSubheading}
      heroAccentHint={heroAccentHint}
      heroBadgeLabel={heroBadgeLabel}
      headingEmphasis={
        liveTheme?.typography?.headingEmphasis ??
        settings?.typography?.headingEmphasis
      }
      locationsListTitle={locationsListTitle}
      locationsListSubtitle={locationsListSubtitle}
      locations={allLocations}
      locationsLoading={isLoading || isDomainLoading}
      onSelectLocation={(slug) => {
        router.push(`/${slug}`);
      }}
      copyright={settings?.copyright}
      footerLogo={settings?.logo}
      exploreCitiesSectionId="explore-cities"
    />
  );
}
