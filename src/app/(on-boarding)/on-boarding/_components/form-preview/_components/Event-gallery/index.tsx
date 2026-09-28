"use client";

import { SECTION_EYEBROW_CLASS, SECTION_SUBTITLE_CLASS } from "@/lib/section-type";
import { useEffect, useMemo, useRef, useState } from "react";
import { addCacheBusting } from "@/lib/image-utils";
import { GalleryLightbox } from "@/components/public/gallery-lightbox";
import { SiteHeading } from "@/components/public/site-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS,
  PUBLIC_MOTION_DURATION_SHORT,
  PUBLIC_MOTION_EASE,
  PUBLIC_SECTION_PY_CLASS,
} from "@/lib/public-rhythm";
import {
  usePreviewMobileLayout,
  usePreviewNarrowLayout,
} from "@/hooks/use-preview-narrow-layout";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

type PackageImage = {
  path: string;
  relativePath: string;
  preview: string;
};

type GalleryImageType = {
  path: string;
  relativePath: string;
  preview: string;
};

type PackageSectionProps = {
  gallery?: GalleryImageType[];
  galleryTitle?: string;
  headingEmphasis?: HeadingEmphasis | string | null;
};

function resolveImageSrc(image: PackageImage | File | null | string) {
  if (typeof image === "string") return image;
  if (image instanceof File) return URL.createObjectURL(image);
  if (image?.preview) return image.preview;
  if (image?.path) return image.path;
  return "/assets/images/gallery-image.png";
}

function galleryShellClass(count: number): string {
  if (count <= 1) return "mx-auto w-full max-w-xl";
  if (count === 2) return "mx-auto w-full max-w-3xl";
  if (count === 3) return "mx-auto w-full max-w-5xl";
  return "mx-auto w-full max-w-7xl";
}

/** Same breakpoints as the live event page: 2-up on phones when there are 4 tiles. */
function galleryGridClass(
  count: number,
  preview: { mobile: boolean; narrow: boolean },
): string {
  if (count <= 1) return "grid grid-cols-1 gap-4";

  // Phone frame (390px) — match live `< md` (2 columns for a full row of 4).
  if (preview.mobile) {
    return count >= 4 ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4";
  }

  // Tablet frame (~768px) — match live `md` (2 / 3 / 4 columns).
  if (preview.narrow) {
    if (count === 2) return "grid grid-cols-2 gap-4";
    if (count === 3) return "grid grid-cols-3 gap-4";
    return "grid grid-cols-4 gap-4";
  }

  if (count === 2) {
    return cn(
      "grid grid-cols-1 gap-4 md:grid-cols-2",
      "@max-md/preview:!grid-cols-1",
    );
  }
  if (count === 3) {
    return cn(
      "grid grid-cols-1 gap-4 md:grid-cols-3",
      "@max-md/preview:!grid-cols-1",
    );
  }
  return cn(
    "grid grid-cols-2 gap-4 md:grid-cols-4",
    "@max-md/preview:!grid-cols-2",
  );
}

function GalleryImageTile({
  src,
  index,
  title,
  onOpen,
}: {
  src: string;
  index: number;
  title: string;
  onOpen: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    // Cached images often skip `onLoad`; `h-full` inside aspect-ratio also
    // resolves to 0 height unless the img is absolutely filled.
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View ${title} image ${index + 1}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl aspect-[4/3] shadow-md",
        "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2",
      )}
    >
      <Skeleton
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full rounded-none",
          loaded && "pointer-events-none opacity-0",
          PUBLIC_MOTION_DURATION_SHORT,
          PUBLIC_MOTION_EASE,
          "transition-opacity motion-reduce:transition-none",
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={addCacheBusting(src)}
        alt={`${title} image ${index + 1}`}
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          PUBLIC_CARD_IMAGE_HOVER_ZOOM_CLASS,
          PUBLIC_MOTION_DURATION_SHORT,
          PUBLIC_MOTION_EASE,
          "transition-opacity motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
        )}
        decoding="async"
        fetchPriority={index < 4 ? "high" : "low"}
        loading={index < 4 ? "eager" : "lazy"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-black/0 transition-colors",
          PUBLIC_MOTION_DURATION_SHORT,
          PUBLIC_MOTION_EASE,
          "motion-reduce:transition-none",
          "[@media(hover:hover)_and_(pointer:fine)]:group-hover:bg-black/15",
        )}
        aria-hidden
      />
    </button>
  );
}

export default function EventGallery({
  gallery,
  galleryTitle,
  headingEmphasis,
}: PackageSectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const narrowPreview = usePreviewNarrowLayout();
  const mobilePreview = usePreviewMobileLayout();
  const previewGrid = { mobile: mobilePreview, narrow: narrowPreview };

  const title = galleryTitle || "Captured Moments";

  const imageSrcs = useMemo(() => {
    if (!gallery || gallery.length === 0) return [];
    return gallery.map((img) =>
      typeof img === "string" ? img : resolveImageSrc(img),
    );
  }, [gallery]);

  if (imageSrcs.length === 0) {
    return null;
  }

  const firstRow = imageSrcs.slice(0, Math.min(4, imageSrcs.length));
  const secondRow = imageSrcs.slice(4, 8);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const renderTile = (src: string, index: number) => (
    <GalleryImageTile
      key={`${src}-${index}`}
      src={src}
      index={index}
      title={title}
      onOpen={() => openAt(index)}
    />
  );

  return (
    <section className={cn("w-full bg-[color:var(--color-background)] px-4", PUBLIC_SECTION_PY_CLASS)}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 space-y-3 text-center @max-md/preview:!mb-8 @max-md/preview:!space-y-3">
          <p className={SECTION_EYEBROW_CLASS}>
            Gallery
          </p>
          <SiteHeading
            level={2}
            title={title}
            emphasis={headingEmphasis as HeadingEmphasis}
            variant="onSurface"
            align="center"
          />
          <p className={SECTION_SUBTITLE_CLASS}>
            Tap an image to view the full gallery
          </p>
        </div>

        <div className={galleryShellClass(firstRow.length)}>
          <div
            className={galleryGridClass(firstRow.length, previewGrid)}
          >
            {firstRow.map((src, i) => renderTile(src, i))}
          </div>
        </div>

        {secondRow.length > 0 ? (
          <div className={cn(galleryShellClass(secondRow.length), "mt-4")}>
            <div
              className={galleryGridClass(secondRow.length, previewGrid)}
            >
              {secondRow.map((src, i) => renderTile(src, i + 4))}
            </div>
          </div>
        ) : null}
      </div>

      <GalleryLightbox
        images={imageSrcs}
        open={lightboxOpen}
        activeIndex={activeIndex}
        onOpenChange={setLightboxOpen}
        onActiveIndexChange={setActiveIndex}
        title={title}
      />
    </section>
  );
}
