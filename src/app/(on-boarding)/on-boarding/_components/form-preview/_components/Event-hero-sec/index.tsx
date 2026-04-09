import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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

type ImageType =
  | string
  | File
  | { preview?: string; path?: string }
  | undefined;

interface EventHeroSecProps {
  image?: ImageType | null;
  heading?: string;
  banner_sub_heading?: string;
  video?: string | File | null;
  contact_number?: string;
  logo?: File | string | null;
  /** Try theme / Site Essentials — horizontal hero alignment */
  bannerHeadingAlign?: BannerHeadingAlign | null;
  /** Try theme / Site Essentials — vertical band placement */
  bannerHeadingValign?: BannerHeadingValign | null;
  /** Substring of heading to style as trailing accent (accent_tail / full_primary) */
  bannerHeadingAccent?: string | null;
  headingEmphasis?: HeadingEmphasis | null;
}

export default function EventHeroSec({
  image,
  heading,
  banner_sub_heading,
  video,
  bannerHeadingAlign,
  bannerHeadingValign,
  bannerHeadingAccent,
  headingEmphasis,
}: EventHeroSecProps) {
  const [bgImage, setBgImage] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const align = normalizeBannerHeadingAlign(bannerHeadingAlign ?? "left");
  const valign = normalizeBannerHeadingValign(bannerHeadingValign ?? "center");
  const emphasis = normalizeHeadingEmphasis(headingEmphasis ?? undefined);

  const accentHint =
    typeof bannerHeadingAccent === "string" &&
    bannerHeadingAccent.trim().length > 0
      ? bannerHeadingAccent.trim()
      : null;

  useEffect(() => {
    setIsLoading(true);
    let imageObjectUrl: string | null = null;
    let videoObjectUrl: string | null = null;

    if (typeof image === "string" && image) {
      setBgImage(image);
    } else if (image instanceof File) {
      imageObjectUrl = URL.createObjectURL(image);
      setBgImage(imageObjectUrl);
    } else if (
      image &&
      typeof image === "object" &&
      "preview" in image &&
      (image.preview || image.path)
    ) {
      setBgImage(image.preview || image.path || "");
    } else {
      setBgImage("");
    }

    if (typeof video === "string" && video) {
      setVideoUrl(video);
    } else if (video instanceof File) {
      videoObjectUrl = URL.createObjectURL(video);
      setVideoUrl(videoObjectUrl);
    } else {
      setVideoUrl("");
    }

    setIsLoading(false);

    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    };
  }, [image, video]);

  const hasMedia = Boolean(bgImage || videoUrl);
  const heroTitle = (heading || "Event Banner Heading").trim();
  const heroSub = banner_sub_heading || "";

  return (
    <section
      className={cn(
        "relative mx-auto flex w-full justify-center overflow-hidden",
        /* Hero band — aligned with live event detail page */
        "h-[min(70dvh,760px)] min-h-[400px] max-h-[820px]",
        heroBandVerticalClass(valign),
        align === "left" && valign === "center" && "!items-stretch",
      )}
    >
      {/* Background layer */}
      <div className="absolute inset-0 overflow-hidden">
        {videoUrl ? (
          <>
            {bgImage && (
              <div
                className="absolute inset-0 scale-105 bg-cover bg-center"
                style={{ backgroundImage: `url(${bgImage})` }}
              />
            )}
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={bgImage || undefined}
              className="absolute inset-0 h-full w-full scale-105 object-cover"
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          </>
        ) : bgImage ? (
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
        ) : isLoading ? (
          <div className="absolute inset-0 animate-pulse bg-gray-300" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900" />
        )}
        {/* Same gradient scrim as live page: dark top, slight mid, fades to background */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/35 to-[color:var(--color-background)]"
          aria-hidden
        />
      </div>

      {/* Primary brand atmosphere orbs */}
      <div
        className="pointer-events-none absolute left-1/4 top-16 z-[2] h-72 w-72 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] blur-[100px] md:h-96 md:w-96 md:blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-24 right-1/4 z-[2] h-64 w-64 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-[90px]"
        aria-hidden
      />

      {/* Copy — vertical band from Site Essentials / Try theme */}
      <div
        className={cn(
          "relative z-20 max-w-7xl mx-auto w-full overflow-visible px-4",
          heroBandContentPadClass(valign),
        )}
      >
        <div className={cn(heroBannerStackClass(align), "overflow-visible")}>
          <SiteHeading
            level={1}
            title={heroTitle}
            accentHint={accentHint}
            emphasis={emphasis}
            variant="onDark"
            align={align}
            className={cn(
              "mb-4 font-black !text-3xl !leading-[0.98] tracking-tight sm:!text-4xl md:!text-5xl lg:!text-6xl",
              align === "left"
                ? "max-w-[min(100%,28rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                : "max-w-4xl",
            )}
          />
          {heroSub ? (
            <p
              className={cn(
                "max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg md:text-xl",
                heroBannerSubheadingClass(align),
              )}
            >
              {heroSub}
            </p>
          ) : null}

          {!hasMedia && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <ImageIcon size={40} className="text-white/40" />
              <span className="text-sm text-white/60">
                Add a cover image or video above
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
