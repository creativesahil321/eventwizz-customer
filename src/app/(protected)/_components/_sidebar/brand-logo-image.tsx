"use client";

import { cn } from "@/lib/utils";
import { isDarkSurface } from "@/lib/color-contrast";

type BrandLogoImageProps = {
  src: string;
  alt: string;
  /** Public-site header color — logos are processed to contrast with this. */
  headerBackground?: string | null;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Dashboard chrome is white. A logo tuned for a dark public header would vanish;
 * darken it when that header is a dark surface.
 */
export function BrandLogoImage({
  src,
  alt,
  headerBackground,
  className,
  width,
  height,
}: BrandLogoImageProps) {
  const darkenForLightChrome = Boolean(
    headerBackground && isDarkSurface(headerBackground),
  );

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn(
        "object-contain",
        darkenForLightChrome && "brightness-0",
        className,
      )}
    />
  );
}
