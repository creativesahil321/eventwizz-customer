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
        align === "left" &&
          valign === "center" &&
          "!items-stretch !justify-end !pb-10 pt-20 md:!pb-16 md:pt-24",
      )}
      style={bgImage ? { backgroundImage: bgImage } : undefined}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative z-10 max-w-7xl mx-auto w-full overflow-visible px-4 pt-20">
        <div className={cn(heroBannerStackClass(align), "overflow-visible")}>
          <SiteHeading
            level={1}
            title={heroTitle}
            accentHint={accentHint}
            emphasis={emphasis}
            variant="onDark"
            align={align}
            className="mb-4 font-bold !text-3xl md:!text-4xl lg:!text-5xl"
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
