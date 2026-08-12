"use client";

import { useEffect, useRef } from "react";

/** CSS var read by the public footer so copyright clears the fixed review bar. */
export const PREVIEW_REVIEW_CHROME_HEIGHT_VAR =
  "--preview-review-chrome-height";

/**
 * Measures the fixed preview review chrome and publishes its height as a
 * document CSS variable. Footer padding uses the same var so clearance matches
 * the bar (no hidden copyright, no oversized empty gap).
 */
export function usePreviewReviewChromeHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const publish = () => {
      document.documentElement.style.setProperty(
        PREVIEW_REVIEW_CHROME_HEIGHT_VAR,
        `${el.offsetHeight}px`,
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty(
        PREVIEW_REVIEW_CHROME_HEIGHT_VAR,
      );
    };
  }, []);

  return ref;
}
