import { preload } from "react-dom";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

/** Hint the browser to fetch an above-the-fold hero before client hydration. */
export function preloadHeroImage(href: string | null | undefined): void {
  if (!href || href.startsWith("blob:") || href.startsWith("data:")) {
    return;
  }
  // LCP uses /_next/image when optimized — preloading the raw origin URL hurts Slow 4G.
  if (shouldUseNextImageOptimization(href)) {
    return;
  }
  preload(href, { as: "image", fetchPriority: "high" });
}
