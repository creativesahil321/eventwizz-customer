"use client";

import { useContext, type ReactNode } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { SiteHeading } from "@/components/public/site-heading";
import { HeroCoverImage } from "@/components/public/hero-cover-image";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { useIsPreviewMode } from "@/contexts/preview-context";
import {
  usePreviewDeviceFramesEnabled,
  usePreviewMobileLayout,
} from "@/hooks/use-preview-narrow-layout";
import {
  heroBandContentPadClass,
  heroBandCopyPlacementClass,
  heroBandCopyPlacementStyle,
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
  PreviewEditHoverBadge,
  PreviewEditHoverFrame,
  shouldIgnorePreviewEditClick,
} from "@/components/preview/preview-edit-hint";
import { previewFlexOnlyUntilMd } from "@/lib/preview-container-layout";
import { PublicHeroBreadcrumbs } from "@/components/public/public-hero-breadcrumbs";
import type { EventHeroBreadcrumb } from "@/lib/event-hero-meta";
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
  /**
   * Hide media + copy and pin the footer dock (location search).
   * Keep the same instance so the search input does not remount mid-keystroke.
   */
  collapsed?: boolean;
  /** Home / location trail — multi-venue location pages only. */
  breadcrumbs?: EventHeroBreadcrumb[] | null;
  /** Small-caps city / region above the title — never the brand/site name. */
  eyebrow?: string | null;
  /** Email and phone under the description. Street address stays in the footer. */
  heroContact?: {
    email?: string | null;
    phone?: string | null;
  } | null;
  /** Onboarding preview: click the cover to edit branding. */
  onEditCover?: () => void;
  /** Onboarding preview: click the heading/subheading to edit banner text. */
  onEditBanner?: () => void;
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
  collapsed = false,
  breadcrumbs,
  eyebrow,
  heroContact,
  onEditCover,
  onEditBanner,
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
    heroContact?.email?.trim() || heroContact?.phone?.trim(),
  );
  /**
   * Keep the search dock independent from hero copy placement. This prevents
   * mobile and short-desktop previews from moving the search bar with the copy.
   */
  const isPreviewMobile = usePreviewMobileLayout();
  const isPreview = useIsPreviewMode();
  const previewFrames = usePreviewDeviceFramesEnabled();
  /** Stack contact details in narrow device frames. */
  const stackHeroContact = isPreviewMobile || (isPreview && previewFrames);
  const showHeadingContact = hasContact && !heroFooter && !collapsed;
  const showDockContact = hasContact && Boolean(heroFooter) && !collapsed;
  const previewAlign: BannerHeadingAlign = isPreviewMobile
    ? "center"
    : textAlign;
  const previewAlignScope = { fromMd: !isPreviewMobile };
  const copyValign = heroValign;
  const canEditCover = Boolean(onEditCover) && !collapsed;

  return (
    <section
      id="hero"
      className={cn(
        "relative z-0 mx-auto w-full",
        collapsed
          ? "overflow-visible"
          : cn(
              "overflow-hidden",
              heroBandHeightClass,
              isPreviewMobile && previewMobileHeroHeightClass,
            ),
        canEditCover && "group/preview-edit cursor-pointer",
      )}
      title={canEditCover ? "Click to edit cover" : undefined}
      onClick={
        canEditCover
          ? (event) => {
              if (shouldIgnorePreviewEditClick(event.target)) return;
              if (
                event.target instanceof Element &&
                event.target.closest("[data-hero-banner-edit]")
              ) {
                return;
              }
              onEditCover?.();
            }
          : undefined
      }
    >
      {canEditCover ? (
        <>
          <PreviewEditHoverFrame className="z-[25]" />
          <div className="pointer-events-none absolute right-4 top-4 z-30">
            <PreviewEditHoverBadge label="cover" />
          </div>
        </>
      ) : null}
      {/* Video background if video URL exists and should be used */}
      {!collapsed && useVideo && (
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
      {!collapsed && !useVideo && finalImageUrl ? (
        <div className="absolute inset-0 overflow-hidden">
          <HeroCoverImage
            key={finalImageUrl}
            src={finalImageUrl}
            className="scale-105"
          />
          <div className={cn("absolute inset-0", heroBandMediaOverlayClass)} />
        </div>
      ) : null}

      {!collapsed ? (
      <div
        className={cn(
          heroBandCopyPlacementClass(copyValign),
          "max-w-7xl px-3 sm:px-4",
          heroHeadingMeasureClass,
          "@max-md/preview:!px-3",
          heroBandContentPadClass(copyValign, {
            withBottomChrome: Boolean(heroFooter),
          }),
          isPreviewMobile &&
            heroFooter &&
            copyValign === "top" &&
            previewMobileHeroPadClass,
        )}
        style={heroBandCopyPlacementStyle(copyValign)}
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
          <PublicHeroBreadcrumbs
            crumbs={breadcrumbs}
            align={previewAlign}
            centerOnNarrow={isPreviewMobile}
          />

          {eyebrow?.trim() &&
          eyebrow.trim().toLowerCase() !==
            bannerHeading.trim().toLowerCase() ? (
            <p
              className={heroBannerEyebrowClass(
                previewAlign,
                previewAlignScope,
              )}
            >
              {eyebrow.trim()}
            </p>
          ) : null}

          <div
            data-hero-banner-edit=""
            title={onEditBanner ? "Click to edit banner text" : undefined}
            onClick={
              onEditBanner
                ? (event) => {
                    event.stopPropagation();
                    onEditBanner();
                  }
                : undefined
            }
            className={cn(
              onEditBanner &&
                "group/banner-edit relative cursor-pointer rounded-sm",
            )}
          >
            <SiteHeading
              level={1}
              title={bannerHeading}
              accentHint={bannerAccentHint}
              emphasis={headingEmphasis}
              variant="onDark"
              align={previewAlign}
              alignFromMd={!isPreviewMobile}
              className={cn(
                "font-bold tracking-tight",
                heroBannerHeadingTypeClass,
                previewAlign === "left" ? "max-w-4xl md:max-w-3xl" : "max-w-4xl",
              )}
            />

            {bannerSubheading ? (
              <p className={heroBannerBodyClass(previewAlign, previewAlignScope)}>
                {bannerSubheading}
              </p>
            ) : null}
            {onEditBanner ? (
              <span className="pointer-events-none absolute -right-1 -top-1 inline-flex rounded-full bg-slate-950/80 p-1 text-white opacity-0 shadow ring-1 ring-white/15 transition-opacity group-hover/banner-edit:opacity-100">
                <Pencil className="h-3 w-3" aria-hidden />
              </span>
            ) : null}
          </div>

          {showHeadingContact ? (
            <div>
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
      ) : null}
      {heroFooter ? (
        <div
          data-preview-no-edit=""
          onClick={(event) => event.stopPropagation()}
          className={cn(
            collapsed
              ? "sticky top-[4.5rem] z-30 border-b border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-background)]/95 px-2.5 py-2 backdrop-blur-md sm:px-4 sm:py-3"
              : "pointer-events-none absolute inset-x-0 bottom-0 z-20",
          )}
        >
          <div
            className={cn(
              collapsed
                ? "mx-auto w-full max-w-3xl"
                : cn(
                    "mx-auto w-full max-w-7xl px-3 pb-3 sm:px-4 sm:pb-5 md:pb-6",
                    "@max-md/preview:!px-2.5 @max-md/preview:!pb-3",
                    isPreviewMobile && "!px-2.5 !pb-3",
                  ),
            )}
          >
            <div
              className={cn(
                heroFooterDockClass(previewAlign),
                "pointer-events-auto flex flex-col gap-3 sm:gap-3.5",
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
  const email = contact?.email?.trim() || null;
  const phone = contact?.phone?.trim() || null;
  if (!email && !phone) return null;

  return (
    <div
      className={cn(
        heroBannerVenueContactClass(align, { fromMd: true }),
        stacked &&
          "!flex !w-fit !max-w-xl !flex-col !items-center !justify-center !gap-2 sm:!max-w-2xl",
      )}
    >
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
            <HeroContactLine
              href={`mailto:${email}`}
              icon={Mail}
              label={email}
            />
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
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "inline-flex min-w-0 items-start gap-2 text-[13px] leading-snug text-white/90 transition-colors hover:text-white sm:text-sm @max-md/preview:!text-[13px]",
        block
          ? "max-w-full justify-center text-pretty"
          : "w-auto max-w-full shrink-0",
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
      <span className="min-w-0 text-pretty [overflow-wrap:anywhere]">
        {label}
      </span>
    </a>
  );
}
