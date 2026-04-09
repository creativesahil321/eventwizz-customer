import { Image as LucidImage } from "lucide-react";
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

interface HomepageHeroSecProps {
  coverImage?:
    | string
    | File
    | {
        preview?: string;
        path?: string;
      }
    | null;
  heading?: string;
  sub_heading?: string;
  contact_number?: string;
  logo?: File | string | null;
  bannerHeadingAlign?: BannerHeadingAlign | null;
  bannerHeadingValign?: BannerHeadingValign | null;
  bannerHeadingAccent?: string | null;
  headingEmphasis?: HeadingEmphasis | null;
}

export default function HomepageHeroSec({
  coverImage,
  heading,
  sub_heading,
  bannerHeadingAlign,
  bannerHeadingValign,
  bannerHeadingAccent,
  headingEmphasis,
}: HomepageHeroSecProps) {
  let image = "";
  if (typeof coverImage === "string") {
    image = coverImage;
  } else if (coverImage instanceof File) {
    image = URL.createObjectURL(coverImage);
  } else if (coverImage?.preview || coverImage?.path) {
    image = coverImage.preview || coverImage.path || "";
  }

  const bgImage = image ? `url(${image})` : undefined;

  const align = normalizeBannerHeadingAlign(bannerHeadingAlign ?? "center");
  const valign = normalizeBannerHeadingValign(bannerHeadingValign ?? "center");
  const emphasis = normalizeHeadingEmphasis(headingEmphasis ?? undefined);
  const accentHint =
    typeof bannerHeadingAccent === "string" &&
    bannerHeadingAccent.trim().length > 0
      ? bannerHeadingAccent.trim()
      : null;

  const heroTitle = (heading || "Landing Page Banner Heading").trim();
  const heroSub = sub_heading || "Landing Page Banner Sub-Heading";

  return (
    <section
      id="fall-back"
      className={cn(
        "relative mx-auto flex min-h-[min(70vh,560px)] w-full justify-center overflow-hidden bg-[#F3F4F6] bg-cover bg-center bg-no-repeat",
        heroBandVerticalClass(valign),
        align === "left" && valign === "center" && "!items-stretch",
      )}
      style={bgImage ? { backgroundImage: bgImage } : undefined}
    >
      {bgImage ? (
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/85"
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 mx-auto w-full max-w-7xl overflow-visible px-4 pt-28 sm:pt-32 md:pt-36">
        <div className={cn(heroBannerStackClass(align), "overflow-visible")}>
          <SiteHeading
            level={1}
            title={heroTitle}
            accentHint={accentHint}
            emphasis={emphasis}
            variant="onDark"
            align={align}
            className={cn(
              "mb-4 font-bold !text-3xl !leading-[0.98] sm:!text-4xl md:!text-5xl lg:!text-6xl",
              align === "left"
                ? "max-w-[min(100%,28rem)] sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
                : "max-w-4xl",
            )}
          />
          <p
            className={cn(
              "text-base text-white/90 md:text-lg",
              heroBannerSubheadingClass(align),
            )}
          >
            {heroSub}
          </p>
          {!image && <LucidImage size={52} className="mt-6 text-white/60" />}
        </div>
      </div>
    </section>
  );
}
