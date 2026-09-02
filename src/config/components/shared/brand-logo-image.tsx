"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

type BrandLogoImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Shared logo renderer for header, footer, and onboarding chrome.
 * Uses next/image when the host is allowlisted for AVIF/WebP + explicit dimensions.
 */
export function BrandLogoImage({
  src,
  alt,
  className,
  width = 200,
  height = 116,
}: BrandLogoImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 768px) 128px, 200px"
      className={cn("h-auto w-auto object-contain", className)}
      unoptimized={!shouldUseNextImageOptimization(src)}
    />
  );
}
