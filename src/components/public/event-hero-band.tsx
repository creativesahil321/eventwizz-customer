"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Calendar, Clock, MapPin, Pencil } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { HeroCoverImage } from "@/components/public/hero-cover-image";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import type { EventHeroBreadcrumb, EventHeroMeta } from "@/lib/event-hero-meta";
import {
  heroBandMediaOverlayClass,
  heroBannerContactRowClass,
  heroBannerHeadingTypeClass,
  heroBannerStackClass,
  heroHeadingMeasureClass,
  heroBannerSubheadingClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
  type BannerHeadingAlign,
  type BannerHeadingValign,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { PublicHeroBreadcrumbs } from "@/components/public/public-hero-breadcrumbs";
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
  const previewNarrow = usePreviewMobileLayout();
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

  const bgImage = bannerImage instanceof File ? blobImageUrl : syncBgUrl;
  const videoUrl = bannerVideo instanceof File ? blobVideoUrl : syncVideoUrl;

  const bannerAlign = normalizeBannerHeadingAlign(
    bannerHeadingAlign ?? "center",
  );
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
        "relative z-0 mx-auto flex w-full flex-col overflow-hidden",
        "min-h-[480px] md:min-h-[520px]",
        "h-auto md:h-[min(68dvh,720px)]",
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
          <HeroCoverImage src={bgImage} alt={imageAlt} className="scale-105" />
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
          "relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 sm:px-4",
          heroHeadingMeasureClass,
          bannerValign === "top" && "justify-start",
          bannerValign === "bottom" && "justify-end",
          (bannerValign === "center" || !bannerValign) && "justify-center",
          "pt-24 pb-12 sm:pt-28 sm:pb-14 md:pt-32 md:pb-16",
        )}
      >
        <div
          className={cn(
            heroBannerStackClass(bannerAlign, { fromMd: true }),
            "min-h-0 max-h-full",
          )}
        >
          {crumbs.length > 0 ? (
            <PublicHeroBreadcrumbs
              crumbs={crumbs}
              align={bannerAlign}
              centerOnNarrow={previewNarrow}
            />
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
              "font-bold tracking-tight",
              heroBannerHeadingTypeClass,
              bannerAlign === "left" ? "max-w-4xl md:max-w-3xl" : "max-w-4xl",
            )}
          />
          {subHeading ? (
            <p
              className={cn(
                // Body scale, not display: sm → base → lg, compact inside phone preview frames.
                // `!text-sm` cancels sm:/md: sizes inside a narrow preview frame (the
                // preview viewport is wide). Leading stays `relaxed` so the frame
                // matches a real phone exactly — `!leading-snug` made it tighter.
                "line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base md:text-lg @max-md/preview:!text-sm",
                heroBannerSubheadingClass(bannerAlign, { fromMd: true }),
              )}
            >
              {subHeading}
            </p>
          ) : null}
          {hasMeta ? (
            <div
              className={cn(
                heroBannerContactRowClass(bannerAlign, { fromMd: true }),
                "max-sm:hidden",
                previewNarrow && "hidden",
              )}
            >
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
      <span className="inline-flex min-w-0 max-w-full items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span
          className="min-w-0 max-w-[min(70vw,28rem)] whitespace-normal break-words text-left leading-snug [overflow-wrap:anywhere] sm:line-clamp-2"
          title={label}
        >
          {label}
        </span>
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
      className="group/meta inline-flex min-w-0 max-w-full items-center gap-2 rounded-full px-1.5 py-0.5 text-left transition-colors hover:bg-white/15"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 max-w-[min(70vw,28rem)] whitespace-normal break-words text-left leading-snug [overflow-wrap:anywhere] sm:line-clamp-2" title={label}>
        {label}
      </span>
      <Pencil className="h-3 w-3 shrink-0 opacity-70 transition-opacity group-hover/meta:opacity-100" />
    </button>
  );
}
