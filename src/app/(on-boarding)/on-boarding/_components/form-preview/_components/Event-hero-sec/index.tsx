import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import {
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

  const align = normalizeBannerHeadingAlign(bannerHeadingAlign ?? "center");
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
  const heroSub = banner_sub_heading || "Event Banner Sub-Heading";

  return (
    <section
      className={cn(
        "relative mx-auto flex h-screen w-full justify-center",
        heroBandVerticalClass(valign),
      )}
      style={{ minHeight: "500px" }}
    >
      {/* Background layer: image or video — mirrors EventDetailClient */}
      <div className="absolute inset-0 overflow-hidden">
        {videoUrl ? (
          <>
            {bgImage && (
              <div
                className="absolute inset-0 bg-cover bg-center"
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
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
          </>
        ) : bgImage ? (
          <img
            src={bgImage}
            alt="Event banner"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : isLoading ? (
          <div className="absolute inset-0 animate-pulse bg-gray-200" />
        ) : null}
        <div className="absolute inset-0 z-10 bg-black/40" aria-hidden />
      </div>

      <div className="relative z-20 container mx-auto w-full overflow-visible px-4 pt-20">
        <div className={cn(heroBannerStackClass(align), "overflow-visible")}>
          <SiteHeading
            level={1}
            title={heroTitle}
            accentHint={accentHint}
            emphasis={emphasis}
            variant="onDark"
            align={align}
            className="mb-4 font-bold !text-4xl md:!text-5xl lg:!text-6xl"
          />
          <h2
            className={cn(
              "text-xl font-medium text-white md:text-2xl",
              heroBannerSubheadingClass(align),
            )}
          >
            {heroSub}
          </h2>

          {!hasMedia && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <ImageIcon size={40} className="text-gray-400" />
              <span className="text-sm text-white/80">Cover Image</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
