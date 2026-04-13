"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
  heroBandContentPadClass,
  heroBandVerticalClass,
  heroBannerStackClass,
  heroBannerSubheadingClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
  type BannerHeadingAlign,
  type BannerHeadingValign,
} from "@/lib/banner-heading-align";
import { cn } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";

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
  beforeTitle,
  emptyMediaSlot,
  sectionRef,
  className,
  priorityHeroImage = true,
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
        "relative mx-auto flex w-full justify-center overflow-hidden",
        "h-[min(70dvh,760px)] min-h-[400px] max-h-[820px]",
        heroBandVerticalClass(bannerValign),
        bannerAlign === "left" &&
          bannerValign === "center" &&
          "!items-stretch",
        className,
      )}
    >
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
        ) : bgImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external vendor URLs + optional cache busting
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
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/35 to-[color:var(--color-background)]"
          aria-hidden
        />
      </div>

      <div
        className="pointer-events-none absolute left-1/4 top-16 z-[2] h-72 w-72 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] blur-[100px] md:h-96 md:w-96 md:blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-24 right-1/4 z-[2] h-64 w-64 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-[90px]"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-20 max-w-7xl mx-auto w-full overflow-visible px-4",
          heroBandContentPadClass(bannerValign),
        )}
      >
        <div
          className={cn(heroBannerStackClass(bannerAlign), "overflow-visible")}
        >
          {beforeTitle}
          <SiteHeading
            level={1}
            title={title}
            accentHint={accent}
            emphasis={emphasis}
            variant="onDark"
            align={bannerAlign}
            className={cn(
              "mb-4 font-black !text-3xl !leading-[0.98] tracking-tight sm:!text-4xl md:!text-5xl lg:!text-6xl",
              bannerAlign === "left"
                ? "max-w-[min(100%,28rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                : "max-w-4xl",
            )}
          />
          {subHeading ? (
            <p
              className={cn(
                "max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl",
                heroBannerSubheadingClass(bannerAlign),
              )}
            >
              {subHeading}
            </p>
          ) : null}
          {!hasMedia && !awaitingFileBlob && emptyMediaSlot ? (
            <div className="mt-6">{emptyMediaSlot}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
