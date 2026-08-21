"use client";

import { useEffect, useState } from "react";

export type LogoMarkTone = "light" | "dark" | "unknown";

/**
 * Sample opaque pixels to see if a logo is a light mark (white/silver wordmark)
 * or a dark mark. Used so checkout can pick a header that keeps the logo visible.
 */
export function useLogoMarkTone(src: string): LogoMarkTone {
  const [tone, setTone] = useState<LogoMarkTone>("unknown");

  useEffect(() => {
    setTone("unknown");

    if (!src) {
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    const finish = (next: LogoMarkTone) => {
      if (!cancelled) setTone(next);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 96 / Math.max(img.naturalWidth, img.naturalHeight, 1));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish("unknown");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const { data } = ctx.getImageData(0, 0, width, height);

        let opaque = 0;
        let light = 0;
        let dark = 0;
        let totalLum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3] ?? 0;
          if (alpha < 64) continue;
          opaque += 1;
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          totalLum += lum;
          if (lum >= 200) light += 1;
          if (lum <= 55) dark += 1;
        }

        if (opaque < 40) {
          finish("unknown");
          return;
        }

        const avg = totalLum / opaque;
        const lightRatio = light / opaque;
        const darkRatio = dark / opaque;

        if (avg >= 185 && lightRatio >= 0.55) {
          finish("light");
          return;
        }
        if (avg <= 80 && darkRatio >= 0.45) {
          finish("dark");
          return;
        }

        finish(avg >= 140 ? "light" : "dark");
      } catch {
        finish("unknown");
      }
    };

    img.onerror = () => finish("unknown");
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return tone;
}
