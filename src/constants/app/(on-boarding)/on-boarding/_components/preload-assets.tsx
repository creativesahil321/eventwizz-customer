"use client";

import { useEffect } from "react";

/**
 * This component preloads critical assets for the onboarding flow
 * to improve perceived performance
 */
export function PreloadAssets() {
  useEffect(() => {
    // Preload critical images
    const preloadImages = [
      "/assets/images/onboarding/placeholder.jpg",
      "/assets/images/onboarding/placeholder.png",
      "/assets/images/onboarding/placeholder.webp",
    ];

    // Create link elements for preloading
    preloadImages.forEach((src) => {
      if (!src) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      document.head.appendChild(link);
    });

    // Preload critical CSS
    const preloadCSS = [
      "/assets/css/app.css",
      // Add paths to critical CSS files here
    ];

    preloadCSS.forEach((href) => {
      if (!href) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "style";
      link.href = href;
      document.head.appendChild(link);
    });

    // Preload critical fonts
    const preloadFonts = [
      "/assets/fonts/TiemposHeadline-Regular.woff2",
      "/assets/fonts/TiemposHeadline-Medium.woff2",
      "/assets/fonts/TiemposHeadline-Bold.woff2",
      "/assets/fonts/TiemposHeadline-Black.woff2",
      "/assets/fonts/TiemposHeadline-Light.woff2",
      "/assets/fonts/TiemposHeadline-Thin.woff2",
      // Add paths to critical fonts here
    ];

    preloadFonts.forEach((href) => {
      if (!href) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "font";
      link.href = href;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    });

    return () => {
      // Clean up preload links when component unmounts
      document.querySelectorAll('link[rel="preload"]').forEach((el) => {
        el.remove();
      });
    };
  }, []);

  return null;
}
