"use client";

import { useMemo, useState } from "react";
import { addCacheBusting } from "@/lib/image-utils";
import { GalleryLightbox } from "@/components/public/gallery-lightbox";
import { cn } from "@/lib/utils";

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
};

function resolveImageSrc(image: PackageImage | File | null | string) {
  if (typeof image === "string") return image;
  if (image instanceof File) return URL.createObjectURL(image);
  if (image?.preview) return image.preview;
  if (image?.path) return image.path;
  return "/assets/images/gallery-image.png";
}

export default function EventGallery({
  gallery,
  galleryTitle,
}: PackageSectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const openAt = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const renderTile = (src: string, index: number) => (
    <button
      key={`${src}-${index}`}
      type="button"
      onClick={() => openAt(index)}
      aria-label={`View ${title} image ${index + 1}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl aspect-[4/3] shadow-md",
        "cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={addCacheBusting(src)}
        alt={`${title} image ${index + 1}`}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        decoding="async"
        fetchPriority={index < 2 ? "high" : "low"}
        loading={index < 2 ? "eager" : "lazy"}
      />
      <span
        className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15"
        aria-hidden
      />
    </button>
  );

  return (
    <section className="w-full bg-[color:var(--color-background)] py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-dimmed)]">
            Tap an image to view the full gallery
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {imageSrcs.slice(0, 4).map((src, i) => renderTile(src, i))}
        </div>

        {imageSrcs.length > 4 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {imageSrcs.slice(4, 8).map((src, i) => renderTile(src, i + 4))}
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
