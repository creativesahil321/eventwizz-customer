"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Map, LayoutGrid } from "lucide-react";
import LocationSelectionHeader from "@/app/(public)/vendor/_components/LocationPage/location-selection-header";
import LocationGrid from "@/app/(public)/vendor/_components/LocationPage/location-grid";
import GoogleLocationMap from "@/app/(public)/vendor/_components/LocationPage/location-map-google";
import SubscribeSection from "@/app/(public)/vendor/_components/EventListPage/subscribe";
import FooterSection from "@/app/(public)/vendor/_components/EventListPage/footer";
import { SiteHeading } from "@/components/public/site-heading";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
  heroBandContentPadClass,
  heroBandHeightClass,
  heroBandMediaOverlayClass,
  heroBandVerticalClass,
  heroBannerStackClass,
  vendorHomeSubheroClass,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import { SiteEssentialsFormValues } from "../_lib/schema";
import { siteEssentialsToPreviewRootStyle } from "../_lib/preview-root-style";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import type { LocationData } from "@/types/theme.types";

interface MainLandingSitePreviewProps {
  formValues: SiteEssentialsFormValues;
  /** Preview only: jump to that location in the review flow. */
  onLocationSelect?: (slug: string) => void | boolean;
}

function getPreviewUrl(
  value: string | File | null | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof File) return URL.createObjectURL(value);
  return undefined;
}

/**
 * Multi-location main home for Site Essentials preview.
 * Kept in sync with live `VendorSiteHomePage` (hero, map/grid, newsletter, footer).
 */
export function MainLandingSitePreview({
  formValues,
  onLocationSelect,
}: Readonly<MainLandingSitePreviewProps>) {
  const previewStyles = siteEssentialsToPreviewRootStyle(formValues);
  const [viewMode, setViewMode] = useState<"map" | "grid">("grid");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setViewMode("grid");
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const heroImageSrc =
    getPreviewUrl(formValues.main_landing_cover_image) ||
    getPreviewUrl(formValues.cover_image) ||
    "/assets/images/Homepage/Homepage-Banner.png";

  const heroHeading =
    formValues.main_landing_banner_heading?.trim() ||
    formValues.banner_heading?.trim() ||
    "Find Events Near You";

  const heroSubheading =
    formValues.main_landing_banner_sub_heading?.trim() ||
    "Discover verified venues and curated events in your area. Browse by location to find the perfect experience.";

  const locationsTitle =
    formValues.main_landing_locations_list_title?.trim() || "Choose Your City";

  const locationsSubtitle =
    formValues.main_landing_locations_list_subtitle?.trim() ||
    "Tap a city to see all upcoming events";

  const heroAccentHint = formValues.banner_heading_accent?.trim() || null;

  const locations = (formValues.locations ?? []) as LocationData[];

  const handleLocationSelect = (slug: string) => {
    if (onLocationSelect) {
      return onLocationSelect(slug);
    }
    return false;
  };

  return (
    <div
      style={previewStyles}
      className="relative flex min-h-screen w-full min-w-0 flex-col bg-[var(--color-background)] font-body text-[color:var(--color-text)]"
    >
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-main-landing-preview"
        headingStack={formValues.typography?.fontFamily?.heading}
        bodyStack={formValues.typography?.fontFamily?.body}
        customStylesheetUrls={formValues.typography?.customFontStylesheetUrls}
      />
      <LocationSelectionHeader
        logo={getPreviewUrl(formValues.logo)}
        name={formValues.name?.trim() || "EventWizz"}
      />

      <section
        className={cn(
          "relative mx-auto flex w-full min-w-0 justify-center overflow-hidden",
          heroBandHeightClass,
          heroBandVerticalClass("center"),
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
        <div
          className={cn(
            "relative z-10 mx-auto w-full min-w-0 max-w-7xl overflow-visible px-4",
            heroBandContentPadClass("center"),
          )}
        >
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              heroBannerStackClass("center"),
              "w-full min-w-0 overflow-visible",
            )}
          >
            <SiteHeading
              level={1}
              title={heroHeading}
              accentHint={heroAccentHint}
              emphasis={normalizeHeadingEmphasis(
                formValues.typography?.headingEmphasis,
              )}
              variant="onDark"
              align="center"
              className="mb-6 w-full min-w-0 max-w-full font-bold !text-3xl !leading-[0.98] sm:!text-4xl md:!text-5xl md:max-w-5xl lg:!text-6xl"
            />
            <p className={vendorHomeSubheroClass("center")}>{heroSubheading}</p>
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
                title={locationsTitle}
                variant="onSurface"
                className="mb-3 !text-3xl !font-black tracking-tight sm:!text-4xl"
              />
              <p className="text-[var(--color-text-dimmed)]">
                {locationsSubtitle}
              </p>
            </div>
          ) : null}

          {viewMode === "map" && !isMobile ? (
            <GoogleLocationMap
              locations={locations}
              onSelect={handleLocationSelect}
            />
          ) : (
            <LocationGrid
              locations={locations}
              isLoading={false}
              onSelect={handleLocationSelect}
            />
          )}
        </motion.div>
      </section>

      <SubscribeSection />

      <FooterSection
        copyright={formValues.copyright}
        logo={getPreviewUrl(formValues.logo) || null}
      />
    </div>
  );
}
