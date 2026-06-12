"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import LocationSelectionHeader from "./_components/LocationPage/location-selection-header";
import LocationGrid from "./_components/LocationPage/location-grid";
import GoogleLocationMap from "./_components/LocationPage/location-map-google";
import Image from "next/image";
import { motion } from "framer-motion";
import SubscribeSection from "./_components/EventListPage/subscribe";
import { CheckCircle2, Map, LayoutGrid } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
  heroBandContentPadClass,
  heroBandHeightClass,
  heroBandMediaOverlayClass,
  heroBandVerticalClass,
  heroBannerStackClass,
  vendorHomeSubheroClass,
  vendorHomeTrustRowClass,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import { SingleLocationHome } from "./_components/single-location-home";
import type { LocationData } from "@/types/theme.types";

export default function VendorSiteHomePage() {
  const router = useRouter();
  const { settings, isLoading: isDomainLoading } = useDomain();
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [isMobile, setIsMobile] = useState(false);

  const allLocations = useMemo(
    () => settings?.locations || [],
    [settings?.locations],
  );

  const singleLocation: LocationData | null =
    allLocations.length === 1 ? allLocations[0] : null;

  const heroImageSrc = useMemo(() => {
    const cover = settings?.main_landing_cover_image ?? settings?.cover_image;
    if (typeof cover === "string" && cover.trim().length > 0) {
      return cover.trim();
    }
    return "/assets/images/Homepage/Homepage-Banner.png";
  }, [settings?.main_landing_cover_image, settings?.cover_image]);

  const heroHeading = useMemo(() => {
    const main =
      typeof settings?.main_landing_banner_heading === "string"
        ? settings.main_landing_banner_heading.trim()
        : "";
    if (main.length > 0) return main;
    if (
      typeof settings?.banner_heading === "string" &&
      settings.banner_heading.trim().length > 0
    ) {
      return settings.banner_heading.trim();
    }
    return "Find Events Near You";
  }, [settings?.main_landing_banner_heading, settings?.banner_heading]);

  const heroSubheading = useMemo(() => {
    const sub =
      typeof settings?.main_landing_banner_sub_heading === "string"
        ? settings.main_landing_banner_sub_heading.trim()
        : "";
    if (sub.length > 0) return sub;
    return "Discover verified venues and curated events in your area. Browse by location to find the perfect experience.";
  }, [settings?.main_landing_banner_sub_heading]);

  const locationsListTitle = useMemo(() => {
    const t =
      typeof settings?.main_landing_locations_list_title === "string"
        ? settings.main_landing_locations_list_title.trim()
        : "";
    return t.length > 0 ? t : "Choose Your City";
  }, [settings?.main_landing_locations_list_title]);

  const locationsListSubtitle = useMemo(() => {
    const t =
      typeof settings?.main_landing_locations_list_subtitle === "string"
        ? settings.main_landing_locations_list_subtitle.trim()
        : "";
    return t.length > 0 ? t : "Tap a city to see all upcoming events";
  }, [settings?.main_landing_locations_list_subtitle]);

  const heroAccentHint =
    typeof settings?.banner_heading_accent === "string" &&
    settings.banner_heading_accent.trim().length > 0
      ? settings.banner_heading_accent.trim()
      : null;

  /** Vendor multi-location home is always centered; align/valign from Site Essentials apply on location + event pages only. */
  const heroAlign = "center" as const;
  const heroValign = "center" as const;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setViewMode("grid");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

  const handleLocationSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

  const trustItems = [
    "Verified Venues",
    "Secure Bookings",
    "1,200+ Happy Customers",
  ] as const;

  if (!isDomainLoading && singleLocation && settings) {
    return <SingleLocationHome location={singleLocation} settings={settings} />;
  }

  if (isDomainLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-background)] font-body text-[var(--color-text)]">
      <LocationSelectionHeader
        name={settings?.name || "EventWizz"}
        logo={settings?.logo}
      />

      {/* Hero — same capped height as location page HeroBanner */}
      <section
        className={cn(
          "relative mx-auto flex w-full justify-center overflow-hidden",
          heroBandHeightClass,
          heroBandVerticalClass(heroValign),
        )}
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            src={heroImageSrc}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized={!shouldUseNextImageOptimization(heroImageSrc)}
          />
          <div
            className={cn("absolute inset-0", heroBandMediaOverlayClass)}
            aria-hidden
          />
        </div>
        {/* Same horizontal frame + top pad as HeroBanner so copy clears fixed header */}
        <div
          className={cn(
            "relative z-10 mx-auto w-full min-w-0 max-w-7xl overflow-visible px-4",
            heroBandContentPadClass(heroValign),
          )}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              heroBannerStackClass(heroAlign),
              "w-full min-w-0 overflow-visible",
            )}
          >
            <SiteHeading
              level={1}
              title={heroHeading}
              accentHint={heroAccentHint}
              emphasis={normalizeHeadingEmphasis(
                settings?.typography?.headingEmphasis,
              )}
              variant="onDark"
              align={heroAlign}
              className="mb-6 w-full min-w-0 max-w-full font-bold !text-3xl !leading-[0.98] sm:!text-4xl md:!text-5xl md:max-w-5xl lg:!text-6xl"
            />

            <p className={vendorHomeSubheroClass(heroAlign)}>
              {heroSubheading}
            </p>

            <div className={vendorHomeTrustRowClass(heroAlign)}>
              {trustItems.map((label) => (
                <div
                  key={label}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2.5 text-sm text-white/90 shadow-lg shadow-black/20 backdrop-blur-md sm:inline-flex sm:w-auto sm:justify-start md:px-5"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[color:var(--color-primary)] md:h-[18px] md:w-[18px]"
                    aria-hidden
                  />
                  <span className="font-medium tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {!isMobile && (
        <section className="flex justify-center bg-[var(--color-background)] py-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] bg-[var(--color-surface)] p-1 shadow-sm"
          >
            <div className="flex">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  viewMode === "map"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]"
                }`}
              >
                <Map className="h-4 w-4" aria-hidden />
                Map View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                    : "text-[var(--color-text-dimmed)] hover:text-[var(--color-text)]"
                }`}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Grid View
              </button>
            </div>
          </motion.div>
        </section>
      )}

      <section
        className={cn(
          "bg-[var(--color-background)] pb-16 md:pb-20",
          /* Mobile skips map/grid strip — pull heading off the hero edge */
          isMobile ? "pt-10 sm:pt-12" : "pt-6 md:pt-8",
        )}
      >
        <motion.div
          className="container mx-auto max-w-7xl px-4 sm:px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
        >
          {viewMode === "grid" || isMobile ? (
            <div className="mb-10 text-center md:mb-12">
              <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-[color:var(--color-primary)]">
                Explore cities
              </span>
              <SiteHeading
                level={2}
                align="center"
                title={locationsListTitle}
                variant="onSurface"
                className="mb-3 !text-3xl !font-black tracking-tight sm:!text-4xl"
              />
              <p className="text-[var(--color-text-dimmed)]">
                {locationsListSubtitle}
              </p>
            </div>
          ) : null}

          {viewMode === "map" && !isMobile ? (
            <GoogleLocationMap
              locations={allLocations}
              onSelect={handleLocationSelect}
            />
          ) : (
            <LocationGrid
              locations={allLocations}
              isLoading={isLoading || isDomainLoading}
              onSelect={handleLocationSelect}
            />
          )}
        </motion.div>
      </section>

      <SubscribeSection />

      <motion.footer
        className="relative z-10 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-footer)] py-8 text-[var(--color-on-footer)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="text-sm opacity-90">
            {settings?.copyright || "© 2023 EventWizz. All rights reserved."}
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            {["Privacy Policy", "Terms of Service", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="opacity-85 transition-opacity hover:opacity-100"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
