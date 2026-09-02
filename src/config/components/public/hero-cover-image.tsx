"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

type HeroCoverImageProps = {
  src: string;
  alt?: string;
  /** Extra classes on the image (e.g. `scale-105`). */
  className?: string;
  sizes?: string;
  /** When false, skip high-priority fetch (small embeds / preview). */
  preload?: boolean;
};

/**
 * LCP hero cover: branded backdrop + next/image (AVIF/WebP when allowlisted).
 * Renders at full opacity immediately — opacity fades delay LCP paint.
 */
export function HeroCoverImage({
  src,
  alt = "",
  className,
  sizes = "(max-width: 768px) 100vw, 100vw",
  preload: shouldPreload = true,
}: HeroCoverImageProps) {
  const optimized = shouldUseNextImageOptimization(src);

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-background)] to-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--color-background))]"
      />
      <Image
        src={src}
        alt={alt}
        fill
        preload={shouldPreload}
        sizes={sizes}
        fetchPriority={shouldPreload ? "high" : "auto"}
        quality={75}
        className={cn("object-cover object-center", className)}
        unoptimized={!optimized}
      />
    </>
  );
}
