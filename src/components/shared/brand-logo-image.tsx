"use client";

import { cn } from "@/lib/utils";

type BrandLogoImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Shared logo renderer for header, footer, and onboarding chrome.
 * Native `img` (same as Site Essentials) so next/image AVIF/WebP cannot
 * wash a black wordmark into a cream/white mark in /preview/site.
 */
export function BrandLogoImage({
  src,
  alt,
  className,
  width = 200,
  height = 116,
}: BrandLogoImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
