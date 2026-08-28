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
 * Shared logo renderer for dashboard and onboarding chrome.
 * Logo files remain unchanged; CSS only changes their presentation per surface.
 */
export function BrandLogoImage({
  src,
  alt,
  className,
  width,
  height,
}: BrandLogoImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("object-contain", className)}
    />
  );
}
