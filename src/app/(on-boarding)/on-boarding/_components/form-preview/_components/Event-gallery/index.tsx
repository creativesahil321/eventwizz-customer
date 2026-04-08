"use client";

import { addCacheBusting } from "@/lib/image-utils";

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

export default function EventGallery({ gallery, galleryTitle }: PackageSectionProps) {
  const getImageSrc = (image: PackageImage | File | null | string) => {
    if (typeof image === "string") return image;
    if (image instanceof File) return URL.createObjectURL(image);
    if (image?.preview) return image.preview;
    if (image?.path) return image.path;
    return "/assets/images/gallery-image.png";
  };

  // Default sample party images if no gallery is provided
  const defaultImages = [
    "/assets/images/events/DummyEvents/event1.jpg",
    "/assets/images/events/DummyEvents/event2.jpg",
    "/assets/images/events/DummyEvents/event3.jpg",
    "/assets/images/events/DummyEvents/event4.jpg",
    "/assets/images/events/DummyEvents/event1.jpg",
    "/assets/images/events/DummyEvents/event2.jpg",
    "/assets/images/events/DummyEvents/event3.jpg",
    "/assets/images/events/DummyEvents/event4.jpg",
  ];

  const title = galleryTitle || "Captured Moments";
  const images = gallery && gallery.length > 0 ? gallery : defaultImages;

  return (
    <section className="w-full bg-[color:var(--color-background)] py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <span className="mb-1 block text-xs font-bold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
            Event Gallery
          </span>
          <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl">
            {title}
          </h2>
        </div>

        {/* First row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.slice(0, 4).map((img, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden aspect-[4/3] shadow-md"
            >
              <img
                src={addCacheBusting(
                  typeof img === "string" ? img : getImageSrc(img),
                )}
                alt={`Event Gallery Image ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          ))}
        </div>

        {/* Second row */}
        {images.length > 4 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {images.slice(4, 8).map((img, i) => (
              <div
                key={`second-row-${i}`}
                className="rounded-xl overflow-hidden aspect-[4/3] shadow-md"
              >
                <img
                  src={addCacheBusting(
                    typeof img === "string" ? img : getImageSrc(img),
                  )}
                  alt={`Event Gallery Image ${i + 5}`}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
