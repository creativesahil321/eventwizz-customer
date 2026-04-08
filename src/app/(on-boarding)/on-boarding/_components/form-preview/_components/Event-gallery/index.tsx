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
};

export default function EventGallery({ gallery }: PackageSectionProps) {
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

  return (
    <section className="w-full bg-[color:var(--color-background)] py-8 px-3">
      <div className="max-100 mx-auto px-6">
        {/* Display gallery images in two rows */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* First row */}
          {(gallery && gallery.length > 0 ? gallery : defaultImages)
            .slice(0, 4)
            .map((img, i) => (
              <div
                key={i}
                className="rounded-md overflow-hidden aspect-[4/3] shadow-md"
              >
                <img
                  src={addCacheBusting(
                    typeof img === "string" ? img : getImageSrc(img)
                  )}
                  alt={`Event Gallery Image ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {/* Second row */}
          {(gallery && gallery.length > 0 ? gallery : defaultImages)
            .slice(4, 8)
            .map((img, i) => (
              <div
                key={`second-row-${i}`}
                className="overflow-hidden aspect-[4/3] shadow-md"
              >
                <img
                  src={addCacheBusting(
                    typeof img === "string" ? img : getImageSrc(img)
                  )}
                  alt={`Event Gallery Image ${i + 5}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
