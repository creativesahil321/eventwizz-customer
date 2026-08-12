"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

type HeroCoverImageProps = {
  src: string;
  alt?: string;
  /** Extra classes on the image (e.g. `scale-105`). */
  className?: string;
  sizes?: string;
};

/**
 * LCP hero cover: branded backdrop + next/image (AVIF/WebP when allowlisted) +
 * soft fade-in so the page never looks blank while bytes arrive.
 */
export function HeroCoverImage({
  src,
  alt = "",
  className,
  sizes = "100vw",
}: HeroCoverImageProps) {
  const [loaded, setLoaded] = useState(false);

  /**
   * Guard against the classic next/image gotcha: if the image is cached and
   * finishes before React attaches `onLoad`, the handler never fires and the
   * hero would stay at opacity-0. A ref callback checks `complete` on mount so
   * the fade can never leave the cover invisible.
   */
  const imageRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-background)] to-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--color-background))]"
      />
      <Image
        ref={imageRef}
        src={src}
        alt={alt}
        fill
        preload
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        className={cn(
          "object-cover object-center transition-opacity duration-500 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        unoptimized={!shouldUseNextImageOptimization(src)}
      />
    </>
  );
}
