"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import LocationSelectionHeader from "@/app/(public)/vendor/_components/LocationPage/location-selection-header";
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
import { SiteEssentialsFormValues } from "../_lib/schema";
import { siteEssentialsToPreviewRootStyle } from "../_lib/preview-root-style";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import LocationGrid from "@/app/(public)/vendor/_components/LocationPage/location-grid";
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

export function MainLandingSitePreview({
  formValues,
  onLocationSelect,
}: Readonly<MainLandingSitePreviewProps>) {
  const previewStyles = siteEssentialsToPreviewRootStyle(formValues);

  const heroImageSrc =
    getPreviewUrl(formValues.main_landing_cover_image) ||
    "/assets/images/Homepage/Homepage-Banner.png";

  const heroHeading =
    formValues.main_landing_banner_heading?.trim() || "Find Events Near You";

  const heroSubheading =
    formValues.main_landing_banner_sub_heading?.trim() ||
    "Discover verified venues and curated events in your area. Browse by location to find the perfect experience.";

  const locationsTitle =
    formValues.main_landing_locations_list_title?.trim() ||
    "Choose Your City";

  const locationsSubtitle =
    formValues.main_landing_locations_list_subtitle?.trim() ||
    "Tap a city to see all upcoming events";

  const trustItems = [
    "Verified Venues",
    "Secure Bookings",
    "1,200+ Happy Customers",
  ] as const;

  const locations = (formValues.locations ?? []) as LocationData[];

  return (
    <div
      style={previewStyles}
      className="w-full min-w-0 text-[color:var(--color-text)] font-body"
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
          "relative flex w-full min-w-0 justify-center overflow-hidden",
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
            transition={{ duration: 0.6 }}
            className={cn(
              heroBannerStackClass("center"),
              "w-full min-w-0 overflow-visible",
            )}
          >
            <SiteHeading
              level={1}
              title={heroHeading}
              emphasis={normalizeHeadingEmphasis(
                formValues.typography?.headingEmphasis,
              )}
              variant="onDark"
              align="center"
              className="mb-6 w-full min-w-0 max-w-full font-bold !text-3xl !leading-[0.98] sm:!text-4xl md:!text-5xl"
            />
            <p className={vendorHomeSubheroClass("center")}>{heroSubheading}</p>
            <div className={vendorHomeTrustRowClass("center")}>
              {trustItems.map((label) => (
                <div
                  key={label}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2.5 text-sm text-white/90"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-[color:var(--color-primary)]"
                    aria-hidden
                  />
                  <span className="font-medium tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="w-full bg-[var(--color-background)] pb-16 pt-10">
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
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
          <LocationGrid
            locations={locations}
            isLoading={false}
            onSelect={(slug) => {
              if (onLocationSelect) {
                return onLocationSelect(slug);
              }
              return false;
            }}
          />
        </div>
      </section>
    </div>
  );
}
