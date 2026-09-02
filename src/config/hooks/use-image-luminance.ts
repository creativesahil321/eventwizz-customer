"use client";

import { useEffect, useState } from "react";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

export type ImageTone = "light" | "dark";

/**
 * Perceptual luminance threshold (0..255) above which the sampled region counts
 * as "light" and the overlaid text should flip to dark. 150 keeps mid-tone
 * concert/venue photos on white text (they read better with a dark scrim).
 */
const LIGHT_TONE_THRESHOLD = 150;

/** Downsample size — tiny is enough for an average and keeps the read cheap. */
const SAMPLE_SIZE = 32;

/** Only the top band matters: that is where hero headlines sit. */
const TOP_BAND_RATIO = 0.6;

/**
 * Detects whether the region behind hero text is light or dark so a headline can
 * auto-flip to a readable color — mirroring the logo/header auto-contrast, but
 * driven by the *image* instead of a theme color so vendors can't upload a cover
 * that makes the heading unreadable.
 *
 * Samples a tiny **same-origin** `next/image` copy (no CORS taint, cheap) and
 * averages perceptual luminance across the top band. Returns `fallback` until a
 * reading is available and for non-optimizable sources (blob/data/off-allowlist).
 */
export function useImageLuminance(
  src: string | null | undefined,
  fallback: ImageTone = "dark",
): ImageTone {
  const [tone, setTone] = useState<ImageTone>(fallback);

  useEffect(() => {
    if (!src || !shouldUseNextImageOptimization(src)) {
      setTone(fallback);
      return;
    }

    let cancelled = false;
    // Same-origin optimizer URL → canvas stays untainted; w=64 is an allowed size.
    const sampleUrl = `/_next/image?url=${encodeURIComponent(src)}&w=64&q=50`;
    const img = new Image();
    img.decoding = "async";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const bandHeight = Math.max(1, Math.round(SAMPLE_SIZE * TOP_BAND_RATIO));
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, bandHeight);

        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count++;
        }
        if (count === 0 || cancelled) return;

        const average = sum / count;
        setTone(average >= LIGHT_TONE_THRESHOLD ? "light" : "dark");
      } catch {
        // Cross-origin taint / decode failure → keep the safe fallback.
      }
    };

    img.src = sampleUrl;
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return tone;
}
