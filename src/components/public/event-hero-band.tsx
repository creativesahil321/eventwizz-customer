"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, Pencil } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { HeroCoverImage } from "@/components/public/hero-cover-image";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import type {
  EventHeroBreadcrumb,
  EventHeroMeta,
} from "@/lib/event-hero-meta";
import {
  heroBandContentPadClass,
  heroBandVerticalClass,
  heroBannerContactRowClass,
  heroBannerHeadingTypeClass,
  heroBannerStackClass,
  heroHeadingAlignClass,
  heroHeadingMeasureClass,
  heroBannerSubheadingClass,
  heroBandMediaOverlayClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
  type BannerHeadingAlign,
  type BannerHeadingValign,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";
import {
  PreviewEditHoverBadge,
  PreviewEditHoverFrame,
} from "@/components/preview/preview-edit-hint";

type MediaInput =
  | string
  | File
  | { preview?: string; path?: string }
  | null
  | undefined;

export interface EventHeroBandProps {
  title: string;
  subHeading?: string | null;
  accentHint?: string | null;
  headingEmphasis?: HeadingEmphasis | undefined;
  bannerHeadingAlign?: BannerHeadingAlign | null;
  bannerHeadingValign?: BannerHeadingValign | null;
  /** Image — string URL or File (onboarding preview) */
  bannerImage?: MediaInput;
  /** Video — string URL or File (onboarding preview) */
  bannerVideo?: MediaInput;
  /** Add cache-busting for string image URLs (public live page) */
  cacheBustImage?: boolean;
  /** `alt` for the banner image when present */
  imageAlt?: string;
  /** Home / city / event trail (live event page). */
  breadcrumbs?: EventHeroBreadcrumb[] | null;
  /** Category chip under the crumbs (e.g. Festive). */
  categoryLabel?: string | null;
  /** Date / time / place row under the title. */
  meta?: EventHeroMeta | null;
  /** Rendered above the title row (e.g. “Back to …” on the live event page) */
  beforeTitle?: ReactNode;
  /**
   * Shown only when there is no banner image/video (e.g. onboarding “add cover” hint).
   * Live + vendor preview omit this — gradient-only hero.
   */
  emptyMediaSlot?: ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
  /** Extra classes on the outer `<section>` */
  className?: string;
  /** Onboarding preview: click the cover to edit event branding. */
  onEditHero?: () => void;
  /** Onboarding preview: click date / time / city on the cover. */
  onEditMeta?: (key: "date" | "time" | "location") => void;
  /**
   * Hint LCP: high fetch priority on hero `<img>` (live public pages).
   * Set false for small embeds if needed.
   */
  priorityHeroImage?: boolean;
}

function syncImageUrlFromInput(
  bannerImage: MediaInput,
  cacheBustImage: boolean,
): string {
  if (typeof bannerImage === "string" && bannerImage) {
    return cacheBustImage ? addCacheBusting(bannerImage) : bannerImage;
  }
  if (
    bannerImage &&
    typeof bannerImage === "object" &&
    !(bannerImage instanceof File) &&
    "preview" in bannerImage
  ) {
    const o = bannerImage as { preview?: string; path?: string };
    const raw = (o.preview || o.path || "").trim();
    if (!raw) return "";
    return cacheBustImage ? addCacheBusting(raw) : raw;
  }
  return "";
}

function syncVideoUrlFromInput(bannerVideo: MediaInput): string {
  if (typeof bannerVideo === "string" && bannerVideo) return bannerVideo;
  return "";
}

/**
 * Shared event detail hero — same markup for public event page, vendor preview, and onboarding.
 */
export function EventHeroBand({
  title,
  subHeading,
  accentHint,
  headingEmphasis,
  bannerHeadingAlign,
  bannerHeadingValign,
  bannerImage,
  bannerVideo,
  cacheBustImage = false,
  imageAlt = "",
  breadcrumbs,
  categoryLabel,
  meta,
  beforeTitle,
  emptyMediaSlot,
  sectionRef,
  className,
  priorityHeroImage = true,
  onEditHero,
  onEditMeta,
}: EventHeroBandProps) {
  const syncBgUrl = useMemo(
    () => syncImageUrlFromInput(bannerImage, cacheBustImage),
    [bannerImage, cacheBustImage],
  );
  const syncVideoUrl = useMemo(
    () => syncVideoUrlFromInput(bannerVideo),
    [bannerVideo],
  );

  const [blobImageUrl, setBlobImageUrl] = useState("");
  const [blobVideoUrl, setBlobVideoUrl] = useState("");

  useEffect(() => {
    if (bannerImage instanceof File) {
      const u = URL.createObjectURL(bannerImage);
      setBlobImageUrl(u);
      return () => {
        URL.revokeObjectURL(u);
        setBlobImageUrl("");
      };
    }
    setBlobImageUrl("");
    return undefined;
  }, [bannerImage]);

  useEffect(() => {
    if (bannerVideo instanceof File) {
      const u = URL.createObjectURL(bannerVideo);
      setBlobVideoUrl(u);
      return () => {
        URL.revokeObjectURL(u);
        setBlobVideoUrl("");
      };
    }
    setBlobVideoUrl("");
    return undefined;
  }, [bannerVideo]);

  const bgImage =
    bannerImage instanceof File ? blobImageUrl : syncBgUrl;
  const videoUrl =
    bannerVideo instanceof File ? blobVideoUrl : syncVideoUrl;

  const bannerAlign = normalizeBannerHeadingAlign(bannerHeadingAlign ?? "center");
  const bannerValign = normalizeBannerHeadingValign(
    bannerHeadingValign ?? "center",
  );
  const emphasis = normalizeHeadingEmphasis(headingEmphasis ?? undefined);

  const accent =
    typeof accentHint === "string" && accentHint.trim().length > 0
      ? accentHint.trim()
      : null;

  const crumbs = (breadcrumbs ?? []).filter((crumb) => crumb.label.trim());
  const chip = categoryLabel?.trim() || "";
  const metaDate = meta?.date?.trim() || "";
  const metaTime = meta?.time?.trim() || "";
  const metaLocation = meta?.location?.trim() || "";
  const hasMeta = Boolean(metaDate || metaTime || metaLocation);

  const heroStyles = {
    videoBackground: "absolute inset-0 h-full w-full object-cover",
  };

  const hasMedia = Boolean(bgImage || videoUrl);
  const awaitingFileBlob =
    (bannerImage instanceof File && !blobImageUrl) ||
    (bannerVideo instanceof File && !blobVideoUrl);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative mx-auto flex w-full overflow-hidden",
        "h-[min(70dvh,760px)] min-h-[400px] max-h-[820px]",
        heroBandVerticalClass(bannerValign),
        onEditHero && "group/preview-edit cursor-pointer",
        className,
      )}
      onClick={
        onEditHero
          ? (event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("[data-hero-meta-edit]")
              ) {
                return;
              }
              onEditHero();
            }
          : undefined
      }
      title={onEditHero ? "Click to edit event cover" : undefined}
    >
      {onEditHero ? (
        <>
          <PreviewEditHoverFrame className="z-[25]" />
          <div className="pointer-events-none absolute right-4 top-4 z-30">
            <PreviewEditHoverBadge label="cover" />
          </div>
        </>
      ) : null}
      <div className="absolute inset-0 overflow-hidden">
        {videoUrl ? (
          <>
            {bgImage && (
              <div
                className={`${heroStyles.videoBackground} scale-105 bg-cover bg-center`}
                style={{ backgroundImage: `url(${bgImage})` }}
              />
            )}
            <video
              src={videoUrl}
              poster={bgImage || undefined}
              className={cn(heroStyles.videoBackground, "scale-105")}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          </>
        ) : bgImage && !bgImage.startsWith("blob:") && priorityHeroImage ? (
          <HeroCoverImage
            src={bgImage}
            alt={imageAlt}
            className="scale-105"
          />
        ) : bgImage ? (
          // File blob / non-priority embeds — keep native <img> (next/image can't optimize blobs)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgImage}
            alt={imageAlt}
            className={cn(heroStyles.videoBackground, "scale-105")}
            decoding="async"
            fetchPriority={priorityHeroImage ? "high" : "auto"}
            loading="eager"
          />
        ) : awaitingFileBlob ? (
          <div className="absolute inset-0 animate-pulse bg-zinc-700" />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-background)] to-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-background))]"
            aria-hidden
          />
        )}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[1]",
            heroBandMediaOverlayClass,
          )}
          aria-hidden
        />
      </div>

      <div
        className={cn(
          "relative z-20 mx-auto max-w-7xl overflow-visible px-3 sm:px-4",
          heroHeadingMeasureClass,
          heroBandContentPadClass(bannerValign),
        )}
      >
        <div
          className={cn(
            heroBannerStackClass(bannerAlign, { fromMd: true }),
            "overflow-visible",
          )}
        >
          {crumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className={cn(
                "text-xs font-medium tracking-wide text-white/80 sm:text-sm",
                heroHeadingAlignClass(bannerAlign, { fromMd: true }),
              )}
            >
              <ol
                className={cn(
                  "flex flex-wrap items-center gap-x-1.5 gap-y-1 justify-center",
                  bannerAlign === "left" && "md:justify-start",
                  bannerAlign === "center" && "md:justify-center",
                  bannerAlign === "right" && "md:justify-end",
                )}
              >
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;
                  return (
                    <li key={`${crumb.label}-${index}`} className="inline-flex items-center gap-x-1.5">
                      {index > 0 ? (
                        <span className="text-white/45" aria-hidden>
                          /
                        </span>
                      ) : null}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="transition-colors hover:text-white"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className={isLast ? "text-white" : undefined}>
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : (
            beforeTitle
          )}
          {chip ? (
            <p
              className={cn(
                "inline-flex rounded-full border border-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/95",
                bannerAlign === "left" && "md:self-start",
                bannerAlign === "right" && "md:self-end",
              )}
            >
              {chip}
            </p>
          ) : null}
          <SiteHeading
            level={1}
            title={title}
            accentHint={accent}
            emphasis={emphasis}
            variant="onDark"
            align={bannerAlign}
            alignFromMd
            className={cn(
              "font-black tracking-tight",
              heroBannerHeadingTypeClass,
              bannerAlign === "left" ? "max-w-4xl md:max-w-3xl" : "max-w-4xl",
            )}
          />
          {subHeading ? (
            <p
              className={cn(
                "max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl",
                heroBannerSubheadingClass(bannerAlign, { fromMd: true }),
              )}
            >
              {subHeading}
            </p>
          ) : null}
          {hasMeta ? (
            <div className={heroBannerContactRowClass(bannerAlign, { fromMd: true })}>
              {metaDate ? (
                <HeroMetaItem
                  icon={Calendar}
                  label={metaDate}
                  editable={Boolean(onEditMeta)}
                  onEdit={() => onEditMeta?.("date")}
                />
              ) : null}
              {metaTime ? (
                <HeroMetaItem
                  icon={Clock}
                  label={metaTime}
                  editable={Boolean(onEditMeta)}
                  onEdit={() => onEditMeta?.("time")}
                />
              ) : null}
              {metaLocation ? (
                <HeroMetaItem
                  icon={MapPin}
                  label={metaLocation}
                  editable={Boolean(onEditMeta)}
                  onEdit={() => onEditMeta?.("location")}
                />
              ) : null}
            </div>
          ) : null}
          {!hasMedia && !awaitingFileBlob && emptyMediaSlot ? (
            <div className="mt-6">{emptyMediaSlot}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroMetaItem({
  icon: Icon,
  label,
  editable,
  onEdit,
}: {
  icon: typeof Calendar;
  label: string;
  editable: boolean;
  onEdit: () => void;
}) {
  if (!editable) {
    return (
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      data-hero-meta-edit=""
      title="Click to edit"
      onClick={(event) => {
        event.stopPropagation();
        onEdit();
      }}
      className="group/meta inline-flex items-center gap-2 rounded-full px-1.5 py-0.5 text-left transition-colors hover:bg-white/15"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
      <Pencil className="h-3 w-3 shrink-0 opacity-70 transition-opacity group-hover/meta:opacity-100" />
    </button>
  );
}
