"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { PREVIEW_THEME_ROOT_SELECTOR } from "@/lib/preview-device";
import {
  logoContrastFilters,
  type LogoChromeFilters,
} from "@/lib/logo/chrome-contrast";
import { useLogoMarkTone } from "@/hooks/use-logo-mark-tone";
import { cn } from "@/lib/utils";

export type BrandLogoChrome =
  | "header"
  | "footer"
  | "dark-panel"
  | "light-panel";

type BrandLogoImageProps = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  /**
   * Which chrome the mark sits on. The file is processed for the header;
   * footer / dark panels flip it when that surface would swallow a black wordmark.
   */
  chrome?: BrandLogoChrome;
};

const CSS_FILTER_VAR: Record<BrandLogoChrome, string> = {
  header: "var(--logo-on-header-filter, none)",
  footer: "var(--logo-on-footer-filter, none)",
  "dark-panel": "var(--logo-on-dark-panel-filter, none)",
  "light-panel": "var(--logo-on-light-panel-filter, none)",
};

function readChromeRoot(from: Element | null): HTMLElement {
  if (!from || typeof document === "undefined") {
    return document.documentElement;
  }
  return (
    from.closest<HTMLElement>(PREVIEW_THEME_ROOT_SELECTOR) ??
    document.documentElement
  );
}

function filterForChrome(
  chrome: BrandLogoChrome,
  filters: LogoChromeFilters,
): string {
  if (chrome === "footer") return filters.footer;
  if (chrome === "dark-panel") return filters.darkPanel;
  if (chrome === "light-panel") return filters.lightPanel;
  return filters.header;
}

/**
 * Shared logo renderer for header, footer, and onboarding chrome.
 * Native `img` (same as Site Essentials) so next/image AVIF/WebP cannot
 * wash a black wordmark into a cream/white mark in /preview/site.
 *
 * Contrast: CSS vars cover mixed header/footer instantly (Try theme). When the
 * mark tone can be sampled, dark-on-dark themes (Country Estate, etc.) invert too.
 */
export function BrandLogoImage({
  src,
  alt,
  className,
  width = 200,
  height = 116,
  chrome = "header",
}: BrandLogoImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const tone = useLogoMarkTone(src);
  const [filter, setFilter] = useState(CSS_FILTER_VAR[chrome]);

  useLayoutEffect(() => {
    setFilter(CSS_FILTER_VAR[chrome]);

    const compute = () => {
      const root = readChromeRoot(imgRef.current);
      const cs = getComputedStyle(root);
      const header = cs.getPropertyValue("--color-header").trim() || "#FFFFFF";
      const footer = cs.getPropertyValue("--color-footer").trim() || "#0F172A";
      const next = filterForChrome(
        chrome,
        logoContrastFilters(header, footer, tone),
      );
      setFilter(next);
    };

    compute();

    const root = readChromeRoot(imgRef.current);
    const observer = new MutationObserver(compute);
    observer.observe(root, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [chrome, src, tone]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      // A logo is never the LCP element; keep it from competing with the hero
      // image for bandwidth on slow connections.
      fetchPriority="low"
      style={{ filter }}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
