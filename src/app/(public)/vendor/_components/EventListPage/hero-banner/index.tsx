"use client";

import { useContext, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { SiteHeading } from "@/components/public/site-heading";
import { HeroCoverImage } from "@/components/public/hero-cover-image";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { buildMapsDirectionsUrl } from "@/lib/resolve-venue-contact";
import { useIsPreviewMode } from "@/contexts/preview-context";
import {
  usePreviewDeviceFramesEnabled,
  usePreviewMobileLayout,
} from "@/hooks/use-preview-narrow-layout";
import {
  heroBandContentPadClass,
  heroBandCopyPlacementClass,
  heroBandHeightClass,
  heroBandMediaOverlayClass,
  heroBannerBodyClass,
  heroBannerEyebrowClass,
  heroBannerHeadingTypeClass,
  heroBannerStackClass,
  heroBannerVenueContactClass,
  heroBannerVenueContactLinksClass,
  heroFooterDockClass,
  heroHeadingMeasureClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
  previewMobileHeroHeightClass,
  previewMobileHeroPadClass,
  type BannerHeadingAlign,
  type BannerHeadingValign,
} from "@/lib/banner-heading-align";
import {
  previewFlexFromMd,
  previewFlexOnlyUntilMd,
} from "@/lib/preview-container-layout";
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
  /** Small-caps city / region above the title — never the brand/site name. */
  eyebrow?: string | null;
  /** Address, email, and phone under the description (location covers). */
  heroContact?: {
    address?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
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
  eyebrow,
  heroContact,
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
  const hasContact = Boolean(
    heroContact?.address?.trim() ||
      heroContact?.email?.trim() ||
      heroContact?.phone?.trim(),
  );
  /**
   * Contact is painted twice (heading stack + search dock) and toggled with
   * `md:` + `@max-md/preview`. On a wide monitor the viewport is still `md+`,
   * so both copies can show in the 390px Mobile frame and stack on the same
   * pixels. Skip the heading copy in that frame.
   *
   * The 390px frame is also wider than `@sm` (384px), so `@max-sm/preview`
   * compact height/padding never apply. Laptop `sm:`/`md:` padding then
   * vertically centers the subtitle on top of the docked contact + search.
   */
  const isPreviewMobile = usePreviewMobileLayout();
  const isPreview = useIsPreviewMode();
  const previewFrames = usePreviewDeviceFramesEnabled();
  /**
   * Onboarding device frames sit in a wide monitor, so viewport `md:` still
   * thinks the page is desktop. Stack address then email/phone so the hero
   * column stays as tight as the live location page.
   */
  const stackHeroContact =
    isPreviewMobile || (isPreview && previewFrames);
  const showHeadingContact = hasContact && !isPreviewMobile;
  const showDockContact = hasContact && Boolean(heroFooter);
  const previewAlign: BannerHeadingAlign = isPreviewMobile
    ? "center"
    : textAlign;
  const previewAlignScope = { fromMd: !isPreviewMobile };
  const copyValign =
    isPreviewMobile && heroFooter ? "top" : heroValign;

  return (
    <section
      id="hero"
      className={cn(
        "relative mx-auto w-full overflow-hidden",
        heroBandHeightClass,
        isPreviewMobile && previewMobileHeroHeightClass,
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

      <div
        className={cn(
          heroBandCopyPlacementClass(copyValign),
          "max-w-7xl px-3 sm:px-4",
          heroHeadingMeasureClass,
          "@max-md/preview:!px-3",
          heroBandContentPadClass(copyValign, {
            withBottomChrome: Boolean(heroFooter),
          }),
          isPreviewMobile && heroFooter && previewMobileHeroPadClass,
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={cn(
            heroBannerStackClass(previewAlign, previewAlignScope),
            "min-h-0 max-h-full",
          )}
        >
          {eyebrow?.trim() &&
          eyebrow.trim().toLowerCase() !== bannerHeading.trim().toLowerCase() ? (
            <p className={heroBannerEyebrowClass(previewAlign, previewAlignScope)}>
              {eyebrow.trim()}
            </p>
          ) : null}

          <SiteHeading
            level={1}
            title={bannerHeading}
            accentHint={bannerAccentHint}
            emphasis={headingEmphasis}
            variant="onDark"
            align={previewAlign}
            alignFromMd={!isPreviewMobile}
            className={cn(
              "font-black tracking-tight",
              heroBannerHeadingTypeClass,
              previewAlign === "left"
                ? "max-w-4xl md:max-w-3xl"
                : "max-w-4xl",
            )}
          />

          {bannerSubheading ? (
            <p className={heroBannerBodyClass(previewAlign, previewAlignScope)}>
              {bannerSubheading}
            </p>
          ) : null}

          {showHeadingContact ? (
            <div className={heroFooter ? previewFlexFromMd : undefined}>
              <HeroBannerContactMeta
                contact={heroContact}
                align={previewAlign}
                stacked={stackHeroContact}
                linksInline={!isPreviewMobile}
              />
            </div>
          ) : null}
        </motion.div>
      </div>

      {/* Independent of heading align/valign — always bottom-centered */}
      {heroFooter ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
          <div
            className={cn(
              "mx-auto w-full max-w-7xl px-3 pb-3 sm:px-4 sm:pb-5 md:pb-6",
              "@max-md/preview:!px-2.5 @max-md/preview:!pb-3",
              isPreviewMobile && "!px-2.5 !pb-3",
            )}
          >
            <div
              className={cn(
                heroFooterDockClass(previewAlign),
                "flex flex-col gap-3 sm:gap-3.5",
                isPreviewMobile && "!gap-2.5",
              )}
            >
              {showDockContact ? (
                <div
                  className={
                    isPreviewMobile ? undefined : previewFlexOnlyUntilMd
                  }
                >
                  <HeroBannerContactMeta
                    contact={heroContact}
                    align={previewAlign}
                    stacked={stackHeroContact}
                    linksInline={!isPreviewMobile}
                  />
                </div>
              ) : null}
              {heroFooter}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HeroBannerContactMeta({
  contact,
  align,
  stacked = false,
  linksInline = false,
}: {
  contact?: HeroBannerProps["heroContact"];
  align: BannerHeadingAlign;
  stacked?: boolean;
  /** When stacked, keep email + phone on one row (desktop/tablet preview). */
  linksInline?: boolean;
}) {
  const address = contact?.address?.trim() || null;
  const email = contact?.email?.trim() || null;
  const phone = contact?.phone?.trim() || null;
  if (!address && !email && !phone) return null;

  return (
    <div
      className={cn(
        heroBannerVenueContactClass(align, { fromMd: true }),
        stacked &&
          "!flex !w-fit !max-w-xl !flex-col !items-center !justify-center !gap-2 sm:!max-w-2xl",
      )}
    >
      {address ? (
        <HeroContactLine
          href={buildMapsDirectionsUrl(address)}
          external
          icon={MapPin}
          label={address}
          block
        />
      ) : null}
      {email || phone ? (
        <div
          className={cn(
            heroBannerVenueContactLinksClass(align, { fromMd: true }),
            stacked &&
              (linksInline
                ? "!flex !w-fit !max-w-full !flex-row !flex-wrap !items-center !justify-center !gap-x-5 !gap-y-1.5"
                : "!flex !w-fit !max-w-full !flex-col !flex-nowrap !items-center !justify-center !gap-2"),
          )}
        >
          {email ? (
            <HeroContactLine href={`mailto:${email}`} icon={Mail} label={email} />
          ) : null}
          {phone ? (
            <HeroContactLine href={`tel:${phone}`} icon={Phone} label={phone} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HeroContactLine({
  href,
  icon: Icon,
  label,
  external = false,
  block = false,
}: {
  href: string;
  icon: typeof MapPin;
  label: string;
  external?: boolean;
  block?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      className={cn(
        "inline-flex min-w-0 items-start gap-2 text-[13px] leading-snug text-white/90 transition-colors hover:text-white sm:text-sm @max-md/preview:!text-[13px]",
        block
          ? "max-w-full justify-center text-pretty"
          : "w-auto max-w-full shrink-0",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
      <span className="min-w-0 text-pretty [overflow-wrap:anywhere]">{label}</span>
    </a>
  );
}
