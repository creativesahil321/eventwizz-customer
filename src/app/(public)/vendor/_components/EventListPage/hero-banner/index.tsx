"use client";

import { useContext, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { SiteHeading } from "@/components/public/site-heading";
import { HeroCoverImage } from "@/components/public/hero-cover-image";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import {
  heroBandContentPadClass,
  heroBandHeightClass,
  heroBandMediaOverlayClass,
  heroBandVerticalClass,
  heroBannerStackClass,
  heroBannerSubheadingClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
  type BannerHeadingAlign,
  type BannerHeadingValign,
} from "@/lib/banner-heading-align";
// Default fallback media
// const FALLBACK_VIDEO_URL =
//   "https://www.bestpartiesever.com/wp-content/uploads/2025/03/Website-video-combined-edit-online-video-cutter.com-1.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://www.lovebrunch.co.uk/cdn/shop/videos/c/vp/5db45c2d897b410e96fcb1d4b4956c46/5db45c2d897b410e96fcb1d4b4956c46.HD-720p-4.5Mbps-43850554.mp4?v=0";
const DEFAULT_IMAGE_URL = "https://tinyurl.com/bdycmxcv";
const FALLBACK_VIDEO_URL =
  "https://videos.pexels.com/video-files/9228852/9228852-uhd_2560_1440_24fps.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://assets.mixkit.co/videos/48504/48504-720.mp4";
// const FALLBACK_VIDEO_URL = "https://assets.mixkit.co/videos/339/339-720.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://assets.mixkit.co/videos/40627/40627-720.mp4";
// const FALLBACK_VIDEO_URL =
//   "https://static.vecteezy.com/system/resources/previews/028/545/493/mp4/people-on-dance-floor-in-the-club-aerial-view-free-video.mp4";
// const DEFAULT_IMAGE_URL = "https://tinyurl.com/bdycmxcv";

interface HeroBannerProps {
  locationName?: string;
  /** `null` = cleared in editor Preview; `undefined` = use theme fallback */
  coverImage?: string | null;
  /** `null` = cleared in editor Preview; `undefined` = use theme fallback */
  coverVideo?: string | null;
  bannerHeading?: string | null;
  bannerSubHeading?: string | null;
  /** When set (including ""), overrides theme `banner_heading_accent` — use for site-essentials preview */
  bannerHeadingAccent?: string | null;
  /** When set, overrides theme `typography.headingEmphasis` — use for site-essentials preview */
  headingEmphasis?: HeadingEmphasis;
  /** When set, overrides theme `banner_heading_align` */
  bannerHeadingAlign?: BannerHeadingAlign | null;
  /** When set, overrides theme `banner_heading_valign` */
  bannerHeadingValign?: BannerHeadingValign | null;
  /**
   * Fixed chrome at the bottom of the hero (e.g. search).
   * Rendered outside the heading stack so left/center/right + top/middle/bottom
   * alignment never moves it.
   */
  heroFooter?: ReactNode;
}

export default function HeroBanner({
  locationName,
  coverImage,
  coverVideo,
  bannerHeading: propBannerHeading,
  bannerSubHeading: propBannerSubHeading,
  bannerHeadingAccent,
  headingEmphasis,
  bannerHeadingAlign: bannerHeadingAlignProp,
  bannerHeadingValign: bannerHeadingValignProp,
  heroFooter,
}: HeroBannerProps) {
  const { theme } = useContext(ServerContext) || { theme: null };
  const vendorTheme = theme as ThemeSchema | null;

  // Get banner content from theme or use defaults - with API data taking priority
  const bannerHeading =
    propBannerHeading ||
    vendorTheme?.banner_heading ||
    (locationName ? `${locationName} Events` : "Events");

  const bannerSubheading =
    propBannerSubHeading ||
    vendorTheme?.banner_sub_heading ||
    "Check out our latest events";

  const bannerAccentHint =
    bannerHeadingAccent !== undefined
      ? bannerHeadingAccent && String(bannerHeadingAccent).trim().length > 0
        ? String(bannerHeadingAccent).trim()
        : null
      : typeof vendorTheme?.banner_heading_accent === "string" &&
          vendorTheme.banner_heading_accent.trim().length > 0
        ? vendorTheme.banner_heading_accent.trim()
        : null;

  // Media priority: explicit cover video → explicit cover image → theme video → theme image → fallback.
  // `null` = intentional clear from Site Essentials Preview (do not resurrect theme media).
  // `undefined` = prop omitted; theme may fill in (public site pages).
  const videoExplicitlyCleared = coverVideo === null;
  const imageExplicitlyCleared = coverImage === null;
  const apiVideoUrl =
    typeof coverVideo === "string" && coverVideo.trim() ? coverVideo : null;
  const apiImageUrl =
    typeof coverImage === "string" && coverImage.trim() ? coverImage : null;
  const themeVideoUrl = vendorTheme?.cover_video || null;
  const themeImageUrl = vendorTheme?.cover_image || null;

  const hasApiVideo = Boolean(apiVideoUrl);
  const hasApiImage = Boolean(apiImageUrl);
  const hasThemeVideo = Boolean(themeVideoUrl) && !videoExplicitlyCleared;
  const hasThemeImage = Boolean(themeImageUrl) && !imageExplicitlyCleared;

  // Unsaved preview images must beat the live theme video (common Site Essentials case).
  const useVideo =
    hasApiVideo ||
    (!hasApiImage && hasThemeVideo) ||
    (!hasApiVideo &&
      !hasApiImage &&
      !hasThemeVideo &&
      !hasThemeImage &&
      !videoExplicitlyCleared &&
      !imageExplicitlyCleared);

  const finalVideoUrl = apiVideoUrl || themeVideoUrl || FALLBACK_VIDEO_URL;
  // LCP hero: deterministic URL (no time-based `?v=`) so SSR and client match and the
  // <img>/preload is not re-downloaded after hydration (that swap is the flash).
  const finalImageUrl = apiImageUrl || themeImageUrl || DEFAULT_IMAGE_URL;

  const textAlign = normalizeBannerHeadingAlign(
    bannerHeadingAlignProp !== undefined && bannerHeadingAlignProp !== null
      ? bannerHeadingAlignProp
      : vendorTheme?.banner_heading_align,
  );
  const heroValign = normalizeBannerHeadingValign(
    bannerHeadingValignProp !== undefined && bannerHeadingValignProp !== null
      ? bannerHeadingValignProp
      : vendorTheme?.banner_heading_valign,
  );
  const stackClass = heroBannerStackClass(textAlign);

  return (
    <section
      id="hero"
      className={cn(
        "relative mx-auto flex w-full justify-center overflow-hidden",
        heroBandHeightClass,
        heroBandVerticalClass(heroValign),
        /*
         * Left + center: stretch cross-axis so the block is full-width (row flex-col hero
         * would otherwise shrink-wrap and center the column). Do NOT stretch for top/bottom
         * valign — that overrides items-start/items-end and pins copy to the top of a tall box.
         */
        textAlign === "left" && heroValign === "center" && "!items-stretch",
      )}
    >
      {/* Video background if video URL exists and should be used */}
      {useVideo && (
        <div className="absolute inset-0 h-full w-full overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={finalImageUrl || undefined}
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          >
            <source src={finalVideoUrl || undefined} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className={cn("absolute inset-0", heroBandMediaOverlayClass)} />
        </div>
      )}

      {/* Image background — slight scale for edge bleed; optimized LCP cover */}
      {!useVideo && finalImageUrl ? (
        <div className="absolute inset-0 overflow-hidden">
          <HeroCoverImage
            key={finalImageUrl}
            src={finalImageUrl}
            className="scale-105"
          />
          <div className={cn("absolute inset-0", heroBandMediaOverlayClass)} />
        </div>
      ) : null}

      {/* Soft brand gradient orbs */}
      <div
        className="pointer-events-none absolute left-1/4 top-20 h-96 w-96 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_22%,transparent)] blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] blur-[100px]"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-7xl overflow-visible px-4",
          heroBandContentPadClass(heroValign, {
            withBottomChrome: Boolean(heroFooter),
          }),
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={cn(stackClass, "overflow-visible")}
        >
          <SiteHeading
            level={1}
            title={bannerHeading}
            accentHint={bannerAccentHint}
            emphasis={headingEmphasis}
            variant="onDark"
            align={textAlign}
            className={cn(
              "mb-4 max-w-full min-w-0 break-words font-black !text-3xl !leading-[1.15] tracking-tight sm:!text-4xl md:!text-5xl lg:!text-6xl",
              textAlign === "left"
                ? "max-w-[min(100%,30rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                : "max-w-4xl",
            )}
          />

          {/* Sub-heading: wide-tracking small caps */}
          {bannerSubheading ? (
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65 sm:text-xs",
                heroBannerSubheadingClass(textAlign),
                "max-w-sm sm:max-w-md",
              )}
            >
              {bannerSubheading}
            </p>
          ) : null}
        </motion.div>
      </div>

      {/* Independent of heading align/valign — always bottom-centered */}
      {heroFooter ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-4 sm:px-4 sm:pb-5 md:pb-6">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            {heroFooter}
          </div>
        </div>
      ) : null}
    </section>
  );
}
