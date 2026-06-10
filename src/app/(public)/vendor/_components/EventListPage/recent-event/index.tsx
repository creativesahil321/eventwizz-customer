"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

import { useContext, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { GalleryComponentProps } from "../event-types";
import { addCacheBusting } from "@/lib/image-utils";
import { SiteHeading } from "@/components/public/site-heading";

// Default fallback images
const defaultEventImages = [
  "/assets/images/events/dummyEvents/concert-event.jpg",
  "/assets/images/events/dummyEvents/theater-event.jpg",
  "/assets/images/events/dummyEvents/music-event.jpg",
  "/assets/images/events/dummyEvents/workshop-event.jpg",
];

export default function RecentEventsGlimpse({
  galleryImages = [],
  galleryTitle: propGalleryTitle,
}: GalleryComponentProps) {
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;

  // Default title with fallback
  const galleryTitle =
    propGalleryTitle ||
    vendorTheme?.event_gallery_title ||
    "Recent Events Glimpse";

  // Use API images if available, otherwise use defaults
  // Handle both formats: array of strings (URLs) or array of objects with {id, url}
  const images = useMemo(() => {
    if (galleryImages.length === 0) {
      return defaultEventImages;
    }

    const extractedImages = galleryImages
      .map((img) => {
        // If img is a string (URL), return it directly
        if (typeof img === "string") {
          return img;
        }
        // If img is an object with url property, return the url
        if (typeof img === "object" && img !== null && "url" in img) {
          return img.url;
        }
        // Fallback: try to convert to string
        return String(img);
      })
      .filter((url) => {
        // Filter out empty strings, null, undefined, or invalid URLs
        return url && typeof url === "string" && url.trim().length > 0;
      });

    // If no valid images found, use defaults
    return extractedImages.length > 0 ? extractedImages : defaultEventImages;
  }, [galleryImages]);

  // Check if we only have one image
  const isSingleImage = images.length === 1;

  // Determine if navigation arrows should be shown on desktop
  // On mobile, arrows always show (when there are multiple images)
  const showNavigationDesktop = useMemo(() => {
    return images.length !== 3; // Hide navigation when exactly 3 events on desktop
  }, [images.length]);

  return (
    <section className="py-20 md:py-28 px-4 bg-transparent">
      <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
          Latest Memories
        </p>
        <SiteHeading
          level={2}
          title={galleryTitle}
          variant="onSurface"
          className="!text-3xl !font-black tracking-tight md:!text-4xl"
        />
      </div>

      {images.length === 0 ? (
        // Professional Coming Soon UI for no gallery images
        <div className="w-full py-16 text-center">
          {/* Main Message */}
          <div className="mb-12 max-w-3xl mx-auto">
            <SiteHeading
              level={3}
              title="Gallery Content Coming Soon"
              variant="onSurface"
              className="!text-2xl md:!text-3xl !font-semibold !text-gray-800 mb-6"
            />
            <p className="text-lg text-gray-600 leading-relaxed">
              We&apos;re curating an amazing collection of event photos and
              memories. Get ready to relive the magic through our exclusive
              gallery of past events and behind-the-scenes moments.
            </p>
          </div>

          {/* Professional Coming Soon Badge */}
          <div className="relative mb-16">
            <div className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="text-xl md:text-2xl font-bold text-white tracking-wider">
                  COMING SOON
                </span>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Professional Gallery Placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="group relative">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl h-80 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  {/* Blurred Image Placeholder */}
                  <div className="h-full bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    {/* Subtle Image-like elements */}
                    <div className="absolute inset-4 bg-white/10 rounded-lg"></div>
                    <div className="absolute bottom-4 left-4 right-4 h-12 bg-white/20 rounded-lg"></div>
                  </div>

                  {/* Subtle Overlay */}
                  <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="mt-12">
            <p className="text-sm text-gray-500 mb-4">
              Want to be notified when our gallery launches? Contact us at{" "}
              <a
                href="mailto:tdx@tobaccodockfood.com"
                className="text-purple-600 hover:text-purple-700 font-medium underline"
              >
                tdx@tobaccodockfood.com
              </a>
            </p>
          </div>
        </div>
      ) : isSingleImage ? (
        // Single image layout - full width
        <div className="w-full px-4 md:px-8">
          <div className="h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden relative rounded-2xl border border-[var(--color-on-surface)]/10 shadow-sm bg-[var(--color-surface)]">
            <img
              src={addCacheBusting(images[0])}
              alt="Recent Event"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.dataset.fallbackApplied === "true") return;
                target.dataset.fallbackApplied = "true";
                target.src = defaultEventImages[0];
              }}
            />
          </div>
        </div>
      ) : (
        // Multiple images carousel layout
        <div className="relative w-full overflow-hidden px-2 md:px-4">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-y-0 left-0 w-1/12 bg-gradient-to-r from-[var(--color-background)] to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-1/12 bg-gradient-to-l from-[var(--color-background)] to-transparent z-10"></div>
          </div>

          <Carousel className="relative">
            <CarouselPrevious
              className={cn(
                "absolute left-8 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full border-0 shadow-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 active:scale-95 transition-[opacity,transform] [&_svg]:size-4 [&_svg]:stroke-[2.5]",
                !showNavigationDesktop && "md:hidden",
              )}
            />

            <CarouselContent className="-ml-4">
              {images.map((src, index) => (
                <CarouselItem
                  key={index}
                  className="pl-4 md:basis-1/2 lg:basis-1/3"
                >
                  <div className="h-64 md:h-72 overflow-hidden relative rounded-xl border border-[var(--color-on-surface)]/10 shadow-sm bg-[var(--color-surface)]">
                    <img
                      src={addCacheBusting(src)}
                      alt={`Recent Event ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.dataset.fallbackApplied === "true") return;
                        target.dataset.fallbackApplied = "true";
                        target.src =
                          defaultEventImages[index % defaultEventImages.length];
                      }}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselNext
              className={cn(
                "absolute right-8 top-1/2 -translate-y-1/2 z-20 size-9 rounded-full border-0 shadow-md bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 active:scale-95 transition-[opacity,transform] [&_svg]:size-4 [&_svg]:stroke-[2.5]",
                !showNavigationDesktop && "md:hidden",
              )}
            />
          </Carousel>
        </div>
      )}
      </div>
    </section>
  );
}
